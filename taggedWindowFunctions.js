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

// windowData[actor] = {
//     win,                              // the MetaWindow, cached so we never
//                                        // have to re-derive it from a
//                                        // possibly-dying actor
//     tag,                              // one of TAGS' keys, or null
//     border,                           // single St.Bin, class computed from tag
//     positionChangedId, sizeChangedId,
//     workspaceChangedId, unmanagedId,
// }
let windowData = new Map();

const BORDER_FADE_MS = 150;

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
        followsWorkspace: true,   // window is dragged along to whatever workspace is active
        exemptFromClose: true,    // skipped by CloseOtherNotMarkedWindows...
        onApply(win) { win.make_above(); },
        onRemove(win) { win.unmake_above(); },
    },
    marked: {
        cssClass: 'marked-border',
        followsWorkspace: false,  // stays put; border just hides/shows as workspaces change
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

export class TaggedWindowFunctions {

    constructor() {
        this._workspaceChangedId = WorkspaceManager.connect('active-workspace-changed', () => {
            const currentWorkspace = WorkspaceManager.get_active_workspace();

            windowData.forEach((info, actor) => {
                const win = info.win;
                if (!win || !info.tag)
                    return;

                if (TAGS[info.tag].followsWorkspace) {
                    if (win.get_workspace() !== currentWorkspace) {
                        win.change_workspace(currentWorkspace);
                        win.get_workspace().activate_with_focus(win, 0);
                        this._add_border(actor);
                    }
                } else if (win.get_workspace() !== currentWorkspace) {
                    this._remove_border(actor);
                } else {
                    this._add_border(actor);
                }
            });
        });

        this._minimizeId = WindowManager.connect('minimize', (wm, actor) => {
            if (windowData.has(actor))
                this._remove_border(actor);
        });

        this._unminimizeId = WindowManager.connect('unminimize', (wm, actor) => {
            if (windowData.has(actor))
                this._add_border(actor);
        });

        this._restackedId = Display.connect('restacked', () => {
            windowData.forEach((info, actor) => {
                if (info.border?.get_parent()) {
                    const wg = global.get_window_group();
                    wg.set_child_above_sibling(info.border, actor);
                }
            });
        });

        this.windowFunctions = new windowFunctions.WindowFunctions();
    }

    destroy() {
        if (this._workspaceChangedId) {
            WorkspaceManager.disconnect(this._workspaceChangedId);
            this._workspaceChangedId = null;
        }
        if (this._minimizeId) {
            WindowManager.disconnect(this._minimizeId);
            this._minimizeId = null;
        }
        if (this._unminimizeId) {
            WindowManager.disconnect(this._unminimizeId);
            this._unminimizeId = null;
        }
        if (this._restackedId) {
            Display.disconnect(this._restackedId);
            this._restackedId = null;
        }

        for (const actor of [...windowData.keys()])
            this._teardown_actor(actor);

        windowData.clear();
    }

    // ========= Utility functions ================ //

    _set_data(actor, key, value) {
        // ASSERTION: 'tag' must only ever change through _set_tag(), because
        // _set_tag is what keeps the border, onApply/onRemove hooks, and
        // windowData teardown in sync with it. If this fires, someone added
        // a call site that mutates the tag directly, and the border can now
        // silently go stale. Fix the call site to go through _set_tag.
        if (key === 'tag' && !this._settingTag)
            journal.warn(`_set_data('tag') called outside _set_tag — border may be stale`);

        const info = windowData.get(actor) || {};
        info[key] = value;
        windowData.set(actor, info);
    }

    _get_data(actor, key) {
        const info = windowData.get(actor);
        return info ? info[key] : undefined;
    }

    _is_marked(actor) {
        return this._get_data(actor, 'tag') === 'marked';
    }

    _is_pinned(actor) {
        return this._get_data(actor, 'tag') === 'pinned';
    }

    // ========= Border functions ================ //

    _get_border(actor) {
        const info = windowData.get(actor);
        if (!info || !info.tag)
            return null;

        const styleClass = `tag-border ${TAGS[info.tag].cssClass}`;

        if (!info.border)
            info.border = new St.Bin({ style_class: styleClass, opacity: 0 });
        else if (info.border.style_class !== styleClass)
            info.border.style_class = styleClass;

        return info.border;
    }

    // FIX: fades the border in whenever it's freshly (re)parented — covers
    // both "window just got a tag" and "window reappeared on this
    // workspace". A border that's just being repositioned/resized on an
    // already-visible window skips the fade and only moves.
    _add_border(actor) {
        const border = this._get_border(actor);
        if (!border)
            return;

        const parent = actor.get_parent();
        if (!parent)
            return;

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
        if (!win)
            return;

        const rect = win.get_frame_rect();
        border.set_position(rect.x, rect.y);
        border.set_size(rect.width, rect.height);
    }

    // FIX: fades the border out, then detaches it from its parent once the
    // fade completes. `animate: false` skips straight to detaching, which
    // _teardown_actor uses since the border is about to be destroyed anyway
    // — animating something you're about to destroy just risks the
    // onComplete callback firing on a dead actor.
    _remove_border(actor, { animate = true } = {}) {
        const info = windowData.get(actor);
        const border = info?.border;

        if (!border?.get_parent())
            return;

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

    _teardown_actor(actor) {
        const info = windowData.get(actor);
        if (!info)
            return;

        this._remove_border(actor, { animate: false });

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

    _initialize_actor(actor) {
        const win = actor.get_meta_window();

        const positionChangedId = win.connect('position-changed', () => this._add_border(actor));
        const sizeChangedId = win.connect('size-changed', () => this._add_border(actor));
        const workspaceChangedId = win.connect('workspace-changed', () => this._add_border(actor));
        const unmanagedId = win.connect('unmanaging', () => this._set_tag(actor, null));

        windowData.set(actor, {
            win,
            tag: null,
            border: null,
            positionChangedId,
            sizeChangedId,
            workspaceChangedId,
            unmanagedId,
        });
    }

    // FIX: the single choke point for changing a window's tag. Setting a
    // new tag always replaces the old one — onRemove runs for whatever tag
    // was there before onApply runs for the new one — so a window can never
    // end up in two tag states at once.
    _set_tag(actor, tagName) {
        const current = this._get_data(actor, 'tag');
        if (current === tagName)
            return;

        if (tagName !== null && !windowData.has(actor))
            this._initialize_actor(actor);

        const win = actor.get_meta_window();

        this._settingTag = true;
        try {
            if (current)
                TAGS[current].onRemove(win);

            this._set_data(actor, 'tag', tagName);

            if (tagName === null) {
                this._teardown_actor(actor);
                windowData.delete(actor);
            } else {
                TAGS[tagName].onApply(win);
                this._add_border(actor);
            }
        } finally {
            this._settingTag = false;
        }
    }

    _toggle_tag(actor, tagName) {
        const current = this._get_data(actor, 'tag');
        this._set_tag(actor, current === tagName ? null : tagName);
    }

    _pin_window(actor) { this._set_tag(actor, 'pinned'); }
    _unpin_window(actor) { if (this._is_pinned(actor)) this._set_tag(actor, null); }
    _mark_window(actor) { this._set_tag(actor, 'marked'); }
    _unmark_window(actor) { if (this._is_marked(actor)) this._set_tag(actor, null); }

    _toggle_pin(actor) { this._toggle_tag(actor, 'pinned'); }
    _toggle_mark(actor) { this._toggle_tag(actor, 'marked'); }

    _clear_tag(tagName) {
        // FIX: snapshot the keys first — _set_tag deletes from windowData
        // mid-loop when it clears the tag.
        for (const actor of [...windowData.keys()]) {
            if (this._get_data(actor, 'tag') === tagName)
                this._set_tag(actor, null);
        }
    }

    _unmark_windows() {
        this._clear_tag('marked');
    }

    _get_windows_by_tag(tagName) {
        return [...windowData.entries()]
            .filter(([, info]) => info.tag === tagName)
            .map(([actor]) => actor.get_meta_window());
    }

    _get_pinned_windows() { return this._get_windows_by_tag('pinned'); }
    _get_marked_windows() { return this._get_windows_by_tag('marked'); }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/TaggedWindows io.github.blueray453.GnomeUtils.TaggedWindows.ActivatePinnedWindows

    ActivatePinnedWindows() {
        windowData.forEach((info, actor) => {
            if (info.tag === 'pinned') {
                const winWorkspace = info.win.get_workspace();
                winWorkspace.activate_with_focus(info.win, 0);
            }
        });
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/TaggedWindows io.github.blueray453.GnomeUtils.TaggedWindows.GetAppDetailsMarkedWindows

    GetAppDetailsMarkedWindows() {
        const results = [];

        for (const actor of [...windowData.keys()]) {
            if (this._is_marked(actor)) {
                const win = actor.get_meta_window();
                const app = WindowTracker.get_window_app(win);
                results.push(this.windowFunctions._get_properties_brief_given_app_id(app.get_id()));
                this._unmark_window(actor);
            }
        }

        return JSON.stringify(results);
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/TaggedWindows io.github.blueray453.GnomeUtils.TaggedWindows.GetPinnedWindows | jq .

    GetPinnedWindows() {
        const results = [];

        for (const actor of [...windowData.keys()]) {
            if (this._is_pinned(actor)) {
                const win = actor.get_meta_window();
                results.push(this.windowFunctions._get_properties_brief_given_meta_window(win));
                this._unpin_window(actor);
            }
        }

        return JSON.stringify(results);
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/TaggedWindows io.github.blueray453.GnomeUtils.TaggedWindows.TogglePinsFocusedWindow

    TogglePinsFocusedWindow() {
        const win = Display.get_focus_window();

        if (win?.get_window_type() === Meta.WindowType.NORMAL) {
            const actor = win.get_compositor_private();
            this._toggle_pin(actor);
        }
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/TaggedWindows io.github.blueray453.GnomeUtils.TaggedWindows.CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass

    CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass() {
        const wins = this.windowFunctions._get_other_normal_windows_current_workspace_of_focused_window_wm_class();

        wins.forEach((w) => {
            if (w.get_wm_class_instance() === 'file_progress')
                return;

            const actor = w.get_compositor_private();
            const tag = this._get_data(actor, 'tag');

            if (tag && TAGS[tag].exemptFromClose)
                return;

            w.delete(0);
        });

        this._unmark_windows();
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/TaggedWindows io.github.blueray453.GnomeUtils.TaggedWindows.GetMarkedWindows | jq .

    GetMarkedWindows() {
        const results = [];

        for (const actor of [...windowData.keys()]) {
            if (this._is_marked(actor)) {
                const win = actor.get_meta_window();
                results.push(this.windowFunctions._get_properties_brief_given_meta_window(win));
                this._unmark_window(actor);
            }
        }

        return JSON.stringify(results);
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/TaggedWindows io.github.blueray453.GnomeUtils.TaggedWindows.ToggleMarksFocusedWindow

    ToggleMarksFocusedWindow() {
        const win = Display.get_focus_window();

        if (win?.get_window_type() === Meta.WindowType.NORMAL) {
            const actor = win.get_compositor_private();
            this._toggle_mark(actor);
        }
    }
}