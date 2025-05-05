const { Meta, St } = imports.gi;

const Display = global.get_display();
const WorkspaceManager = global.workspace_manager;
const WindowManager = global.window_manager;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const { WindowFunctions } = Me.imports.windowFunctions;

let windowData = new Map();

var MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsTaggedWindows">
      <method name="ActivatePinnedWindows">
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
                    let wg = Meta.get_window_group_for_display(display);
                    wg.set_child_above_sibling(this._get_border(actor) , actor);
                }
            });
            this._get_border(actor);
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
        let win = actor.get_meta_window();
        let rect = win.get_frame_rect();

        // Remove any existing borders first
        const borderMarked = this._get_data(actor, "border_marked");
        if (borderMarked && borderMarked.get_parent() === actor_parent) {
            actor_parent.remove_child(borderMarked);
        }

        const borderPinned = this._get_data(actor, "border_pinned");
        if (borderPinned && borderPinned.get_parent() === actor_parent) {
            actor_parent.remove_child(borderPinned);
        }

        const borderMarkedPinned = this._get_data(actor, "border_marked_pinned");
        if (borderMarkedPinned && borderMarkedPinned.get_parent() === actor_parent) {
            actor_parent.remove_child(borderMarkedPinned);
        }

        let border = this._get_border(actor);
        if (!border) return;

        // Add the new border
        if (border.get_parent() !== actor_parent) {
            actor_parent.add_child(border);
        }

        border.set_position(rect.x, rect.y);
        border.set_size(rect.width, rect.height);
    }

    _remove_border(actor) {
        if (!actor) return;
        const currentBorder = this._get_border(actor);
        if (!currentBorder) return;
        let actor_parent = actor.get_parent();
        if (currentBorder) {
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
            if (this._is_pinned(actor)) {
                this._unpin_window(actor);
            }

            if (this._is_marked(actor)) {
                this._unmark_window(actor);
            }
        });

        let workspaceChangedId = win.connect('workspace-changed', () => {
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
        this._set_data(actor, "isPinned", true);
        this._add_border(actor);
    }

    _mark_window(actor) {
        if (!windowData.has(actor)) {
            this._initialize_actor(actor);
        }
        this._set_data(actor, "isMarked", true);
        this._add_border(actor);
    }

    _unpin_window(actor) {
        this._set_data(actor, "isPinned", false);
        this._add_border(actor);

        if (this._is_neither_marked_pinned(actor)) {
            this._cleanup_window_data(actor);
        }
    }

    _unmark_window(actor) {
        this._set_data(actor, "isMarked", false);
        this._add_border(actor);

        if (this._is_neither_marked_pinned(actor)) {
            this._cleanup_window_data(actor);
        }
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

    // Extracted common cleanup code
    _cleanup_window_data(actor) {
        const win = actor.get_meta_window();
        const connectionIds = [
            'positionChangedId',
            'sizeChangedId',
            'unmanagedId',
            'workspaceChangedId'
        ];

        // Disconnect all stored signal handlers
        connectionIds.forEach(id => {
            const handlerId = this._get_data(actor, id);
            if (handlerId) win.disconnect(handlerId);
        });

        this._remove_border(actor);
        windowData.delete(actor);
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

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsTaggedWindows org.gnome.Shell.Extensions.GnomeUtilsTaggedWindows.GetPinnedWindows

    GetPinnedWindows() {
        let pinnedWindows = Array.from(windowData.keys()).map(actor =>
            actor.get_meta_window().get_id()
        );

        return JSON.stringify(pinnedWindows);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsTaggedWindows org.gnome.Shell.Extensions.GnomeUtilsTaggedWindows.TogglePinsFocusedWindow

    TogglePinsFocusedWindow() {
        let win = this.windowFunctionsInstance._get_normal_focused_window();
        let actor = win.get_compositor_private();
        this._toggle_pin(actor);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsTaggedWindows org.gnome.Shell.Extensions.GnomeUtilsTaggedWindows.CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass

    CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass() {
        let wins = this.windowFunctionsInstance._get_other_normal_windows_current_workspace_of_focused_window_wm_class();

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

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsTaggedWindows org.gnome.Shell.Extensions.GnomeUtilsTaggedWindows.GetMarkedWindows

    GetMarkedWindows() {
        let markedWindows = Array.from(windowData.keys()).map(actor =>
            actor.get_meta_window().get_id()
        );

        return JSON.stringify(markedWindows);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsTaggedWindows org.gnome.Shell.Extensions.GnomeUtilsTaggedWindows.ToggleMarksFocusedWindow

    ToggleMarksFocusedWindow() {
        let win = this.windowFunctionsInstance._get_normal_focused_window();
        log(`Win ID: ${win.get_id()}`);
        let actor = win.get_compositor_private();
        this._toggle_mark(actor);
    }
};
