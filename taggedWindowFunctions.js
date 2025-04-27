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
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsTaggedWindows">
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

var TaggedWindowFunctions = class TaggedWindowFunctions {

    constructor() {
        this.windowFunctionsInstance = new WindowFunctions();
        this._workspaceChangedId = WorkspaceManager.connect('active-workspace-changed', () => {
            let current_workspace = WorkspaceManager.get_active_workspace();

            windowData.forEach((_, actor) => {
                let win = actor.get_meta_window();
                let win_workspace = win.get_workspace();

                if (this._has_data_marked(actor)) {
                    if (win_workspace !== current_workspace) {
                        this._remove_border_marked(actor);
                    } else {
                        this._add_border_marked(actor);
                    }
                }

                if (this._has_data_pinned(actor)) {
                    if (win_workspace !== current_workspace) {
                        win.change_workspace(current_workspace);
                        win.get_workspace().activate_with_focus(win, 0);
                    }
                    this._add_border_pinned(actor);
                }
            });

        });

        this._minimizeId = WindowManager.connect('minimize', (wm, actor) => {
            if (this._has_data_marked(actor)) {
                this._remove_border_marked(actor);
            }
            if (this._has_data_pinned(actor)) {
                this._remove_border_pinned(actor);
            }
        });

        this._unminimizeId = WindowManager.connect('unminimize', (wm, actor) => {
            if (this._has_data_marked(actor)) {
                this._add_border_marked(actor);
            }
            if (this._has_data_pinned(actor)) {
                this._add_border_pinned(actor);
            }
        });

        this._restackedId = Display.connect('restacked', (display) => {
            let wg = Meta.get_window_group_for_display(display);
            // let wg = Meta.Compositor.get_window_group();
            // let wg = Meta.Compositor.get_top_window_group();

            windowData.forEach((_, actor) => {
                if (this._has_data_marked(actor)) {
                    let border = this._get_border_marked(actor);
                    wg.set_child_above_sibling(border, actor);
                }

                if (this._has_data_pinned(actor)) {
                    let border = this._get_border_pinned(actor);
                    wg.set_child_above_sibling(border, actor);
                }
            });
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

    _has_data(actor, type) {
        const info = windowData.get(actor);

        if (info && info[type]) {
            return true;
        } else {
            return false;
        }
    }

    _has_data_marked(actor) {
        return this._has_data(actor, "marked");
    }

    _has_data_pinned(actor) {
        return this._has_data(actor, "pinned");
    }

    _set_data(actor, type, key, value) {
        let info;

        if (windowData.has(actor)) {
            info = windowData.get(actor);
        } else {
            info = {};
        }

        if (!this._has_data(actor, type)) {
            info[type] = {}; // just create an empty type like "marked" or "pinned"
        }

        info[type][key] = value;
        windowData.set(actor, info);
    }

    _set_data_marked(actor, key, value) {
        this._set_data(actor, "marked", key, value);
    }

    _set_data_pinned(actor, key, value) {
        this._set_data(actor, "pinned", key, value);
    }

    _get_data_marked(actor, key) {
        const info = windowData.get(actor);

        if (info && info.marked && key in info.marked) {
            return info.marked[key];
        }

        return null;
    }

    _get_data_pinned(actor, key) {
        const info = windowData.get(actor);

        if (info && info.pinned && key in info.pinned) {
            return info.pinned[key];
        }

        return null;
    }

    _get_border_marked(actor) {
        const info = windowData.get(actor);

        if (info && info.marked && "border_instance" in info.marked) {
            return info.marked.border_instance;
        }

        return null;
    }

    _get_border_pinned(actor) {
        const info = windowData.get(actor);

        if (info && info.pinned && "border_instance" in info.pinned) {
            return info.pinned.border_instance;
        }

        return null;
    }


    // Window Borders

    _add_border_marked(actor) {
        let actor_parent = actor.get_parent();
        let win = actor.get_meta_window();
        let rect = win.get_frame_rect();

        let border;

        if (this._has_data_marked(actor)) {
            border = this._get_border_marked(actor);
        } else {
            this._set_data_marked(actor, "border_instance", new St.Bin({
                style_class: 'marked-border'
            }));
        }

        border = this._get_border_marked(actor);

        actor_parent.add_child(border);

        border.set_position(rect.x, rect.y);
        border.set_size(rect.width, rect.height);
    }


    _add_border_pinned(actor) {
        let actor_parent = actor.get_parent();
        let win = actor.get_meta_window();
        let rect = win.get_frame_rect();

        let border;

        if (this._has_data_pinned(actor)) {
            border = this._get_border_pinned(actor);
        } else {
            this._set_data_pinned(actor, "border_instance", new St.Bin({
                style_class: 'pinned-border'
            }));
        }

        border = this._get_border_pinned(actor);

        actor_parent.add_child(border);

        border.set_position(rect.x, rect.y);
        border.set_size(rect.width, rect.height);
    }


    _remove_border_marked(actor) {
        if (this._has_data_marked(actor)) {
            let actor_parent = actor.get_parent();

            actor_parent.remove_child(this._get_border_marked(actor));
        }
    }

    _remove_border_pinned(actor) {
        if (this._has_data_pinned(actor)) {
            let actor_parent = actor.get_parent();

            actor_parent.remove_child(this._get_border_pinned(actor));
        }
    }

    // Windows Mark

    /*
    By marking window, i mean this._has_data_marked(actor). it normally has signals attached to it.
    We generally only remove the signals when we unmark.

    However, Whether it has border or not is irrelevant.
    A marked window may not have border attached to it.

    The only one way to unmark a marked window is _unmark_window
    */

    /* Please note that _unmark_window and _remove_border_marked is not same.

    This is important because when minimizing window, we _remove_border_marked
    but we have to get the border back when we unminimize.

    This is also true for _update_borders. We have to add border to the window again.

    This is also true for _add_border_marked. We have to add border to the window again.
    */

    _tag_window(actor, type) {
        // Add the corresponding border
        if (type === "marked") {
            this._add_border_marked(actor);
        } else if (type === "pinned") {
            this._add_border_pinned(actor);
        }

        let win = actor.get_meta_window();

        // Connect to the window events and update borders accordingly
        let positionChangedId = win.connect('position-changed', () => {
            let actor = win.get_compositor_private();
            if (type === "marked") {
                this._add_border_marked(actor);
            } else if (type === "pinned") {
                this._add_border_pinned(actor);
            }
        });

        let sizeChangedId = win.connect('size-changed', () => {
            let actor = win.get_compositor_private();
            if (type === "marked") {
                this._add_border_marked(actor);
            } else if (type === "pinned") {
                this._add_border_pinned(actor);
            }
        });

        let unmanagedId = win.connect('unmanaging', () => {
            this._unmark_window(actor);
        });

        let workspaceChangedId = win.connect('workspace-changed', () => {
            if (type === "marked") {
                this._add_border_marked(actor);
            } else if (type === "pinned") {
                this._add_border_pinned(actor);
            }
        });

        // Store the event IDs in window data
        if (type === "marked") {
            this._set_data_marked(actor, 'positionChangedId', positionChangedId);
            this._set_data_marked(actor, 'sizeChangedId', sizeChangedId);
            this._set_data_marked(actor, 'unmanagedId', unmanagedId);
            this._set_data_marked(actor, 'workspaceChangedId', workspaceChangedId);
        } else if (type === "pinned") {
            this._set_data_pinned(actor, 'positionChangedId', positionChangedId);
            this._set_data_pinned(actor, 'sizeChangedId', sizeChangedId);
            this._set_data_pinned(actor, 'unmanagedId', unmanagedId);
            this._set_data_pinned(actor, 'workspaceChangedId', workspaceChangedId);
        }
    }

    _mark_window(actor) {
        this._tag_window(actor, "marked");
    }

    _pin_window(actor) {
        this._tag_window(actor, "pinned");
    }

    _untag_window(actor, type) {
        if (type === "marked") {
            this._remove_border_marked(actor);
        } else if (type === "pinned") {
            this._remove_border_pinned(actor);
        }

        let win = actor.get_meta_window();
        const info = windowData.get(actor);

        const getWindowData = type === "marked" ? this._get_data_marked.bind(this) : this._get_data_pinned.bind(this);

        win.disconnect(getWindowData(actor, 'positionChangedId'));
        win.disconnect(getWindowData(actor, 'sizeChangedId'));
        win.disconnect(getWindowData(actor, 'unmanagedId'));
        win.disconnect(getWindowData(actor, 'workspaceChangedId'));

        if (info) {
            if (info[type]) {
                delete info[type];
            }

            if (!info.marked && !info.pinned) {
                windowData.delete(actor);
            } else {
                windowData.set(actor, info);
            }
        }
    }

    _unmark_window(actor) {
        this._untag_window(actor, "marked");
    }

    _unpin_window(actor) {
        this._untag_window(actor, "pinned");
    }

    _unmark_windows() {
        windowData.forEach((_, actor) => {
            if (this._has_data_marked(actor)) {
                this._unmark_window(actor);
            }
        });
    }

    _unpin_windows() {
        windowData.forEach((_, actor) => {
            if (this._has_data_pinned(actor)) {
                this._unmark_window(actor);
            }
        });
    }

    _toggle_mark(actor) {
        if (this._has_data_marked(actor)) {
            this._unmark_window(actor);
        } else {
            this._mark_window(actor);
        }
    }

    _toggle_pin(actor) {
        if (this._has_data_pinned(actor)) {
            this._unpin_window(actor);
        } else {
            this._pin_window(actor);
        }
    }


    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsTaggedWindows org.gnome.Shell.Extensions.GnomeUtilsTaggedWindows.ActivatePinnedWindows

    ActivatePinnedWindows() {
        windowData.forEach((_, actor) => {
            if (this._has_data_pinned(actor)) {
                let win = actor.get_meta_window();
                let win_workspace = win.get_workspace();
                win_workspace.activate_with_focus(win, 0);
            }
        });
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsTaggedWindows org.gnome.Shell.Extensions.GnomeUtilsTaggedWindows.GetPinnedWindows

    GetPinnedWindows() {
        const pinnedWindows = [];

        windowData.forEach((_, actor) => {
            if (this._has_data_pinned(actor)) {
                pinnedWindows.push(actor.get_meta_window().get_id());
            }
        });

        return JSON.stringify(pinnedWindows);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsTaggedWindows org.gnome.Shell.Extensions.GnomeUtilsTaggedWindows.TogglePinsFocusedWindow

    TogglePinsFocusedWindow() {
        let win = Display.get_focus_window();
        let actor = win.get_compositor_private();
        this._toggle_pin(actor);

        windowData.forEach((data, actor) => {
            if (this._has_data_pinned(actor)) {
                const win = actor.get_meta_window();          // human‑readable window
                const windowId = win.get_id();

                log(`Pinned Window ID: ${windowId}`);
                log(`Window Border (Pinned): ${this._get_border_pinned(actor)}`);

            }
        });
    }
    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsTaggedWindows org.gnome.Shell.Extensions.GnomeUtilsTaggedWindows.CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass

    CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass() {
        let wins = this.windowFunctionsInstance._get_other_normal_windows_current_workspace_of_focused_window_wm_class();

        wins.forEach((w) => {
            if (w.get_wm_class_instance() === 'file_progress') {
                return; // Skip this window if it's a 'file_progress' instance
            }

            let actor = w.get_compositor_private();
            if (this._has_data_marked(actor)) {
                return; // Skip this window if it's marked
            }
            w.delete(0);
        });

        this._unmark_windows();
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsTaggedWindows org.gnome.Shell.Extensions.GnomeUtilsTaggedWindows.GetMarkedWindows

    GetMarkedWindows() {
        const markedWindows = [];

        windowData.forEach((_, actor) => {
            if (this._has_data_marked(actor)) {
                markedWindows.push(actor.get_meta_window().get_id());
            }
        });

        return JSON.stringify(markedWindows);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsTaggedWindows org.gnome.Shell.Extensions.GnomeUtilsTaggedWindows.ToggleMarksFocusedWindow

    ToggleMarksFocusedWindow() {
        let win = Display.get_focus_window();
        let actor = win.get_compositor_private();
        this._toggle_mark(actor);

        windowData.forEach((data, actor) => {
            if (this._has_data_marked(actor)) {
                const win = actor.get_meta_window();          // human‑readable window
                const windowId = win.get_id();

                log(`Marked Window ID: ${windowId}`);
                log(`Window Border (Marked): ${this._get_border_marked(actor)}`);

            }
        });
    }
};
