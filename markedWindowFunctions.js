const { Meta, St } = imports.gi;

const Display = global.get_display();
const WorkspaceManager = global.workspace_manager;
const WindowManager = global.window_manager;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const { WindowFunctions } = Me.imports.windowFunctions;

// Memory to store data
const windowData = new Map();

var MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsMarkedWindows">
      <method name="ActivatePinnedWindows">
        <arg type="s" direction="out" name="win" />
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

var MarkedWindowFunctions = class MarkedWindowFunctions {

    constructor() {
        this.windowFunctionsInstance = new WindowFunctions();
        this._workspaceChangedId = WorkspaceManager.connect('active-workspace-changed', () => {
            let currentWorkspace = WorkspaceManager.get_active_workspace();

            windowData.forEach((_, actor) => {
                if (this._has_window_data_marked(actor)) {
                    let win = actor.get_meta_window();
                    if (win.get_workspace() !== currentWorkspace) {
                        this._remove_border_actor_marked(actor);
                    } else {
                        this._add_border_actor_marked(actor);
                    }
                }
            });

            windowData.forEach((_, actor) => {
                if (this._has_window_data_pinned(actor)) {
                    let win = actor.get_meta_window();
                    if (win.get_workspace() !== currentWorkspace) {
                        win.change_workspace(currentWorkspace);
                        win.get_workspace().activate_with_focus(win, 0);
                        this._add_border_actor_pinned(actor);
                    }
                }
            });
        });

        this._minimizeId = WindowManager.connect('minimize', (wm, actor) => {
            if (this._has_window_data_marked(actor)) {
                this._remove_border_actor_marked(actor);
            }
            if (this._has_window_data_pinned(actor)) {
                this._remove_border_actor_pinned(actor);
            }
        });

        this._unminimizeId = WindowManager.connect('unminimize', (wm, actor) => {
            if (this._has_window_data_marked(actor)) {
                this._add_border_actor_marked(actor);
            }
            if (this._has_window_data_pinned(actor)) {
                this._add_border_actor_pinned(actor);
            }
        });

        this._restackedId = Display.connect('restacked', (display) => {

            windowData.forEach((_, actor) => {
                if (this._has_window_data_marked(actor)) {
                    if (this._get_border_for_actor_marked(actor)) {
                        let wg = Meta.get_window_group_for_display(display);
                        wg.set_child_above_sibling(this._get_border_for_actor_marked(actor), actor);
                    }
                }
            });

            // this._get_border_for_actor_marked(actor);

            windowData.forEach((_, actor) => {
                if (this._has_window_data_pinned(actor)) {
                    if (this._get_border_for_actor_pinned(actor)) {
                        let wg = Meta.get_window_group_for_display(display);
                        wg.set_child_above_sibling(this._get_border_for_actor_pinned(actor), actor);
                    }
                }
            });
            // this._get_border_for_actor_pinned(actor);
        });
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

    _has_window_data(actor, type) {
        const info = windowData.get(actor);

        if (info && info[type]) {
            return true;
        } else {
            return false;
        }
    }

    _has_window_data_marked(actor) {
        return _has_window_data(actor, "marked");
    }

    _has_window_data_pinned(actor) {
        return _has_window_data(actor, "pinned");
    }

    _set_window_data(actor, type, key, value) {
        let info;

        if (windowData.has(actor)) {
            info = windowData.get(actor);
        } else {
            info = {};
        }

        if (!this._has_window_data(actor, type)) {
            info[type] = {}; // just create an empty type like "marked" or "pinned"
        }

        info[type][key] = value;
        windowData.set(actor, info);
    }

    _set_window_data_marked(actor, key, value) {
        this._set_window_data(actor, "marked", key, value);
    }

    _set_window_data_pinned(actor, key, value) {
        this._set_window_data(actor, "pinned", key, value);
    }

    _get_window_data_marked(actor, key) {
        const info = windowData.get(actor);

        if (info && info.marked && key in info.marked) {
            return info.marked[key];
        }

        return null;
    }

    _get_window_data_pinned(actor, key) {
        const info = windowData.get(actor);

        if (info && info.pinned && key in info.pinned) {
            return info.pinned[key];
        }

        return null;
    }

    _get_border_for_actor_marked(actor) {
        const info = windowData.get(actor);

        if (info && info.marked && "border_instance" in info.marked) {
            return info.marked.border_instance;
        }

        return null;
    }

    _get_border_for_actor_pinned(actor) {
        const info = windowData.get(actor);

        if (info && info.pinned && "border_instance" in info.pinned) {
            return info.pinned.border_instance;
        }

        return null;
    }


    // Window Borders

    _add_border_to_actor(actor, type, style_class) {
        let actor_parent = actor.get_parent();
        let win = actor.get_meta_window();
        let rect = win.get_frame_rect();

        let border;

        // Check if the actor has the specified type (marked or pinned) and create the border if not
        if (this._has_window_data(actor, type)) {
            border = this._get_border_for_actor_marked(actor);  // Use the correct getter for the type
        } else {
            this._set_window_data(actor, type, "border_instance", new St.Bin({
                style_class: style_class
            }));
        }

        /*
        Every border has it's own new St.Bin();

        This is why we are using border_instance key to store St.Bin Object for each actor.
        */

        // Get the border for the type (after setting it if it was missing)
        border = this._get_border_for_actor_marked(actor);

        // Add the border and set its position/size
        actor_parent.add_child(border);
        border.set_position(rect.x, rect.y);
        border.set_size(rect.width, rect.height);
    }

    _add_border_actor_marked(actor) {
        this._add_border_to_actor(actor, "marked", 'marked-border');
    }

    _add_border_actor_pinned(actor) {
        this._add_border_to_actor(actor, "pinned", 'pinned-border');
    }

    _remove_border_actor(actor, type) {
        const border = this._get_border_for_actor_marked(actor);
        if (border) {
            let actor_parent = actor.get_parent();
            actor_parent.remove_child(border);
        }
    }

    _remove_border_actor_marked(actor) {
        this._remove_border_actor(actor, "marked");
    }

    _remove_border_actor_pinned(actor) {
        this._remove_border_actor(actor, "pinned");
    }


    // Windows Mark

    /*
    By marking window, i mean this._has_window_data_marked(actor). it normally has signals attached to it.
    We generally only remove the signals when we unmark.

    However, Whether it has border or not is irrelevant.
    A marked window may not have border attached to it.

    The only one way to unmark a marked window is _unmark_window
    */

    /* Please note that _unmark_window and _remove_border_actor_marked is not same.

    This is important because when minimizing window, we _remove_border_actor_marked
    but we have to get the border back when we unminimize.

    This is also true for _update_borders. We have to add border to the window again.

    This is also true for _add_border_actor_marked. We have to add border to the window again.
    */

    _mark_window(actor) {
        this._add_border_actor_marked(actor);
        let win = actor.get_meta_window();

        let positionChangedId = win.connect('position-changed', () => {
            let actor = win.get_compositor_private();
            this._add_border_actor_marked(actor);
        });

        let sizeChangedId = win.connect('size-changed', () => {
            let actor = win.get_compositor_private();
            this._add_border_actor_marked(actor);

        });

        let unmanagedId = win.connect('unmanaging', () => {
            this._unmark_window(actor);
        });

        let workspaceChangedId = win.connect('workspace-changed', () => {
            this._add_border_actor_marked(actor);
        });

        this._set_window_data_marked(actor, 'positionChangedId', positionChangedId);
        this._set_window_data_marked(actor, 'sizeChangedId', sizeChangedId);
        this._set_window_data_marked(actor, 'unmanagedId', unmanagedId);
        this._set_window_data_marked(actor, 'workspaceChangedId', workspaceChangedId);
    }

    _pin_window(actor) {
        this._add_border_actor_pinned(actor);
        let win = actor.get_meta_window();

        let positionChangedId = win.connect('position-changed', () => {
            let actor = win.get_compositor_private();
            this._add_border_actor_pinned(actor);
        });

        let sizeChangedId = win.connect('size-changed', () => {
            let actor = win.get_compositor_private();
            this._add_border_actor_pinned(actor);

        });

        let unmanagedId = win.connect('unmanaging', () => {
            this._unmark_window(actor);
        });

        let workspaceChangedId = win.connect('workspace-changed', () => {
            this._add_border_actor_pinned(actor);
        });

        this._set_window_data_pinned(actor, 'positionChangedId', positionChangedId);
        this._set_window_data_pinned(actor, 'sizeChangedId', sizeChangedId);
        this._set_window_data_pinned(actor, 'unmanagedId', unmanagedId);
        this._set_window_data_pinned(actor, 'workspaceChangedId', workspaceChangedId);
    }

    _unmark_window(actor) {
        this._remove_border_actor_marked(actor);
        let win = actor.get_meta_window();
        const info = windowData.get(actor);

        win.disconnect(this._get_window_data_marked(actor, 'positionChangedId'));
        win.disconnect(this._get_window_data_marked(actor, 'sizeChangedId'));
        win.disconnect(this._get_window_data_marked(actor, 'unmanagedId'));
        win.disconnect(this._get_window_data_marked(actor, 'workspaceChangedId'));

        if (info) {
            // Remove the 'marked' property if it exists
            if (info.marked) {
                delete info.marked;
            }

            // If there is no 'marked' or 'pinned' property, remove the actor from windowData
            if (!info.marked && !info.pinned) {
                windowData.delete(actor);
            } else {
                // If either 'marked' or 'pinned' exists, update the actor's info in windowData
                windowData.set(actor, info);
            }
        }
    }

    _unpin_window(actor) {
        this._remove_border_actor_pinned(actor);
        let win = actor.get_meta_window();
        const info = windowData.get(actor);

        win.disconnect(this._get_window_data_pinned(actor, 'positionChangedId'));
        win.disconnect(this._get_window_data_pinned(actor, 'sizeChangedId'));
        win.disconnect(this._get_window_data_pinned(actor, 'unmanagedId'));
        win.disconnect(this._get_window_data_pinned(actor, 'workspaceChangedId'));

        if (info) {
            // Remove the 'pinned' property if it exists
            if (info.pinned) {
                delete info.pinned;
            }

            // If there is no 'pinned' or 'pinned' property, remove the actor from windowData
            if (!info.pinned && !info.pinned) {
                windowData.delete(actor);
            } else {
                // If either 'pinned' or 'pinned' exists, update the actor's info in windowData
                windowData.set(actor, info);
            }
        }
    }

    _unmark_windows() {
        windowData.forEach((_, actor) => {
            if (this._has_window_data_marked(actor)) {
                this._unmark_window(actor);
            }
        });
    }

    _unpin_windows() {
        windowData.forEach((_, actor) => {
            if (this._has_window_data_pinned(actor)) {
                this._unmark_window(actor);
            }
        });
    }

    _toggle_mark(actor) {
        if (this._has_window_data_marked(actor)) {
            this._unmark_window(actor);
        } else {
            this._mark_window(actor);
        }
    }

    _toggle_pin(actor) {
        if (this._has_window_data_pinned(actor)) {
            this._unpin_window(actor);
        } else {
            this._pin_window(actor);
        }
    }


    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsMarkedWindows org.gnome.Shell.Extensions.GnomeUtilsMarkedWindows.ActivatePinnedWindows

    ActivatePinnedWindows() {
        windowData.forEach((_, actor) => {
            if (this._has_window_data_pinned(actor)) {
                let win = actor.get_meta_window();
                let win_workspace = win.get_workspace();
                win_workspace.activate_with_focus(win, 0);
            }
        });
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsMarkedWindows org.gnome.Shell.Extensions.GnomeUtilsMarkedWindows.GetPinnedWindows

    GetPinnedWindows() {
        const pinnedWindows = [];

        windowData.forEach((_, actor) => {
            if (this._has_window_data_pinned(actor)) {
                pinnedWindows.push(actor.get_meta_window().get_id());
            }
        });

        return JSON.stringify(pinnedWindows);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsMarkedWindows org.gnome.Shell.Extensions.GnomeUtilsMarkedWindows.TogglePinsFocusedWindow

    TogglePinsFocusedWindow() {
        let win = Display.get_focus_window();
        let actor = win.get_compositor_private();
        this._toggle_pin(actor);

        windowData.forEach((data, actor) => {
            if (this._has_window_data_pinned(actor)) {
                const win = actor.get_meta_window();          // human‑readable window
                const windowId = win.get_id();

                log(`Pinned Window ID: ${windowId}`);
                log(`Window Border (Pinned): ${this._get_border_for_actor_pinned(actor)}`);

            }
        });
    }
    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsMarkedWindows org.gnome.Shell.Extensions.GnomeUtilsMarkedWindows.CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass

    CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass() {
        let wins = this.windowFunctionsInstance._get_other_normal_windows_current_workspace_of_focused_window_wm_class();

        wins.forEach((w) => {
            if (w.get_wm_class_instance() === 'file_progress') {
                return; // Skip this window if it's a 'file_progress' instance
            }

            let actor = w.get_compositor_private();
            if (this._has_window_data_marked(actor)) {
                return; // Skip this window if it's marked
            }
            w.delete(0);
        });

        this._unmark_windows();
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsMarkedWindows org.gnome.Shell.Extensions.GnomeUtilsMarkedWindows.GetMarkedWindows

    GetMarkedWindows() {
        const markedWindows = [];

        windowData.forEach((_, actor) => {
            if (this._has_window_data_marked(actor)) {
                markedWindows.push(actor.get_meta_window().get_id());
            }
        });

        return JSON.stringify(markedWindows);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsMarkedWindows org.gnome.Shell.Extensions.GnomeUtilsMarkedWindows.ToggleMarksFocusedWindow

    ToggleMarksFocusedWindow() {
        let win = Display.get_focus_window();
        let actor = win.get_compositor_private();
        this._toggle_mark(actor);

        windowData.forEach((data, actor) => {
            if (this._has_window_data_marked(actor)) {
                const win = actor.get_meta_window();          // human‑readable window
                const windowId = win.get_id();

                log(`Marked Window ID: ${windowId}`);
                log(`Window Border (Marked): ${this._get_border_for_actor_marked(actor)}`);

            }
        });
    }
};
