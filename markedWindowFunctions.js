const { Meta, St } = imports.gi;

const Display = global.get_display();
const WorkspaceManager = global.workspace_manager;
const WindowManager = global.window_manager;

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
        let win = actor.meta_window;
        if (markedWindowsData.has(win)) {
            this._remove_border(win);
        }
    }

    _on_window_unminimize(actor) {
        let win = actor.meta_window;
        if (markedWindowsData.has(win)) {
            this._add_border(win);
        }
    }

    _set_marked_window_data(metaWindow, key, value) {
        if (!markedWindowsData.has(metaWindow)) {
            markedWindowsData.set(metaWindow, new Map());
        }
        markedWindowsData.get(metaWindow).set(key, value);
    }

    _get_marked_window_data(metaWindow, key) {
        if (markedWindowsData.has(metaWindow)) {
            return markedWindowsData.get(metaWindow).get(key);
        }
        return null;
    }

    _remove_marked_window_data(metaWindow, key) {
        if (markedWindowsData.has(metaWindow)) {
            markedWindowsData.get(metaWindow).delete(key);
            if (markedWindowsData.get(metaWindow).size === 0) {
                markedWindowsData.delete(metaWindow);
            }
        }
    }

    _list_all_marked_windows() {
        return Array.from(markedWindowsData.keys()).map(win => win.get_id());
    }

    _remove_marks_on_all_marked_windows() {
        markedWindowsData.forEach((_, win) => {
            this._unmark_window(win);
        });
    }

    _redraw_border = function (win, border) {
        let rect = win.get_frame_rect();
        border.set_position(rect.x, rect.y);
        border.set_size(rect.width, rect.height);
    }

    _restack_window(display, actor, border) {
        let wg = Meta.get_window_group_for_display(display);
        wg.set_child_above_sibling(border, actor);
    }

    _connect_signals(win, actor, border) {
        let sizeChangedId = win.connect('size-changed', () => this._redraw_border(win, border));
        let positionChangedId = win.connect('position-changed', () => this._redraw_border(win, border));
        let restackHandlerID = Display.connect('restacked', (display) => this._restack_window(display, actor, border));
        let unmanagedId = win.connect('unmanaging', () => {
            try {
                this._unmark_window(win);
            } catch (error) {
                log(`_connect_signals _unmark_window: ${error}`);
            }
        });

        this._set_marked_window_data(win, 'sizeChangedId', sizeChangedId);
        this._set_marked_window_data(win, 'positionChangedId', positionChangedId);
        this._set_marked_window_data(win, 'restackHandlerID', restackHandlerID);
        this._set_marked_window_data(win, 'unmanagedId', unmanagedId);
    }

    _disconnect_signals(win) {
        win.disconnect(this._get_marked_window_data(win, 'sizeChangedId'));
        win.disconnect(this._get_marked_window_data(win, 'positionChangedId'));
        win.disconnect(this._get_marked_window_data(win, 'unmanagedId'));
        Display.disconnect(this._get_marked_window_data(win, 'restackHandlerID'));
    }

    _add_border(win) {
        let actor = win.get_compositor_private();
        let actor_parent = actor.get_parent();

        let border = new St.Bin({
            style_class: 'border'
        });

        actor_parent.add_child(border);
        this._redraw_border(win, border);

        this._set_marked_window_data(win, 'border', border);

        this._connect_signals(win, actor, border);
    }

    _remove_border(win) {
        let actor = win.get_compositor_private();
        let actor_parent = actor.get_parent();

        actor_parent.remove_child(this._get_marked_window_data(win, 'border'));

        this._disconnect_signals(win);

        this._remove_marked_window_data(win, 'border');
    }

    _update_borders() {
        let currentWorkspace = WorkspaceManager.get_active_workspace();
        markedWindowsData.forEach((_, win) => {
            if (win.get_workspace() !== currentWorkspace) {
                if (this._get_marked_window_data(win, 'border')) {
                    this._remove_border(win);
                }
            } else {
                if (!this._get_marked_window_data(win, 'border')) {
                    this._add_border(win);
                }
            }
        });
    }

    _mark_window(win) {
        this._add_border(win);
    }

    _unmark_window(win) {
        this._remove_border(win);
        markedWindowsData.delete(win);
    }

    _toggle_mark(win) {
        if (!win) return;

        if (markedWindowsData.has(win)) {
            this._unmark_window(win);
        } else {
            this._mark_window(win);
        }
    }
    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsMarkedWindows org.gnome.Shell.Extensions.GnomeUtilsMarkedWindows.ToggleMarksFocusedWindow | jq .

    // Remove Mark From All Marked Windows
    ToggleMarksFocusedWindow() {
        let win = Display.get_focus_window();
        this._toggle_mark(win);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsMarkedWindows org.gnome.Shell.Extensions.GnomeUtilsMarkedWindows.CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass | jq .

    CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass() {
        let wins = this.windowFunctionsInstance._get_other_normal_windows_current_workspace_of_focused_window_wm_class();

        wins.forEach(function (w) {
            if (w.get_wm_class_instance() === 'file_progress') {
                return; // Skip this window if it's a 'file_progress' instance
            }

            // Check if the window is marked
            if (markedWindowsData.has(w)) {
                return; // Skip this window if it's marked
            }
            w.delete(0);
        });

        // Unmark all windows after closing others
        this._remove_marks_on_all_marked_windows();
    }
}
