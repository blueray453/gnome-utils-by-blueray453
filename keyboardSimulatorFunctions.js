import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';

export const MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsKeyboardSimulator">
        <method name="EmitMetaO">
        </method>
   </interface>
</node>`;

export class KeyboardSimulatorFunctions {

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsKeyboardSimulator org.gnome.Shell.Extensions.GnomeUtilsKeyboardSimulator.EmitMetaO

    EmitMetaO() {
        // let wins = this._get_normal_windows_given_wm_class(VSCODIUM);

        // // Focus VS Code window
        // wins.forEach(win => {
        //     let win_workspace = win.get_workspace();
        //     win_workspace.activate_with_focus(win, 0);
        // });

        // Schema for custom keybindings
        const settings = new Gio.Settings({ schema: 'org.gnome.settings-daemon.plugins.media-keys' });
        const customListKey = 'custom-keybindings';
        let customList = settings.get_strv(customListKey);

        // Find the index of our custom binding path
        const customPath = '/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom11/';
        const index = customList.indexOf(customPath);

        if (index !== -1) {
            // Temporarily remove it from the list
            const newList = customList.slice();
            newList.splice(index, 1);
            settings.set_strv(customListKey, newList);
        }

        // Delay to ensure VS Code window is focused
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
            const VirtualKeyboard = Clutter.get_default_backend()
                .get_default_seat()
                .create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);

            const eventTime = Clutter.get_current_event_time() * 1000;

            // Release stuck modifiers
            const stuckModifiers = [
                Clutter.KEY_Shift_L, Clutter.KEY_Shift_R,
                Clutter.KEY_Control_L, Clutter.KEY_Control_R,
                Clutter.KEY_Alt_L, Clutter.KEY_Alt_R,
                Clutter.KEY_Super_L, Clutter.KEY_Super_R
            ];
            stuckModifiers.forEach(key => {
                VirtualKeyboard.notify_keyval(eventTime, key, Clutter.KeyState.RELEASED);
            });

            // Press Meta+O
            VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_Super_L, Clutter.KeyState.PRESSED);
            VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_o, Clutter.KeyState.PRESSED);
            VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_o, Clutter.KeyState.RELEASED);
            VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_Super_L, Clutter.KeyState.RELEASED);

            // Restore the custom keybinding in the list
            if (index !== -1) {
                const restoredList = settings.get_strv(customListKey).slice();
                restoredList.splice(index, 0, customPath);
                settings.set_strv(customListKey, restoredList);
            }

            return GLib.SOURCE_REMOVE;
        });
    }
}
