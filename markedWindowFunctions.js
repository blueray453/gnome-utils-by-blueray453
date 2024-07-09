const { Meta, St } = imports.gi;

const Display = global.get_display();
const WorkspaceManager = global.workspace_manager;

// const Me = imports.misc.extensionUtils.getCurrentExtension();
// const WindowFunctions = Me.imports.windowFunctions;

// const Me = ExtensionUtils.getCurrentExtension();
const Me = imports.misc.extensionUtils.getCurrentExtension();
const { WindowFunctions } = Me.imports.windowFunctions;

let markedWindowsData = {};

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
        this._minimizeId = global.window_manager.connect('minimize', (wm, actor) => this._on_window_minimize(actor));
        this._unminimizeId = global.window_manager.connect('unminimize', (wm, actor) => this._on_window_unminimize(actor));
    }

    _on_window_minimize(actor) {
        let win = actor.meta_window;
        if (markedWindowsData[win]) {
            this._remove_border(win);
        }
    }

    _on_window_unminimize(actor) {
        let win = actor.meta_window;
        if (markedWindowsData[win]) {
            this._add_border(win);
        }
    }

    destroy() {
        if (this._workspaceChangedId) {
            WorkspaceManager.disconnect(this._workspaceChangedId);
            this._workspaceChangedId = null;
        }
    }

    _list_all_marked_windows = function () {
        return Object.values(markedWindowsData).map(data => data.win_id);
    }

    _remove_marks_on_all_marked_windows() {
        Object.values(markedWindowsData).forEach(data => {
            let win = this.windowFunctionsInstance._get_normal_window_given_window_id(data.win_id);
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

        markedWindowsData[win].sizeChangedId = sizeChangedId;
        markedWindowsData[win].positionChangedId = positionChangedId;
        markedWindowsData[win].restackHandlerID = restackHandlerID;
        markedWindowsData[win].unmanagedId = unmanagedId;
    }

    _disconnect_signals(win) {
        // if (!win || !markedWindowsData[win]) return;

        win.disconnect(markedWindowsData[win].sizeChangedId);
        win.disconnect(markedWindowsData[win].positionChangedId);
        win.disconnect(markedWindowsData[win].unmanagedId);
        Display.disconnect(markedWindowsData[win].restackHandlerID);
    }

    _add_border(win) {
        // if (markedWindowsData[win].border) return;
        let actor = win.get_compositor_private();
        let actor_parent = actor.get_parent();

        let border = new St.Bin({
            style_class: 'border'
        });

        actor_parent.add_child(border);
        this._redraw_border(win, border);

        // if (!markedWindowsData[win]) {
        //     markedWindowsData[win] = {};
        // }

        markedWindowsData[win].border = border;

        this._connect_signals(win, actor, border);
    }

    _remove_border(win) {
        // if (!markedWindowsData[win].border) return;
        // if (!win) return;
        let actor = win.get_compositor_private();
        let actor_parent = actor.get_parent();

        actor_parent.remove_child(markedWindowsData[win].border);

        this._disconnect_signals(win);

        delete markedWindowsData[win].border;
    }

    _update_borders() {
        let currentWorkspace = WorkspaceManager.get_active_workspace();
        Object.values(markedWindowsData).forEach(data => {
            let win = this.windowFunctionsInstance._get_normal_window_given_window_id(data.win_id);
            if (win.get_workspace() !== currentWorkspace) {
                if (markedWindowsData[win].border) {
                    this._remove_border(win);
                }
            } else {
                if (!markedWindowsData[win].border) {
                    this._add_border(win);
                }
            }
        });
    }

    _mark_window(win) {
        if (!win) return;

        if (!markedWindowsData[win]) {
            markedWindowsData[win] = { win_id: win.get_id() };
        }

        this._add_border(win);
    }

    _unmark_window(win) {
        if (!win) return;

        this._remove_border(win);
        delete markedWindowsData[win];
    }

    _toggle_mark(win) {
        if (!win) return;

        if (markedWindowsData[win]) {
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
            if (markedWindowsData[w]) {
                return; // Skip this window if it's marked
            }
            w.delete(0);
        });

        // Unmark all windows after closing others
        this._remove_marks_on_all_marked_windows();
    }
}
