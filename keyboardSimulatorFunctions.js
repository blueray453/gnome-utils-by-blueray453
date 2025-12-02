import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

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
        // // Delay to ensure VS Code window is focused
        // GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
            const VirtualKeyboard = Clutter.get_default_backend()
                .get_default_seat()
                .create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);

            const eventTime = Clutter.get_current_event_time() * 1000;

            // // Release stuck modifiers
            // const stuckModifiers = [
            //     Clutter.KEY_Shift_L, Clutter.KEY_Shift_R,
            //     Clutter.KEY_Control_L, Clutter.KEY_Control_R,
            //     Clutter.KEY_Alt_L, Clutter.KEY_Alt_R,
            //     Clutter.KEY_Super_L, Clutter.KEY_Super_R
            // ];
            // stuckModifiers.forEach(key => {
            //     VirtualKeyboard.notify_keyval(eventTime, key, Clutter.KeyState.RELEASED);
            // });

            // Press Meta+O
            VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_Super_L, Clutter.KeyState.PRESSED);
            VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_o, Clutter.KeyState.PRESSED);
            VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_o, Clutter.KeyState.RELEASED);
            VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_Super_L, Clutter.KeyState.RELEASED);

        //     return GLib.SOURCE_REMOVE;
        // });
    }
}
