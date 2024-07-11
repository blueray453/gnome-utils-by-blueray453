const { Meta, St } = imports.gi;

const Display = global.get_display();
const WorkspaceManager = global.workspace_manager;
const WindowManager = global.window_manager;
const WindowGroup = global.window_group;

// const Me = imports.misc.extensionUtils.getCurrentExtension();
// const WindowFunctions = Me.imports.windowFunctions;

// const Me = ExtensionUtils.getCurrentExtension();
const Me = imports.misc.extensionUtils.getCurrentExtension();
const { WindowFunctions } = Me.imports.windowFunctions;

let markedWindowsData = new Map();

// distinguish which functions just return window id and which return details. We can extract id from details. so specific id is not needed

// those functions which have output will output as json error

var MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsMarkedWindows">
      <method name="ToggleMarksFocusedWindow">
      </method>
      <method name="CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass">
      </method>
   </interface>
</node>`;

var MarkedWindowFunctions = class MarkedWindowFunctions {

    constructor() {
        this.windowFunctionsInstance = new WindowFunctions();
        this._workspaceChangedId = WorkspaceManager.connect('active-workspace-changed', () => this._update_borders());
        this._minimizeId = WindowManager.connect('minimize', (wm, actor) => this._on_window_minimize(actor));
        this._unminimizeId = WindowManager.connect('unminimize', (wm, actor) => this._on_window_unminimize(actor));
    }

    destroy() {
        if (this._workspaceChangedId) {
            WorkspaceManager.disconnect(this._workspaceChangedId);
            this._workspaceChangedId = null;
        }
        if (this._minimizeId) {
            global.window_manager.disconnect(this._minimizeId);
            this._minimizeId = null;
        }
        if (this._unminimizeId) {
            global.window_manager.disconnect(this._unminimizeId);
            this._unminimizeId = null;
        }
    }

    _on_window_minimize(actor) {
        if (markedWindowsData.has(actor)) {
            this._remove_border(actor);
        }
    }

    _on_window_unminimize(actor) {
        if (markedWindowsData.has(actor)) {
            this._add_border(actor);
        }
    }

    _set_marked_window_data(actor, key, value) {
        if (!markedWindowsData.has(actor)) {
            markedWindowsData.set(actor, new Map());
        }
        markedWindowsData.get(actor).set(key, value);
    }

    _get_marked_window_data(actor, key) {
        if (markedWindowsData.has(actor)) {
            return markedWindowsData.get(actor).get(key);
        }
        return null;
    }

    _remove_marked_window_data(actor, key) {
        if (markedWindowsData.has(actor)) {
            markedWindowsData.get(actor).delete(key);
            if (markedWindowsData.get(actor).size === 0) {
                markedWindowsData.delete(actor);
            }
        }
    }

    _list_all_marked_windows() {
        return Array.from(markedWindowsData.keys()).map(actor =>
            actor.get_meta_window().get_id()
        );
    }

    _remove_marks_on_all_marked_windows() {
        markedWindowsData.forEach((_, actor) => {
            this._unmark_window(actor);
        });
    }

    _redraw_border(actor, border) {
        let win = actor.get_meta_window();
        let rect = win.get_frame_rect();
        border.set_position(rect.x, rect.y);
        border.set_size(rect.width, rect.height);
    }

    _restack_window(display, actor, border) {
        let wg = Meta.get_window_group_for_display(display);
        wg.set_child_above_sibling(border, actor);
    }

    _connect_signals(actor, border) {
        let win = actor.get_meta_window();

        let sizeChangedId = win.connect('size-changed', () => {
            this._redraw_border(actor, border);
        });

        let positionChangedId = win.connect('position-changed', () => {
            this._redraw_border(actor, border);
        });

        let restackHandlerID = Display.connect('restacked', (display) => {
            this._restack_window(display, actor, border);
        });

        let unmanagedId = win.connect('unmanaging', () => {
            this._unmark_window(actor);
        });

        this._set_marked_window_data(actor, 'sizeChangedId', sizeChangedId);
        this._set_marked_window_data(actor, 'positionChangedId', positionChangedId);
        this._set_marked_window_data(actor, 'restackHandlerID', restackHandlerID);
        this._set_marked_window_data(actor, 'unmanagedId', unmanagedId);
    }

    _disconnect_signals(actor) {
        let win = actor.get_meta_window();
        log(`Disconnecting signals for window ID: ${win.get_id()}`);

        win.disconnect(this._get_marked_window_data(actor, 'sizeChangedId'));
        win.disconnect(this._get_marked_window_data(actor, 'positionChangedId'));
        win.disconnect(this._get_marked_window_data(actor, 'unmanagedId'));
        Display.disconnect(this._get_marked_window_data(actor, 'restackHandlerID'));
    }

    _add_border(actor) {
        let actor_parent = actor.get_parent();

        let border = new St.Bin({
            style_class: 'border'
        });

        actor_parent.add_child(border);
        this._redraw_border(actor, border);

        this._set_marked_window_data(actor, 'border', border);

        this._connect_signals(actor, border);
    }

    _remove_border(actor) {
        let actor_parent = actor.get_parent();

        actor_parent.remove_child(this._get_marked_window_data(actor, 'border'));

        this._disconnect_signals(actor);

        this._remove_marked_window_data(actor, 'border');
    }

    _update_borders() {
        let currentWorkspace = WorkspaceManager.get_active_workspace();
        markedWindowsData.forEach((_, actor) => {
            let win = actor.get_meta_window();
            if (win.get_workspace() !== currentWorkspace) {
                if (this._get_marked_window_data(actor, 'border')) {
                    this._remove_border(actor);
                }
            } else {
                if (!this._get_marked_window_data(actor, 'border')) {
                    this._add_border(actor);
                }
            }
        });
    }

    _mark_window(actor) {
        this._add_border(actor);
    }

    _unmark_window(actor) {
        this._remove_border(actor);
        markedWindowsData.delete(actor);
    }

    _toggle_mark(actor) {
        if (markedWindowsData.has(actor)) {
            this._unmark_window(actor);
        } else {
            this._mark_window(actor);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsMarkedWindows org.gnome.Shell.Extensions.GnomeUtilsMarkedWindows.ToggleMarksFocusedWindow | jq .

    // Remove Mark From All Marked Windows
    ToggleMarksFocusedWindow() {
        let win = Display.get_focus_window();
        let actor = win.get_compositor_private();
        this._toggle_mark(actor);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsMarkedWindows org.gnome.Shell.Extensions.GnomeUtilsMarkedWindows.CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass | jq .

    CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass() {
        let wins = this.windowFunctionsInstance._get_other_normal_windows_current_workspace_of_focused_window_wm_class();

        wins.forEach(function (w) {
            if (w.get_wm_class_instance() === 'file_progress') {
                return; // Skip this window if it's a 'file_progress' instance
            }

            // Check if the window is marked
            let actor = w.get_compositor_private();
            if (markedWindowsData.has(actor)) {
                return; // Skip this window if it's marked
            }
            w.delete(0);
        });

        // Unmark all windows after closing others
        this._remove_marks_on_all_marked_windows();
    }
}
