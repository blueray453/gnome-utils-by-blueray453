import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Atspi from 'gi://Atspi';

import { createLogger } from './logger.js';

const journal = createLogger(import.meta.url);

const MODS = {
    SHIFT: Clutter.ModifierType.SHIFT_MASK,
    CTRL: Clutter.ModifierType.CONTROL_MASK,
    ALT: Clutter.ModifierType.MOD1_MASK,
    META: Clutter.ModifierType.MOD4_MASK,
};

export const MR_DBUS_IFACE = `
<node>
   <interface name="io.com.blueray453.GnomeUtils.KeyboardSimulator">
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
        <method name="TestTypeString">
        </method>
   </interface>
</node>`;

const state = {
    timeoutId: 0,
    attempts: 0,
    atspiInited: false,
};

function typeString(text) {
    const chars = Array.from(text);
    journal(`[typeString] typing "${text}" (${chars.length} chars)`);

    for (const ch of chars) {
        const codepoint = ch.codePointAt(0);
        const keyval = Clutter.unicode_to_keysym(codepoint);
        journal(`[typeString] char='${ch}' codepoint=${codepoint} keyval=${keyval} (0x${keyval.toString(16)})`);

        if (keyval === 0) continue;

        pressKeys([keyval]);
    }
}

// Generic function to emulate key press(es)
function pressKeys(keys) {
    const VirtualKeyboard = Clutter.get_default_backend()
        .get_default_seat()
        .create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);

    const eventTime = Clutter.get_current_event_time() * 1000;

    for (const key of keys)
        VirtualKeyboard.notify_keyval(eventTime, key, Clutter.KeyState.PRESSED);

    for (let i = keys.length - 1; i >= 0; i--)
        VirtualKeyboard.notify_keyval(eventTime, keys[i], Clutter.KeyState.RELEASED);
}

// Convert string like 'Control_L' or 'o' or 'minus' to Clutter.KEY_*
function keyNameToClutterKey(keyName) {
    const name = keyName.trim();
    const keyConstant = `KEY_${name}`;
    if (Clutter[keyConstant] === undefined)
        throw new Error(`Invalid key name: ${name}`);
    return Clutter[keyConstant];
}

function keysReleased(onReleased) {
    state.attempts = 0;
    const MAX_ATTEMPTS = 40;

    state.timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 25, () => {
        const [, , modifiers] = global.get_pointer();
        state.attempts++;

        const relevant = modifiers & (MODS.SHIFT | MODS.CTRL | MODS.ALT | MODS.META);

        //       bit: 64  32  16   8   4   2   1
        // modifiers:  1   0   1   0   0   0   0 (80)
        //      mask:  1   0   0   1   1   0   1 (77)
        // SHIFT = 1, CTRL = 4, ALT = 8, META = 64 -> 77
        // modifiers = 80 = (64 + 16) = META + Num Lock
        // Applying & to 64 with the mask gives 0, so it is correctly treated
        // as "no relevant modifier still held".

        if (relevant === 0) {
            onReleased();
            journal(`[Attempt ${state.attempts}] All relevant modifiers released!`);
            state.timeoutId = 0;
            return GLib.SOURCE_REMOVE;
        }

        if (state.attempts >= MAX_ATTEMPTS) {
            onReleased();
            journal('Max attempts reached, stopping logger.');
            state.timeoutId = 0;
            return GLib.SOURCE_REMOVE;
        }

        return GLib.SOURCE_CONTINUE;
    });
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/KeyboardSimulator io.github.blueray453.GnomeUtils.KeyboardSimulator.PressFromString string:"Control_L,Shift_L,Alt_L,Super_L,o"

function PressFromString(input) {
    const keys = input.split(',').map(k => keyNameToClutterKey(k));
    keysReleased(() => pressKeys(keys));
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/KeyboardSimulator io.github.blueray453.GnomeUtils.KeyboardSimulator.SelectAllFsearchText

function SelectAllFsearchText() {
    const ATSPI_APP_NAME = 'io.github.cboxdoerfer.FSearch';
    const KNOWN_PREFIXES = ['book-c ', 'notesfiltered '];

    if (!state.atspiInited) {
        Atspi.init();
        state.atspiInited = true;
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

    // We have to do like this because of Name Collision
    // We are telling specifically which get_text() function to call
    const fullText = Atspi.Text.prototype.get_text.call(textIface, 0, -1);
    journal(`[SelectAllFsearchText] fullText: "${fullText}"`);

    let startOffset = 0;
    const matchedPrefix = KNOWN_PREFIXES.find(prefix => fullText.startsWith(prefix));
    if (matchedPrefix)
        startOffset = matchedPrefix.length;

    textIface.set_caret_offset(startOffset);
    textIface.add_selection(startOffset, -1);
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/KeyboardSimulator io.github.blueray453.GnomeUtils.KeyboardSimulator.TestTypeString

function TestTypeString() {
    typeString('This is a test');
}

export const dbusObject = {
    PressFromString,
    SelectAllFsearchText,
    TestTypeString,
};

export function init() {
    state.timeoutId = 0;
    state.attempts = 0;
    state.atspiInited = false;
}

export function destroy() {
    journal(`Destroy is called`);
    if (state.timeoutId) {
        GLib.source_remove(state.timeoutId);
        state.timeoutId = 0;
    }
}