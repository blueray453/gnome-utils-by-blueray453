import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import { journal } from './utils.js'
import Atspi from 'gi://Atspi';

const MODS = {
    SHIFT: Clutter.ModifierType.SHIFT_MASK,
    CTRL: Clutter.ModifierType.CONTROL_MASK,
    ALT: Clutter.ModifierType.MOD1_MASK,
    META: Clutter.ModifierType.MOD4_MASK,
};

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
        <method name="SelectAllFsearchText">
        </method>
   </interface>
</node>`;

export class KeyboardSimulatorFunctions {
    constructor(){
        journal(`KeyboardSimulatorFunctions const`);
    }

    _type_string(text) {
        const chars = Array.from(text);
        journal(`[_type_string] typing "${text}" (${chars.length} chars)`);

        for (const ch of chars) {
            const codepoint = ch.codePointAt(0);
            const keyval = Clutter.unicode_to_keysym(codepoint);
            journal(`[_type_string] char='${ch}' codepoint=${codepoint} keyval=${keyval} (0x${keyval.toString(16)})`);

            if (keyval === 0) {
                continue;
            }

            this._press_keys([keyval]);
        }
    }

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

    _keys_released(onReleased) {
        this._attempts = 0;
        const MAX_ATTEMPTS = 40;

        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 25, () => {
            const [, , modifiers] = global.get_pointer();
            this._attempts++;

            let relevant = modifiers & (MODS.SHIFT | MODS.CTRL | MODS.ALT | MODS.META);

            // journal(`modifiers ${modifiers}`);
            // journal(`mask ${(MODS.SHIFT | MODS.CTRL | MODS.ALT | MODS.META)}`);
            // journal(`modifiers ${modifiers.toString(2)}`);
            // journal(`mask ${(MODS.SHIFT | MODS.CTRL | MODS.ALT | MODS.META).toString(2)}`);

            //       bit: 64  32  16   8   4   2   1
            // modifiers:  1   0   1   0   0   0   0 (80)
            //      mask:  1   0   0   1   1   0   1 (77)
            // SHIFT = 1
            // CTRL = 4
            // ALT = 8
            // META = 64
            // = 77
            // modifiers = 80 = (64 + 16) = META + Num Lock
            // What happens when you apply &
            // modifiers:  00010000
            // mask:       01001101
            // relevant:   00000000
            // Previously for 64 both was 1, so it was true
            // At end in case of 64 it is (0x1=0)

            if (relevant === 0) {
                onReleased();  // call the callback when all modifiers released
                journal(`[Attempt ${this._attempts}] All relevant modifiers released!`);
                return GLib.SOURCE_REMOVE;
            }

            if (this._attempts >= MAX_ATTEMPTS) {
                onReleased();
                journal('Max attempts reached, stopping logger.');
                return GLib.SOURCE_REMOVE;
            }

            return GLib.SOURCE_CONTINUE;
        });
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsKeyboardSimulator org.gnome.Shell.Extensions.GnomeUtilsKeyboardSimulator.PressFromString string:"Control_L,Shift_L,Alt_L,Super_L,o"

    // Accept a string input: 'minus' or 'Control_L,Shift_L,o'
    PressFromString(input) {
        // Split by comma for combos
        const keys = input.split(',').map(k => this._key_name_to_clutter_key(k));
        this._keys_released(() => this._press_keys(keys));

        // this._press_keys(keys);
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

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsKeyboardSimulator org.gnome.Shell.Extensions.GnomeUtilsKeyboardSimulator.SelectAllFsearchText

    SelectAllFsearchText() {
        const ATSPI_APP_NAME = 'io.github.cboxdoerfer.FSearch';
        const KNOWN_PREFIXES = ['book-c ', 'notesfiltered '];

        if (!this._atspiInited) {
            Atspi.init();
            this._atspiInited = true;
        }

        const desktop = Atspi.get_desktop(0);
        const appCount = desktop.get_child_count();

        let app = null;
        for (let i = 0; i < appCount; i++) {
            const candidate = desktop.get_child_at_index(i);
            if (candidate && candidate.get_name() === ATSPI_APP_NAME) {
                app = candidate;
                break;
            }
        }

        if (!app) {
            journal('[SelectAllFsearchText] fsearch app not found');
            return;
        }

        let entry;
        try {

            // you might need to set `gsettings set org.gnome.desktop.interface toolkit-accessibility true`
            // To get the children use https://gitlab.gnome.org/GNOME/accerciser
            // In IPython Console use help(acc) to get the functions
            // you have to press esc>enter to execute commands
            // ################### Some Frequently used Commands
            // acc.addSelection(0, -1)
            // acc.getApplication().name
            // acc.getIndexInParent()
            // acc.getRole()
            // acc.getRoleName()
            // acc.name
            // acc.parent
            // acc.queryText().getText(0, -1)
            // acc.queryText().setCaretOffset(0)
            // acc.queryText().setSelection(0, 0, len(acc.queryText().getText(0, -1)))

            entry = app
                .get_child_at_index(0)  // frame
                .get_child_at_index(0)  // filler
                .get_child_at_index(0)  // filler
                .get_child_at_index(0)  // filler
                .get_child_at_index(0)  // text
        } catch (e) {
            journal(`[SelectAllFsearchText] fixed path failed: ${e}`);
            return;
        }

        if (!entry.is_text()) {
            journal('[SelectAllFsearchText] entry is not text');
            return;
        }

        entry.grab_focus();

        const textIface = entry.get_text_iface();
        // const count = textIface.get_character_count();

        // let chars = [];
        // for (let i = 0; i < count; i++) {
        //     const code = textIface.get_character_at_offset(i);
        //     chars.push(String.fromCodePoint(code));
        // }

        // const fullText = chars.join('');
        // journal(`[SelectAllFsearchText] fullText: "${fullText}"`);

        // We have to do like this because of Name Collision
        // We are telling specifically which get_text() function to call
        const fullText = Atspi.Text.prototype.get_text.call(textIface, 0, -1);
        journal(`[SelectAllFsearchText] fullText: "${fullText}"`);

        // entry.get_editable_text_iface().set_text_contents("Hello");

        let startOffset = 0;
        const matchedPrefix = KNOWN_PREFIXES.find(prefix => fullText.startsWith(prefix));
        if (matchedPrefix) {
            startOffset = matchedPrefix.length;
        }

        textIface.set_caret_offset(startOffset);
        textIface.add_selection(startOffset, -1);
    }

    destroy(){
        journal(`Destroy is called`);
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }
    }
}
