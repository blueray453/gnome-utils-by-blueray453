const { Gio, GLib, Meta, Shell, St } = imports.gi;
const Display = global.get_display();

let markedWindowsData = {};

// distinguish which functions just return window id and which return details. We can extract id from details. so specific id is not needed

// those functions which have output will output as json error

var MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsMarkedWindows">
      <method name="MarkWindows">
      </method>
   </interface>
</node>`;

var markedWindowFunctions = class markedWindowFunctions {

    list_all_marked_windows = function () {
        return Object.values(markedWindowsData).map(win => win.win_id);;
    }

    _toggle_window_border = function (win) {

        let winIds = this.list_all_marked_windows();
        log(`winIds : ${winIds}`);

        if (!win) return;

        let actor = win.get_compositor_private();
        let actor_parent = actor.get_parent();

        let border = new St.Bin({
            style_class: 'border'
        });

        // Get the win_id of the current window
        let currentWinId = win.get_id();

        // Check if the current window's win_id is already in winIds
        if (winIds.includes(currentWinId)) {
            actor_parent.remove_child(markedWindowsData[win].border);
            win.disconnect(markedWindowsData[win].sizeChangedId);
            win.disconnect(markedWindowsData[win].positionChangedId);
            win.disconnect(markedWindowsData[win].unmanagedId);
            delete markedWindowsData[win];
            log(`Window ID ${currentWinId} already has a border.`);
            return;
        }

        actor_parent.add_child(border);

        function redrawBorder() {
            let rect = win.get_frame_rect();
            border.set_position(rect.x, rect.y);
            border.set_size(rect.width, rect.height);
        }

        redrawBorder();
        // restack(Display);  // Ensure the border is initially stacked correctly

        // Connect to the size-changed and position-changed signals
        markedWindowsData[win] = {
            win_id: win.get_id(),
            border: border,
            sizeChangedId: win.connect('size-changed', redrawBorder),
            positionChangedId: win.connect('position-changed', redrawBorder),
            restackHandlerID: Display.connect('restacked', (display) => {
                let wg = Meta.get_window_group_for_display(display);
                wg.set_child_above_sibling(border, actor);  // Raise the border above the window
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

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsMarkedWindows org.gnome.Shell.Extensions.GnomeUtilsMarkedWindows.MarkWindows | jq .

    // If window does not have Mark, Mark Windows
    // If window does has Mark, Mark Unmark Windows
    // Get List of All Marked Windows
    // Remove Mark From All Marked Windows
    MarkWindows() {
        let win = Display.get_focus_window();
        this._toggle_window_border(win);
    }
}
