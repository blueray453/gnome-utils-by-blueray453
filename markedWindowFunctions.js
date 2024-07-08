const { Meta, St } = imports.gi;

const Display = global.get_display();

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

var markedWindowFunctions = class markedWindowFunctions {

    _list_all_marked_windows = function () {
        return Object.values(markedWindowsData).map(win => win.win_id);
    }

    _remove_marks_on_all_marked_windows() {
        Object.keys(markedWindowsData).forEach(win => {
            this._unmark_window(win);
        });
    }

    _redraw_border = function (win, border) {
        let rect = win.get_frame_rect();
        border.set_position(rect.x, rect.y);
        border.set_size(rect.width, rect.height);
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
            restackHandlerID: Display.connect('restacked', (display) => {
                let wg = Meta.get_window_group_for_display(display);
                wg.set_child_above_sibling(border, actor);
            }),
            unmanagedId: win.connect('unmanaged', () => {
                global.window_group.remove_child(border);
                win.disconnect(markedWindowsData[win].sizeChangedId);
                win.disconnect(markedWindowsData[win].positionChangedId);
                Display.disconnect(markedWindowsData[win].restackHandlerID);
                win.disconnect(markedWindowsData[win].unmanagedId);
                delete markedWindowsData[win];
            })
        };
    }

    _unmark_window(win) {
        if (!win) return;

        let currentWinId = win.get_id();

        if (!markedWindowsData[win]) {
            log(`Window ID ${currentWinId} is not marked.`);
            return;
        }

        let actor = win.get_compositor_private();
        let actor_parent = actor.get_parent();

        actor_parent.remove_child(markedWindowsData[win].border);
        win.disconnect(markedWindowsData[win].sizeChangedId);
        win.disconnect(markedWindowsData[win].positionChangedId);
        win.disconnect(markedWindowsData[win].unmanagedId);
        Display.disconnect(markedWindowsData[win].restackHandlerID);
        delete markedWindowsData[win];
    }

    toggleMark(win) {
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
        this.toggleMark(win);
    }

    CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass() {
        let wins = windowFunctions._get_other_normal_windows_current_workspace_of_focused_window_wm_class();

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
