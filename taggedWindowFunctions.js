import St from 'gi://St';
import Meta from 'gi://Meta';

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
//     isMarked, isPinned,
//     border,                           // single St.Bin, class computed from flags
//     positionChangedId, sizeChangedId,
//     workspaceChangedId, unmanagedId,
// }
let windowData = new Map();

// -----------------------------------------------------------------------------
// Border style
// -----------------------------------------------------------------------------
// Adding a new flag means adding one line here, not a new combinatorial
// St.Bin for every possible flag combination.
// -----------------------------------------------------------------------------
const FLAG_CLASSES = [
    ['isMarked', 'marked'],
    ['isPinned', 'pinned'],
];

function borderStyleClass(info) {
    return FLAG_CLASSES
        .filter(([key]) => info[key])
        .map(([, cls]) => `${cls}-border`)
        .join(' ');
}

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
        // FIX: the marked&&pinned branch and the pinned-only branch were
        // byte-identical in the original. Pinned always wins regardless of
        // marked, so there's only one branch to take per window.
        this._workspaceChangedId = WorkspaceManager.connect('active-workspace-changed', () => {
            const currentWorkspace = WorkspaceManager.get_active_workspace();

            windowData.forEach((info, actor) => {
                const win = info.win;
                if (!win)
                    return;

                if (info.isPinned) {
                    if (win.get_workspace() !== currentWorkspace) {
                        win.change_workspace(currentWorkspace);
                        win.get_workspace().activate_with_focus(win, 0);
                        this._add_border(actor);
                    }
                } else if (info.isMarked) {
                    if (win.get_workspace() !== currentWorkspace) {
                        this._remove_border(actor);
                    } else {
                        this._add_border(actor);
                    }
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

    // FIX: original only disconnected the four global Shell signals and
    // left every per-window signal connection, every border actor, and the
    // whole registry behind. Now every tracked window is torn down too.
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
        const info = windowData.get(actor) || {};
        info[key] = value;
        windowData.set(actor, info);
    }

    _get_data(actor, key) {
        const info = windowData.get(actor);
        return info ? info[key] : undefined;
    }

    _is_marked(actor) {
        return this._get_data(actor, 'isMarked') === true;
    }

    _is_pinned(actor) {
        return this._get_data(actor, 'isPinned') === true;
    }

    _is_neither_marked_pinned(actor) {
        return !this._is_marked(actor) && !this._is_pinned(actor);
    }

    // ========= Border functions ================ //
    // FIX: one St.Bin per window instead of three pre-allocated ones
    // (border_marked, border_pinned, border_marked_pinned). The CSS class
    // is computed from whichever flags are active, so a third flag later
    // needs one new entry in FLAG_CLASSES, not a new combinatorial border.

    _get_border(actor) {
        const info = windowData.get(actor);
        if (!info)
            return null;

        if (!info.isMarked && !info.isPinned)
            return null;

        const styleClass = borderStyleClass(info);

        if (!info.border)
            info.border = new St.Bin({ style_class: styleClass });
        else if (info.border.style_class !== styleClass)
            info.border.style_class = styleClass;

        return info.border;
    }

    _add_border(actor) {
        const border = this._get_border(actor);
        if (!border)
            return;

        const parent = actor.get_parent();
        if (!parent)
            return;

        if (border.get_parent() !== parent) {
            if (border.get_parent())
                border.get_parent().remove_child(border);

            parent.add_child(border);
        }

        const win = actor.get_meta_window();
        if (!win)
            return;

        const rect = win.get_frame_rect();
        border.set_position(rect.x, rect.y);
        border.set_size(rect.width, rect.height);
    }

    // FIX: removal reads info.border directly rather than going through
    // _get_border(), which returns null once both flags are already
    // cleared — the original code path this replaces would have lost the
    // reference right when it needed it to remove the border from its parent.
    _remove_border(actor) {
        const info = windowData.get(actor);
        const border = info?.border;

        if (border?.get_parent())
            border.get_parent().remove_child(border);
    }

    // FIX: new — disconnects every per-window signal and destroys the
    // border. Called whenever a window is fully untagged or the extension
    // is disabled. Nothing in the original ever did this.
    _teardown_actor(actor) {
        const info = windowData.get(actor);
        if (!info)
            return;

        this._remove_border(actor);

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

    // ========= Mark/Pin functions ================ //

    // FIX: handlers close over `actor`/`win` directly instead of
    // re-deriving `actor` from `win.get_compositor_private()` on every
    // event — that call can return null once the window starts unmanaging,
    // and there was never a reason to look it up again when it was already
    // in scope.
    //
    // FIX (the leak): this used to run again on every re-mark/re-pin cycle,
    // stacking a fresh set of four signal connections on the same MetaWindow
    // each time, because nothing ever disconnected the previous set before
    // the actor was deleted from the registry. Now _teardown_actor() always
    // runs before an actor leaves the registry (see _unmark_window /
    // _unpin_window below), so re-initializing is safe.
    _initialize_actor(actor) {
        const win = actor.get_meta_window();

        const positionChangedId = win.connect('position-changed', () => this._add_border(actor));
        const sizeChangedId = win.connect('size-changed', () => this._add_border(actor));
        const workspaceChangedId = win.connect('workspace-changed', () => this._add_border(actor));
        const unmanagedId = win.connect('unmanaging', () => {
            if (this._is_pinned(actor))
                this._unpin_window(actor);

            if (this._is_marked(actor))
                this._unmark_window(actor);
        });

        windowData.set(actor, {
            win,
            isMarked: false,
            isPinned: false,
            border: null,
            positionChangedId,
            sizeChangedId,
            workspaceChangedId,
            unmanagedId,
        });
    }

    // ========= Flag functions ================ //
    // FIX: single choke point for isMarked/isPinned mutation. Nothing else
    // touches these two keys directly, so it's structurally impossible to
    // change a flag without the border (or teardown) being refreshed to match.
    _set_flag(actor, key, value) {
        if (value) {
            if (!windowData.has(actor))
                this._initialize_actor(actor);

            this._set_data(actor, key, value);
            this._add_border(actor);
        } else {
            if (!this._get_data(actor, key))
                return;

            this._set_data(actor, key, value);

            if (this._is_neither_marked_pinned(actor)) {
                this._teardown_actor(actor);
                windowData.delete(actor);
            } else {
                this._add_border(actor);
            }
        }
    }

    _pin_window(actor) {
        this._set_flag(actor, 'isPinned', true);
    }

    _unpin_window(actor) {
        this._set_flag(actor, 'isPinned', false);
    }

    _mark_window(actor) {
        this._set_flag(actor, 'isMarked', true);
    }

    _unmark_window(actor) {
        this._set_flag(actor, 'isMarked', false);
    }

    _toggle_pin(actor) {
        if (this._is_pinned(actor))
            this._unpin_window(actor);
        else
            this._pin_window(actor);
    }

    _unmark_windows() {
        // FIX: snapshot the keys first — the original iterated windowData
        // with forEach while _unmark_window deleted entries mid-iteration.
        for (const actor of [...windowData.keys()]) {
            if (this._is_marked(actor))
                this._unmark_window(actor);
        }
    }

    _toggle_mark(actor) {
        if (this._is_marked(actor))
            this._unmark_window(actor);
        else
            this._mark_window(actor);
    }

    // FIX: these two used to return the exact same unfiltered list of every
    // tracked actor, regardless of which flag was asked for.
    _get_pinned_windows() {
        return [...windowData.entries()]
            .filter(([, info]) => info.isPinned)
            .map(([actor]) => actor.get_meta_window());
    }

    _get_marked_windows() {
        return [...windowData.entries()]
            .filter(([, info]) => info.isMarked)
            .map(([actor]) => actor.get_meta_window());
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/TaggedWindows io.github.blueray453.GnomeUtils.TaggedWindows.ActivatePinnedWindows

    ActivatePinnedWindows() {
        windowData.forEach((info, actor) => {
            if (info.isPinned) {
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
        // FIX: get_focus_window() can return null; the original crashed
        // calling get_window_type() on it.
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

            if (this._is_marked(actor) || this._is_pinned(actor))
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