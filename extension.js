/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

// const ExtensionUtils = imports.misc.extensionUtils;
// const Me = ExtensionUtils.getCurrentExtension();

import * as keyboardSimulatorFunctions from './keyboardSimulatorFunctions.js';
import * as taggedWindowFunctions from './taggedWindowFunctions.js';
import * as windowFunctions from './windowFunctions.js';
import * as workspaceFunctions from './workspaceFunctions.js';

import { setLogging, setLogFn, journal } from './utils.js'

// const taggedWindowFunctions = Me.imports.taggedWindowFunctions;
// const windowFunctions = Me.imports.windowFunctions;
// const workspaceFunctions = Me.imports.workspaceFunctions;

export default class GnomeUtils extends Extension {

    // _registerDbusInterface(instanceName, module, className, path) {
    //     this[instanceName] = Gio.DBusExportedObject.wrapJSObject(
    //         module.MR_DBUS_IFACE,
    //         new module[className]()
    //     );
    //     this[instanceName].export(Gio.DBus.session, path);
    // }

    // _unregisterDbusInterface(instanceName) {
    //     this[instanceName]?.flush();
    //     this[instanceName]?.unexport();
    //     delete this[instanceName];
    // }

    _registerDbusInterface(instanceName, module, className, path) {
        // store original instance
        const instance = new module[className]();
        this[`_${instanceName}_instance`] = instance;

        // wrap for DBus
        this[instanceName] = Gio.DBusExportedObject.wrapJSObject(
            module.MR_DBUS_IFACE,
            instance
        );
        this[instanceName].export(Gio.DBus.session, path);
    }

    _unregisterDbusInterface(instanceName) {
        // destroy original instance if exists
        const originalInstance = this[`_${instanceName}_instance`];
        if (originalInstance?.destroy) {
            originalInstance.destroy();
        }
        delete this[`_${instanceName}_instance`];

        // unexport DBus object
        this[instanceName]?.flush();
        this[instanceName]?.unexport();
        delete this[instanceName];
    }

    enable() {

        setLogFn((msg, error = false) => {
            let level;
            if (error) {
                level = GLib.LogLevelFlags.LEVEL_CRITICAL;
            } else {
                level = GLib.LogLevelFlags.LEVEL_MESSAGE;
            }

            GLib.log_structured(
                'gnome-utils-by-blueray453',
                level,
                {
                    MESSAGE: `${msg}`,
                    SYSLOG_IDENTIFIER: 'gnome-utils-by-blueray453',
                    CODE_FILE: GLib.filename_from_uri(import.meta.url)[0]
                }
            );
        });


        setLogging(true);

        // journalctl -f -o cat SYSLOG_IDENTIFIER=gnome-utils-by-blueray453
        journal(`Enabled`);

        // console.log(`enabling ${Me.metadata.name}`);
        this._registerDbusInterface('_dbus_keyboard_simulator', keyboardSimulatorFunctions, 'KeyboardSimulatorFunctions', '/org/gnome/Shell/Extensions/GnomeUtilsKeyboardSimulator');
        this._registerDbusInterface('_dbus_tagged_windows', taggedWindowFunctions, 'TaggedWindowFunctions', '/org/gnome/Shell/Extensions/GnomeUtilsTaggedWindows');
        this._registerDbusInterface('_dbus_windows', windowFunctions, 'WindowFunctions', '/org/gnome/Shell/Extensions/GnomeUtilsWindows');
        this._registerDbusInterface('_dbus_workspaces', workspaceFunctions, 'WorkspaceFunctions', '/org/gnome/Shell/Extensions/GnomeUtilsWorkspaces');

        // Register keybindings
        // this._keyBinding = global.display.connect('key-press-event', this._onKeyPress.bind(this));
    }

    disable() {
        // console.log(`disabling ${Me.metadata.name}`);
        this._unregisterDbusInterface('_dbus_keyboard_simulator');
        this._unregisterDbusInterface('_dbus_tagged_windows');
        this._unregisterDbusInterface('_dbus_windows');
        this._unregisterDbusInterface('_dbus_workspaces');

        // Disconnect the keybinding
        // global.display.disconnect(this._keyBinding);
    }

    // _onKeyPress(display, event) {
    //     // Check if the key combination is Ctrl + N (assuming lowercase 'n')
    //     if (event.get_key_symbol() === Clutter.KEY_Super_N && event.get_state() === Clutter.ModifierType.CONTROL_MASK) {
    //         // Call the method to move all Nemo windows to the current workspace
    //         windowFunctions.MoveAllNemoWindowsToCurrentWorkspace();
    //     }
    // }
}

// function init(meta) {
//     console.log(`initializing ${meta.metadata.name}`);
//     return new Extension();
// }
