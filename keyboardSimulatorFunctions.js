import Clutter from 'gi://Clutter';

export const MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsKeyboardSimulator">
        <method name="EmitMetaO">
        </method>
        <method name="Equal">
        </method>
        <method name="Minus">
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
        // ctrl+shift+alt+meta+insert
        VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_Control_L, Clutter.KeyState.PRESSED);
        VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_Shift_L, Clutter.KeyState.PRESSED);
        VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_Alt_L, Clutter.KeyState.PRESSED);
        VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_Super_L, Clutter.KeyState.PRESSED);
        VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_o, Clutter.KeyState.PRESSED);
        VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_o, Clutter.KeyState.RELEASED);
        VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_Super_L, Clutter.KeyState.RELEASED);
        VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_Alt_L, Clutter.KeyState.RELEASED);
        VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_Shift_L, Clutter.KeyState.RELEASED);
        VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_Control_L, Clutter.KeyState.RELEASED);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsKeyboardSimulator org.gnome.Shell.Extensions.GnomeUtilsKeyboardSimulator.Equal

    Equal() {
        const VirtualKeyboard = Clutter.get_default_backend()
            .get_default_seat()
            .create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);

        const eventTime = Clutter.get_current_event_time() * 1000;

        VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_equal, Clutter.KeyState.PRESSED);
        VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_equal, Clutter.KeyState.RELEASED);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsKeyboardSimulator org.gnome.Shell.Extensions.GnomeUtilsKeyboardSimulator.Minus

    Minus() {
        const VirtualKeyboard = Clutter.get_default_backend()
            .get_default_seat()
            .create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);

        const eventTime = Clutter.get_current_event_time() * 1000;

        VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_minus, Clutter.KeyState.PRESSED);
        VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_minus, Clutter.KeyState.RELEASED);
    }
}
