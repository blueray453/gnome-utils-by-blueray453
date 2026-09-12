import St from 'gi://St';
import Meta from 'gi://Meta';
import Clutter from 'gi://Clutter';

import * as windowFunctions from './windowFunctions.js';

import { createLogger } from './logger.js';

const journal = createLogger(import.meta.url);

const Display = global.get_display();
const WindowManager = global.get_window_manager();
const WindowTracker = global.get_window_tracker();
const WorkspaceManager = global.get_workspace_manager();

const BORDER_FADE_MS = 150;

// windowData[actor] = {
//     win,                              // the MetaWindow, cached so we never
//                                        // have to re-derive it from a
//                                        // possibly-dying actor
//     tag,                              // one of TAGS' keys, or null
//     border,                           // single St.Bin, class computed from tag
//     positionChangedId, sizeChangedId,
//     workspaceChangedId, unmanagedId,
// }
const state = {
    windowData: new Map(),
    workspaceChangedId: 0,
    minimizeId: 0,
    unminimizeId: 0,
    restackedId: 0,
    // True while setTag is running; used by setData to warn on direct
    // 'tag' writes from outside setTag.
    settingTag: false,
};

// -----------------------------------------------------------------------------
// Tags
// -----------------------------------------------------------------------------
// A window has AT MOST ONE tag at a time (or none). Setting a new tag always
// replaces whatever tag was there before, so e.g. marking a pinned window
// un-pins it first — no special-casing needed anywhere else in the file.
//
// To add a new tag: add one entry here and (if it should be reachable over
// dbus) one method + one line in MR_DBUS_IFACE. The border, workspace-follow
// behavior, and close-exemption are all driven off this table.
// -----------------------------------------------------------------------------
const TAGS = {
    pinned: {
        cssClass: 'pinned-border',
        followsWorkspace: true,
        exemptFromClose: true,
        onApply(win) { win.make_above(); },
        onRemove(win) { win.unmake_above(); },
    },
    marked: {
        cssClass: 'marked-border',
        followsWorkspace: false,
        exemptFromClose: true,
        onApply(win) { },
        onRemove(win) { },
    },
};

export const MR_DBUS_IFACE = `
<node>
   <interface name="io.github.blueray453.GnomeUtils.TaggedWindows">
      <method name="ActivatePinnedWindows">
      </method>
      <method name="GetAppDetailsMarkedWindows">
        <arg type="s" direction="out" name="app" />
       </method>
      <method name="GetPinnedWindows">
        <arg type="s" direction="out" name="win" />
      </method>
      <method name="TogglePinsFocusedWindow">
      </method>
      <method name="CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass">
      </method>
      <method name="GetMarkedWindows">
        <arg type="s" direction="out" name="win" />
      </method>
      <method name="ToggleMarksFocusedWindow">
      </method>
   </interface>
</node>`;

// ========= Utility functions ================ //

function setData(actor, key, value) {
    // ASSERTION: 'tag' must only ever change through setTag(), because
    // setTag is what keeps the border, onApply/onRemove hooks, and
    // windowData teardown in sync with it. If this fires, someone added
    // a call site that mutates the tag directly, and the border can now
    // silently go stale. Fix the call site to go through setTag.
    if (key === 'tag' && !state.settingTag)
        journal(`setData('tag') called outside setTag — border may be stale`);

    const info = state.windowData.get(actor) || {};
    info[key] = value;
    state.windowData.set(actor, info);
}

function getData(actor, key) {
    const info = state.windowData.get(actor);
    return info ? info[key] : undefined;
}

function isMarked(actor) { return getData(actor, 'tag') === 'marked'; }
function isPinned(actor) { return getData(actor, 'tag') === 'pinned'; }

// ========= Border functions ================ //

function getBorder(actor) {
    const info = state.windowData.get(actor);
    if (!info || !info.tag) return null;

    const styleClass = `tag-border ${TAGS[info.tag].cssClass}`;

    if (!info.border)
        info.border = new St.Bin({ style_class: styleClass, opacity: 0 });
    else if (info.border.style_class !== styleClass)
        info.border.style_class = styleClass;

    return info.border;
}

// FIX: fades the border in whenever it's freshly (re)parented — covers both
// "window just got a tag" and "window reappeared on this workspace". A border
// that's just being repositioned/resized on an already-visible window skips
// the fade and only moves.
function addBorder(actor) {
    const border = getBorder(actor);
    if (!border) return;

    const parent = actor.get_parent();
    if (!parent) return;

    const isNewlyParented = border.get_parent() !== parent;

    if (isNewlyParented) {
        if (border.get_parent())
            border.get_parent().remove_child(border);

        border.remove_all_transitions();
        border.opacity = 0;
        parent.add_child(border);

        border.ease({
            opacity: 255,
            duration: BORDER_FADE_MS,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });
    }

    const win = actor.get_meta_window();
    if (!win) return;

    const rect = win.get_frame_rect();
    border.set_position(rect.x, rect.y);
    border.set_size(rect.width, rect.height);
}

// FIX: fades the border out, then detaches it from its parent once the fade
// completes. `animate: false` skips straight to detaching, which teardownActor
// uses since the border is about to be destroyed anyway — animating something
// you're about to destroy just risks the onComplete callback firing on a dead
// actor.
function removeBorder(actor, { animate = true } = {}) {
    const info = state.windowData.get(actor);
    const border = info?.border;

    if (!border?.get_parent()) return;

    border.remove_all_transitions();

    if (!animate) {
        border.get_parent().remove_child(border);
        return;
    }

    border.ease({
        opacity: 0,
        duration: BORDER_FADE_MS,
        mode: Clutter.AnimationMode.EASE_IN_QUAD,
        onComplete: () => {
            if (border.get_parent())
                border.get_parent().remove_child(border);
        },
    });
}

function teardownActor(actor) {
    const info = state.windowData.get(actor);
    if (!info) return;

    removeBorder(actor, { animate: false });

    if (info.border) {
        info.border.destroy();
        info.border = null;
    }

    const win = info.win;
    if (win) {
        for (const id of [
            info.positionChangedId,
            info.sizeChangedId,
            info.workspaceChangedId,
            info.unmanagedId,
        ]) {
            if (id)
                win.disconnect(id);
        }
    }
}

// ========= Tag functions ================ //

function initializeActor(actor) {
    const win = actor.get_meta_window();

    actor.set_pivot_point(0.5, 0.5);

    const positionChangedId = win.connect('position-changed', () => addBorder(actor));
    const sizeChangedId = win.connect('size-changed', () => addBorder(actor));
    const workspaceChangedId = win.connect('workspace-changed', () => addBorder(actor));
    const unmanagedId = win.connect('unmanaging', () => setTag(actor, null));

    state.windowData.set(actor, {
        win,
        tag: null,
        border: null,
        positionChangedId,
        sizeChangedId,
        workspaceChangedId,
        unmanagedId,
    });
}

function animateTagApplied(actor) {
    actor.remove_all_transitions();
    actor.set_scale(0.96, 0.96);
    actor.ease({
        scale_x: 1,
        scale_y: 1,
        duration: 220,
        mode: Clutter.AnimationMode.EASE_OUT_BACK, // slight overshoot past 1.0 before settling
    });
}

function animateTagRemoved(actor) {
    actor.remove_all_transitions();
    actor.ease({
        scale_x: 0.97,
        scale_y: 0.97,
        duration: 150,
        mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        onComplete: () => {
            actor.ease({
                scale_x: 1,
                scale_y: 1,
                duration: 150,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        },
    });
}

// FIX: the single choke point for changing a window's tag. Setting a new tag
// always replaces the old one — onRemove runs for whatever tag was there
// before onApply runs for the new one — so a window can never end up in two
// tag states at once.
function setTag(actor, tagName) {
    const current = getData(actor, 'tag');
    if (current === tagName) return;

    if (tagName !== null && !state.windowData.has(actor))
        initializeActor(actor);

    const win = actor.get_meta_window();

    state.settingTag = true;
    try {
        if (current)
            TAGS[current].onRemove(win);

        setData(actor, 'tag', tagName);

        if (tagName === null) {
            animateTagRemoved(actor);
            teardownActor(actor);
            state.windowData.delete(actor);
        } else {
            TAGS[tagName].onApply(win);
            addBorder(actor);
            animateTagApplied(actor);
        }
    } finally {
        state.settingTag = false;
    }
}

function toggleTag(actor, tagName) {
    const current = getData(actor, 'tag');
    setTag(actor, current === tagName ? null : tagName);
}

function clearTag(tagName) {
    // FIX: snapshot the keys first — setTag deletes from windowData mid-loop
    // when it clears the tag.
    for (const actor of [...state.windowData.keys()]) {
        if (getData(actor, 'tag') === tagName)
            setTag(actor, null);
    }
}

function getWindowsByTag(tagName) {
    return [...state.windowData.entries()]
        .filter(([, info]) => info.tag === tagName)
        .map(([actor]) => actor.get_meta_window());
}

// ========= Signals ================ //

function onActiveWorkspaceChanged() {
    const currentWorkspace = WorkspaceManager.get_active_workspace();

    state.windowData.forEach((info, actor) => {
        const win = info.win;
        if (!win || !info.tag) return;

        if (TAGS[info.tag].followsWorkspace) {
            if (win.get_workspace() !== currentWorkspace) {
                win.change_workspace(currentWorkspace);
                win.get_workspace().activate_with_focus(win, 0);
                addBorder(actor);
                animateTagApplied(actor);
            }
        } else if (win.get_workspace() !== currentWorkspace) {
            removeBorder(actor);
        } else {
            addBorder(actor);
        }
    });
}

function onMinimize(wm, actor) {
    if (state.windowData.has(actor))
        removeBorder(actor);
}

function onUnminimize(wm, actor) {
    if (state.windowData.has(actor))
        addBorder(actor);
}

function onRestacked() {
    state.windowData.forEach((info, actor) => {
        if (info.border?.get_parent()) {
            const wg = global.get_window_group();
            wg.set_child_above_sibling(info.border, actor);
        }
    });
}

// ========= DBus methods ================ //

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/TaggedWindows io.github.blueray453.GnomeUtils.TaggedWindows.ActivatePinnedWindows

function ActivatePinnedWindows() {
    state.windowData.forEach((info, actor) => {
        if (info.tag === 'pinned') {
            const winWorkspace = info.win.get_workspace();
            winWorkspace.activate_with_focus(info.win, 0);
        }
    });
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/TaggedWindows io.github.blueray453.GnomeUtils.TaggedWindows.GetAppDetailsMarkedWindows

function GetAppDetailsMarkedWindows() {
    const results = [];

    for (const actor of [...state.windowData.keys()]) {
        if (isMarked(actor)) {
            const win = actor.get_meta_window();
            const app = WindowTracker.get_window_app(win);
            results.push(windowFunctions.getPropertiesBriefGivenAppId(app.get_id()));
            setTag(actor, null);
        }
    }

    return JSON.stringify(results);
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/TaggedWindows io.github.blueray453.GnomeUtils.TaggedWindows.GetPinnedWindows | jq .

function GetPinnedWindows() {
    const results = [];

    for (const actor of [...state.windowData.keys()]) {
        if (isPinned(actor)) {
            const win = actor.get_meta_window();
            results.push(windowFunctions.getPropertiesBriefGivenMetaWindow(win));
            setTag(actor, null);
        }
    }

    return JSON.stringify(results);
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/TaggedWindows io.github.blueray453.GnomeUtils.TaggedWindows.TogglePinsFocusedWindow

function TogglePinsFocusedWindow() {
    const win = Display.get_focus_window();

    if (win?.get_window_type() === Meta.WindowType.NORMAL) {
        const actor = win.get_compositor_private();
        toggleTag(actor, 'pinned');
    }
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/TaggedWindows io.github.blueray453.GnomeUtils.TaggedWindows.CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass

function CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass() {
    const wins = windowFunctions.getOtherNormalWindowsCurrentWorkspaceOfFocusedWindowWmClass();

    wins.forEach((w) => {
        if (w.get_wm_class_instance() === 'file_progress')
            return;

        const actor = w.get_compositor_private();
        const tag = getData(actor, 'tag');

        if (tag && TAGS[tag].exemptFromClose)
            return;

        w.delete(0);
    });

    clearTag('marked');
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/TaggedWindows io.github.blueray453.GnomeUtils.TaggedWindows.GetMarkedWindows | jq .

function GetMarkedWindows() {
    const results = [];

    for (const actor of [...state.windowData.keys()]) {
        if (isMarked(actor)) {
            const win = actor.get_meta_window();
            results.push(windowFunctions.getPropertiesBriefGivenMetaWindow(win));
            setTag(actor, null);
        }
    }

    return JSON.stringify(results);
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/TaggedWindows io.github.blueray453.GnomeUtils.TaggedWindows.ToggleMarksFocusedWindow

function ToggleMarksFocusedWindow() {
    const win = Display.get_focus_window();

    if (win?.get_window_type() === Meta.WindowType.NORMAL) {
        const actor = win.get_compositor_private();
        toggleTag(actor, 'marked');
    }
}

// ========= Exports ================ //

export const dbusObject = {
    ActivatePinnedWindows,
    GetAppDetailsMarkedWindows,
    GetPinnedWindows,
    TogglePinsFocusedWindow,
    CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass,
    GetMarkedWindows,
    ToggleMarksFocusedWindow,
};

export function init() {
    state.windowData = new Map();
    state.settingTag = false;

    state.workspaceChangedId = WorkspaceManager.connect('active-workspace-changed', onActiveWorkspaceChanged);
    state.minimizeId = WindowManager.connect('minimize', onMinimize);
    state.unminimizeId = WindowManager.connect('unminimize', onUnminimize);
    state.restackedId = Display.connect('restacked', onRestacked);
}

export function destroy() {
    if (state.workspaceChangedId) {
        WorkspaceManager.disconnect(state.workspaceChangedId);
        state.workspaceChangedId = 0;
    }
    if (state.minimizeId) {
        WindowManager.disconnect(state.minimizeId);
        state.minimizeId = 0;
    }
    if (state.unminimizeId) {
        WindowManager.disconnect(state.unminimizeId);
        state.unminimizeId = 0;
    }
    if (state.restackedId) {
        Display.disconnect(state.restackedId);
        state.restackedId = 0;
    }

    for (const actor of [...state.windowData.keys()])
        teardownActor(actor);

    state.windowData.clear();
}