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

// const ExtensionUtils = imports.misc.extensionUtils;
// const Me = ExtensionUtils.getCurrentExtension();

import * as appFunctions from './appFunctions.js';
import * as clipboardFunctions from './clipboardFunctions.js';
import * as taggedWindowFunctions from './taggedWindowFunctions.js';
import * as windowFunctions from './windowFunctions.js';
import * as workspaceFunctions from './workspaceFunctions.js';

// const appFunctions = Me.imports.appFunctions;
// const clipboardFunctions = Me.imports.clipboardFunctions;
// const taggedWindowFunctions = Me.imports.taggedWindowFunctions;
// const windowFunctions = Me.imports.windowFunctions;
// const workspaceFunctions = Me.imports.workspaceFunctions;

export default class GnomeUtils extends Extension {

    _registerDbusInterface(instanceName, module, className, path) {
        this[instanceName] = Gio.DBusExportedObject.wrapJSObject(
            module.MR_DBUS_IFACE,
            new module[className]()
        );
        this[instanceName].export(Gio.DBus.session, path);
    }

    _unregisterDbusInterface(instanceName) {
        this[instanceName]?.flush();
        this[instanceName]?.unexport();
        delete this[instanceName];
    }

    enable() {

        // log(`enabling ${Me.metadata.name}`);

        this._registerDbusInterface('_dbus_apps', appFunctions, 'AppFunctions', '/org/gnome/Shell/Extensions/GnomeUtilsApps');
        this._registerDbusInterface('_dbus_windows', windowFunctions, 'WindowFunctions', '/org/gnome/Shell/Extensions/GnomeUtilsWindows');
        this._registerDbusInterface('_dbus_marked_windows', taggedWindowFunctions, 'MarkedWindowFunctions', '/org/gnome/Shell/Extensions/GnomeUtilsTaggedWindows');
        this._registerDbusInterface('_dbus_workspaces', workspaceFunctions, 'WorkspaceFunctions', '/org/gnome/Shell/Extensions/GnomeUtilsWorkspaces');
        this._registerDbusInterface('_dbus_clipboard', clipboardFunctions, 'clipboardFunctions', '/org/gnome/Shell/Extensions/GnomeUtilsClipboard');

        // Register keybindings
        // this._keyBinding = global.display.connect('key-press-event', this._onKeyPress.bind(this));
    }

    disable() {
        // log(`disabling ${Me.metadata.name}`);

        this._unregisterDbusInterface('_dbus_apps');
        this._unregisterDbusInterface('_dbus_windows');
        this._unregisterDbusInterface('_dbus_marked_windows');
        this._unregisterDbusInterface('_dbus_workspaces');
        this._unregisterDbusInterface('_dbus_clipboard');

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
//     log(`initializing ${meta.metadata.name}`);
//     return new Extension();
// }
