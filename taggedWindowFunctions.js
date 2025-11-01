import St from 'gi://St';
import Meta from 'gi://Meta';

import * as windowFunctions from './windowFunctions.js';

const Display = global.get_display();
const WindowManager = global.get_window_manager();
const WindowTracker = global.get_window_tracker();
const WorkspaceManager = global.get_workspace_manager();

let windowData = new Map();

export const MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsTaggedWindows">
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

export class MarkedWindowFunctions {

    constructor() {
        this._workspaceChangedId = WorkspaceManager.connect('active-workspace-changed', () => {

            windowData.forEach((_, actor) => {
                let win = actor.get_meta_window();
                let currentWorkspace = WorkspaceManager.get_active_workspace();

                const marked = this._is_marked(actor);
                const pinned = this._is_pinned(actor);

                if (marked && pinned) {
                    // do something
                    if (win.get_workspace() !== currentWorkspace) {
                        win.change_workspace(currentWorkspace);
                        win.get_workspace().activate_with_focus(win, 0);
                        this._add_border(actor);
                    }
                }
                else if (marked) {
                    if (win.get_workspace() !== currentWorkspace) {
                        this._remove_border(actor);
                    } else {
                        this._add_border(actor);
                    }
                }
                else if (pinned) {
                    if (win.get_workspace() !== currentWorkspace) {
                        win.change_workspace(currentWorkspace);
                        win.get_workspace().activate_with_focus(win, 0);
                        this._add_border(actor);
                    }
                }
            });
        });

        this._minimizeId = WindowManager.connect('minimize', (wm, actor) => {
            if (windowData.has(actor)) {
                this._remove_border(actor);
            }
        });

        this._unminimizeId = WindowManager.connect('unminimize', (wm, actor) => {
            if (windowData.has(actor)) {
                this._add_border(actor);
            }
        });

        this._restackedId = Display.connect('restacked', (display) => {
            windowData.forEach((_, actor) => {
                if (this._get_border(actor)) {
                    // https://gjs.guide/extensions/upgrading/gnome-shell-48.html#meta
                    // let wg = Meta.get_window_group_for_display(display);
                    // let wg = Meta.Compositor.get_window_group();
                    let wg = global.get_window_group();
                    wg.set_child_above_sibling(this._get_border(actor) , actor);
                }
            });
            this._get_border(actor);
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
    }

    // ========= Utility functions ================ //

    _set_data(actor, key, value) {
        let info = windowData.get(actor) || {};
        info[key] = value;
        windowData.set(actor, info);
    }

    _get_data(actor, key) {
        const info = windowData.get(actor);
        return info ? info[key] : undefined;
    }

    _is_marked(actor) {
        return this._get_data(actor, "isMarked") === true;
    }

    _is_pinned(actor) {
        return this._get_data(actor, "isPinned") === true;
    }

    _is_both_marked_pinned(actor) {
        return this._is_marked(actor) && this._is_pinned(actor);
    }

    _is_neither_marked_pinned(actor) {
        return !this._is_marked(actor) && !this._is_pinned(actor);
    }

    // ========= Border functions ================ //

    // Get the correct border instance
    _get_border(actor) {
        const marked = this._is_marked(actor);
        const pinned = this._is_pinned(actor);

        if (marked && pinned) {
            return this._get_data(actor, "border_marked_pinned");
        } else if (marked) {
            return this._get_data(actor, "border_marked");
        } else if (pinned) {
            return this._get_data(actor, "border_pinned");
        } else {
            return null;
        }
    }

    _add_border(actor) {
        let actor_parent = actor.get_parent();
        let border = this._get_border(actor);
        let win = actor.get_meta_window();
        let rect = win.get_frame_rect();

        if (border) {
            actor_parent.add_child(border);
            border.set_position(rect.x, rect.y);
            border.set_size(rect.width, rect.height);
        }
    }

    _remove_border(actor) {
        let border = this._get_border(actor);
        if (border) {
            let actor_parent = actor.get_parent();
            let currentBorder = this._get_border(actor);
            actor_parent.remove_child(currentBorder);
        }
    }

    // ========= Mark/Pin functions ================ //

    _initialize_actor(actor) {
        let win = actor.get_meta_window();

        let positionChangedId = win.connect('position-changed', () => {
            let actor = win.get_compositor_private();
            this._add_border(actor);
        });

        let sizeChangedId = win.connect('size-changed', () => {
            let actor = win.get_compositor_private();
            this._add_border(actor);

        });

        let unmanagedId = win.connect('unmanaging', () => {
            // this._remove_border(actor);
            let actor = win.get_compositor_private();

            if (this._is_pinned(actor)) {
                this._unpin_window(actor);
            }

            if (this._is_marked(actor)) {
                this._unmark_window(actor);
            }
        });

        let workspaceChangedId = win.connect('workspace-changed', () => {
            let actor = win.get_compositor_private();
            this._add_border(actor);
        });

        this._set_data(actor, 'positionChangedId', positionChangedId);
        this._set_data(actor, 'sizeChangedId', sizeChangedId);
        this._set_data(actor, 'unmanagedId', unmanagedId);
        this._set_data(actor, 'workspaceChangedId', workspaceChangedId);

        this._set_data(actor, "border_marked", new St.Bin({
            style_class: 'marked-border'
        }));
        this._set_data(actor, "border_pinned", new St.Bin({
            style_class: 'pinned-border'
        }));
        this._set_data(actor, "border_marked_pinned", new St.Bin({
            style_class: 'both_marked_pinned_border'
        }));
    }

    _toggle_pin(actor) {
        if (this._is_pinned(actor)) {
            this._unpin_window(actor);
        } else {
            this._pin_window(actor);
        }
    }

    _toggle_mark(actor) {
        if (this._is_marked(actor)) {
            this._unmark_window(actor);
        } else {
            this._mark_window(actor);
        }
    }

    _pin_window(actor) {
        if (!windowData.has(actor)) {
            this._initialize_actor(actor);
        }
        this._remove_border(actor);  // remove old
        this._set_data(actor, "isPinned", true);
        this._add_border(actor);
    }

    _get_pinned_windows = function () {
        let pinnedWindows = Array.from(windowData.keys()).map(actor =>
            actor.get_meta_window()
        );

        return pinnedWindows;

    }

    _get_marked_windows = function () {
        let markedWindows = Array.from(windowData.keys()).map(actor =>
            actor.get_meta_window()
        );

        return markedWindows;

    }

    _mark_window(actor) {
        if (!windowData.has(actor)) {
            this._initialize_actor(actor);
        }
        this._remove_border(actor);  // remove old
        this._set_data(actor, "isMarked", true);
        this._add_border(actor);
    }

    _unpin_window(actor) {
        if (!this._is_pinned(actor)) return;

        this._remove_border(actor);  // remove old

        this._set_data(actor, "isPinned", false);

        if (this._is_neither_marked_pinned(actor)) {
            windowData.delete(actor);
        }

        this._add_border(actor);
    }

    _unmark_window(actor) {
        if (!this._is_marked(actor)) return;

        this._remove_border(actor);  // remove old
        this._set_data(actor, "isMarked", false);

        if (this._is_neither_marked_pinned(actor)) {
            windowData.delete(actor);
        }

        this._add_border(actor);
    }

    _unmark_windows() {
        windowData.forEach((_, actor) => {
            if (this._is_marked(actor)) {
                this._unmark_window(actor);
            }
            if (this._is_pinned(actor)) {
                this._add_border(actor);
            }
        });
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsTaggedWindows org.gnome.Shell.Extensions.GnomeUtilsTaggedWindows.ActivatePinnedWindows

    ActivatePinnedWindows() {
        windowData.forEach((_, actor) => {
            if (this._is_pinned(actor)) {
                let win = actor.get_meta_window();
                let win_workspace = win.get_workspace();
                win_workspace.activate_with_focus(win, 0);
            }
        });
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsTaggedWindows org.gnome.Shell.Extensions.GnomeUtilsTaggedWindows.GetAppDetailsMarkedWindows

    GetAppDetailsMarkedWindows() {
        let results = [];

        windowData.forEach((_, actor) => {
            if (this._is_marked(actor)) {
                let win = actor.get_meta_window();
                let app = WindowTracker.get_window_app(win);
                let result = this.windowFunctions._get_properties_brief_given_app_id(app.get_id());
                results.push(result);
                this._unmark_window(actor);
            }
        });

        return JSON.stringify(results);
    }


    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsTaggedWindows org.gnome.Shell.Extensions.GnomeUtilsTaggedWindows.GetPinnedWindows | jq .

    GetPinnedWindows() {
        let results = [];

        windowData.forEach((_, actor) => {
            if (this._is_pinned(actor)) {
                let win = actor.get_meta_window();
                let result = this.windowFunctions._get_properties_brief_given_meta_window(win);
                results.push(result);
                this._unpin_window(actor);
            }
        });
        return JSON.stringify(results);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsTaggedWindows org.gnome.Shell.Extensions.GnomeUtilsTaggedWindows.TogglePinsFocusedWindow

    TogglePinsFocusedWindow() {
        let win = Display.get_focus_window();

        if (win.get_window_type() === Meta.WindowType.NORMAL) {
            let actor = win.get_compositor_private();
            this._toggle_pin(actor);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsTaggedWindows org.gnome.Shell.Extensions.GnomeUtilsTaggedWindows.CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass

    CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass() {
        let wins = this.windowFunctions._get_other_normal_windows_current_workspace_of_focused_window_wm_class();

        wins.forEach((w) => {
            if (w.get_wm_class_instance() === 'file_progress') {
                return; // Skip this window if it's a 'file_progress' instance
            }

            let actor = w.get_compositor_private();

            if (this._is_marked(actor) || this._is_pinned(actor)) {
                return; // Skip this window if it's marked
            }

            w.delete(0);
        });

        this._unmark_windows();
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsTaggedWindows org.gnome.Shell.Extensions.GnomeUtilsTaggedWindows.GetMarkedWindows | jq .

    GetMarkedWindows() {
        let results = [];

        windowData.forEach((_, actor) => {
            if (this._is_marked(actor)) {
                let win = actor.get_meta_window();
                let result = this.windowFunctions._get_properties_brief_given_meta_window(win);
                results.push(result);
                this._unmark_window(actor);
            }
        });

        return JSON.stringify(results);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsTaggedWindows org.gnome.Shell.Extensions.GnomeUtilsTaggedWindows.ToggleMarksFocusedWindow

    ToggleMarksFocusedWindow() {
        let win = Display.get_focus_window();

        if (win.get_window_type() === Meta.WindowType.NORMAL) {
            let actor = win.get_compositor_private();
            this._toggle_mark(actor);
        }
    }
};
