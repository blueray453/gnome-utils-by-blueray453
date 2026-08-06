/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import * as keyboardSimulatorFunctions from './keyboardSimulatorFunctions.js';
import * as taggedWindowFunctions from './taggedWindowFunctions.js';
import * as windowFunctions from './windowFunctions.js';
import * as workspaceFunctions from './workspaceFunctions.js';

import { setLogging, setLogFn, journal } from './utils.js';

// Dedicated Bus Name for this extension
const BUS_NAME = 'org.gnome.Shell.Extensions.GnomeUtils';
const SPEC_CACHE_DIR = GLib.build_filenamev([GLib.get_home_dir(), '.cache', 'gnome-dbus-spec']);
const SPEC_CACHE_FILE = 'gnome-utils.json';

// Centralized interface configuration
const INTERFACES = [
    {
        instanceName: '_dbus_keyboard_simulator',
        module: keyboardSimulatorFunctions,
        className: 'KeyboardSimulatorFunctions',
        path: '/org/gnome/Shell/Extensions/GnomeUtilsKeyboardSimulator',
        ifaceName: 'org.gnome.Shell.Extensions.GnomeUtilsKeyboardSimulator'
    },
    {
        instanceName: '_dbus_tagged_windows',
        module: taggedWindowFunctions,
        className: 'TaggedWindowFunctions',
        path: '/org/gnome/Shell/Extensions/GnomeUtilsTaggedWindows',
        ifaceName: 'org.gnome.Shell.Extensions.GnomeUtilsTaggedWindows'
    },
    {
        instanceName: '_dbus_windows',
        module: windowFunctions,
        className: 'WindowFunctions',
        path: '/org/gnome/Shell/Extensions/GnomeUtilsWindows',
        ifaceName: 'org.gnome.Shell.Extensions.GnomeUtilsWindows'
    },
    {
        instanceName: '_dbus_workspaces',
        module: workspaceFunctions,
        className: 'WorkspaceFunctions',
        path: '/org/gnome/Shell/Extensions/GnomeUtilsWorkspaces',
        ifaceName: 'org.gnome.Shell.Extensions.GnomeUtilsWorkspaces'
    }
];

export default class GnomeUtils extends Extension {
    enable() {
        setLogFn((msg, error = false) => {
            let level = error ? GLib.LogLevelFlags.LEVEL_CRITICAL : GLib.LogLevelFlags.LEVEL_MESSAGE;
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
        journal(`Enabled`);

        // Request ownership of the dedicated bus name
        this._ownerId = Gio.bus_own_name(
            Gio.BusType.SESSION,
            BUS_NAME,
            Gio.BusNameOwnerFlags.NONE,
            (connection) => {
                // Bus acquired: Export all interfaces on this connection
                for (const iface of INTERFACES) {
                    try {
                        const instance = new iface.module[iface.className]();
                        this[`_${iface.instanceName}_instance`] = instance;

                        const exported = Gio.DBusExportedObject.wrapJSObject(iface.module.MR_DBUS_IFACE, instance);
                        this[iface.instanceName] = exported;
                        exported.export(connection, iface.path);

                        journal(`Exported ${iface.ifaceName} on ${iface.path}`);
                    } catch (e) {
                        journal(`Failed to export ${iface.ifaceName}: ${e.message}`, true);
                    }
                }
            },
            (connection, name) => {
                // Name acquired: Safe to write the cache
                journal(`${name}: name acquired`);
                this._writeSpecCache();
            },
            (connection, name) => {
                // Name lost: Clean up exports
                journal(`${name}: name lost`, true);
                this._unexportAll();
            }
        );
    }

    disable() {
        journal(`Disabled`);

        // Release the bus name
        if (this._ownerId) {
            Gio.bus_unown_name(this._ownerId);
            this._ownerId = null;
        }

        this._unexportAll();
        this._removeSpecCache();
    }

    _unexportAll() {
        for (const iface of INTERFACES) {
            // Destroy the underlying class instance
            const originalInstance = this[`_${iface.instanceName}_instance`];
            if (originalInstance?.destroy) {
                try {
                    originalInstance.destroy();
                } catch (e) {
                    journal(`Error destroying ${iface.instanceName}: ${e.message}`, true);
                }
            }
            delete this[`_${iface.instanceName}_instance`];

            // Unexport the DBus object
            const exported = this[iface.instanceName];
            if (exported) {
                try {
                    exported.flush();
                    exported.unexport();
                } catch (e) {
                    // Ignore "not exported" errors during cleanup
                }
                delete this[iface.instanceName];
            }
        }
    }

    _writeSpecCache() {
        try {
            GLib.mkdir_with_parents(SPEC_CACHE_DIR, 0o755);

            const interfaces = {};
            for (const iface of INTERFACES) {
                interfaces[iface.ifaceName] = {
                    object_path: iface.path,
                    xml: iface.module.MR_DBUS_IFACE,
                };
            }

            const spec = {
                bus_name: BUS_NAME,
                interfaces,
            };

            const filePath = GLib.build_filenamev([SPEC_CACHE_DIR, SPEC_CACHE_FILE]);
            GLib.file_set_contents(filePath, JSON.stringify(spec, null, 2));
            journal(`Wrote spec cache to ${filePath}`);
        } catch (e) {
            journal(`Failed to write spec cache: ${e.message}`, true);
        }
    }

    _removeSpecCache() {
        try {
            const filePath = GLib.build_filenamev([SPEC_CACHE_DIR, SPEC_CACHE_FILE]);
            const file = Gio.File.new_for_path(filePath);
            if (file.query_exists(null)) {
                file.delete(null);
                journal(`Removed spec cache`);
            }
        } catch (e) {
            journal(`Failed to remove spec cache: ${e.message}`, true);
        }
    }
}