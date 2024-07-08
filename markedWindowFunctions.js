const { Meta, St } = imports.gi;

const Display = global.get_display();

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
      <method name="ToggleWindowsFocusedWindow">
      </method>
      <method name="CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass">
      </method>
   </interface>
</node>`;

var MarkedWindowFunctions = class MarkedWindowFunctions {

    _list_all_marked_windows = function () {
        return Object.values(markedWindowsData).map(data => data.win_id);
    }

    _remove_marks_on_all_marked_windows() {
        Object.values(markedWindowsData).forEach(data => {
        let win = new WindowFunctions()._get_normal_window_given_window_id(data.win_id);
        this._unmark_window(win);
        });
    }

    _redraw_border = function (win, border) {
        let rect = win.get_frame_rect();
        border.set_position(rect.x, rect.y);
        border.set_size(rect.width, rect.height);
    }

    _workspace_changed = function () {
        log(`Check if notice workspace change`);
        // if i move window to different workspace, delete the old border and add a new one

    }

    _mark_window(win) {
        if (!win) return;

        let actor = win.get_compositor_private();
        let actor_parent = actor.get_parent();

        let border = new St.Bin({
            style_class: 'border'
        });

        actor_parent.add_child(border);

        this._redraw_border(win, border);

        markedWindowsData[win] = {
            win_id: win.get_id(),
            border: border,
            sizeChangedId: win.connect('size-changed', () => this._redraw_border(win, border)),
            positionChangedId: win.connect('position-changed', () => this._redraw_border(win, border)),
            workspaceChangedId: win.connect('workspace-changed', () => this._workspace_changed()),
            restackHandlerID: Display.connect('restacked', (display) => {
                let wg = Meta.get_window_group_for_display(display);
                wg.set_child_above_sibling(border, actor);
            }),
            unmanagedId: win.connect('unmanaged', () => {
                global.window_group.remove_child(border);
                win.disconnect(markedWindowsData[win].sizeChangedId);
                win.disconnect(markedWindowsData[win].positionChangedId);
                win.disconnect(markedWindowsData[win].workspaceChangedId);
                Display.disconnect(markedWindowsData[win].restackHandlerID);
                win.disconnect(markedWindowsData[win].unmanagedId);
                delete markedWindowsData[win];
            })
        };
    }

    _unmark_window(win) {
        // if (!win) return;

        let actor = win.get_compositor_private();
        let actor_parent = actor.get_parent();

        actor_parent.remove_child(markedWindowsData[win].border);
        win.disconnect(markedWindowsData[win].sizeChangedId);
        win.disconnect(markedWindowsData[win].positionChangedId);
        win.disconnect(markedWindowsData[win].unmanagedId);
        Display.disconnect(markedWindowsData[win].restackHandlerID);
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

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsMarkedWindows org.gnome.Shell.Extensions.GnomeUtilsMarkedWindows.MarkWindows | jq .

    // Remove Mark From All Marked Windows
    ToggleWindowsFocusedWindow() {
        let win = Display.get_focus_window();
        this._toggle_mark(win);
    }

    CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass() {
        let wins = new WindowFunctions()._get_other_normal_windows_current_workspace_of_focused_window_wm_class();

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
