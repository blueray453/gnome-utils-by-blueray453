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
        <method name="PressFromString">
            <arg type="s" direction="in" name="keys" />
        </method>
   </interface>
</node>`;

export class KeyboardSimulatorFunctions {

    // Generic function to emulate key press(es)
    _press_keys(keys) {
        const VirtualKeyboard = Clutter.get_default_backend()
            .get_default_seat()
            .create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);

        const eventTime = Clutter.get_current_event_time() * 1000;

        // Press all keys in order
        for (const key of keys) {
            VirtualKeyboard.notify_keyval(eventTime, key, Clutter.KeyState.PRESSED);
        }

        // Release all keys in reverse order
        for (let i = keys.length - 1; i >= 0; i--) {
            VirtualKeyboard.notify_keyval(eventTime, keys[i], Clutter.KeyState.RELEASED);
        }
    }

    // Convert string like 'Control_L' or 'o' or 'minus' to Clutter.KEY_*
    _key_name_to_clutter_key(keyName) {
        const name = keyName.trim();
        const keyConstant = `KEY_${name}`;
        if (Clutter[keyConstant] === undefined) {
            throw new Error(`Invalid key name: ${name}`);
        }
        return Clutter[keyConstant];
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsKeyboardSimulator org.gnome.Shell.Extensions.GnomeUtilsKeyboardSimulator.PressFromString string:"Control_L,Shift_L,Alt_L,Super_L,o"

    // Accept a string input: 'minus' or 'Control_L,Shift_L,o'
    PressFromString(input) {
        // Split by comma for combos
        const keys = input.split(',').map(k => this._key_name_to_clutter_key(k));
        this._press_keys(keys);
    }

    // // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsKeyboardSimulator org.gnome.Shell.Extensions.GnomeUtilsKeyboardSimulator.EmitMetaO

    // EmitMetaO() {
    //     this._press_keys([
    //         Clutter.KEY_Control_L,
    //         Clutter.KEY_Shift_L,
    //         Clutter.KEY_Alt_L,
    //         Clutter.KEY_Super_L,
    //         Clutter.KEY_o
    //     ]);
    // }

    // EmitMetaO() {
    //     // // Delay to ensure VS Code window is focused
    //     // GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
    //     const VirtualKeyboard = Clutter.get_default_backend()
    //         .get_default_seat()
    //         .create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);

    //     const eventTime = Clutter.get_current_event_time() * 1000;
    //     // ctrl+shift+alt+meta+insert
    //     VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_Control_L, Clutter.KeyState.PRESSED);
    //     VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_Shift_L, Clutter.KeyState.PRESSED);
    //     VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_Alt_L, Clutter.KeyState.PRESSED);
    //     VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_Super_L, Clutter.KeyState.PRESSED);
    //     VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_o, Clutter.KeyState.PRESSED);
    //     VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_o, Clutter.KeyState.RELEASED);
    //     VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_Super_L, Clutter.KeyState.RELEASED);
    //     VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_Alt_L, Clutter.KeyState.RELEASED);
    //     VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_Shift_L, Clutter.KeyState.RELEASED);
    //     VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_Control_L, Clutter.KeyState.RELEASED);
    // }

    // // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsKeyboardSimulator org.gnome.Shell.Extensions.GnomeUtilsKeyboardSimulator.Equal

    // Equal() {
    //     this._press_keys([Clutter.KEY_equal]);
    // }

    // // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsKeyboardSimulator org.gnome.Shell.Extensions.GnomeUtilsKeyboardSimulator.Minus

    // Minus() {
    //     this._press_keys([Clutter.KEY_minus]);
    // }
}
