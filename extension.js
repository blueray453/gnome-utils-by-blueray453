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
import * as keybindingFunctions from './keybindingFunctions.js';

import { initLogging, createLogger } from './logger.js';

const journal = createLogger(import.meta.url);

const BUS_NAME = 'io.github.blueray453.GnomeUtils';
// Converts "io.github.blueray453.GnomeUtils" -> "/io/github/blueray453/GnomeUtils"
const BUS_PATH = '/' + BUS_NAME.split('.').join('/');

const SPEC_CACHE_DIR = GLib.build_filenamev([GLib.get_home_dir(), '.cache', 'gnome-dbus-spec']);
const SPEC_CACHE_FILE = 'gnome-utils.json';

// Centralized interface configuration. Each module is a structured module
// exporting MR_DBUS_IFACE, dbusObject, and optionally init()/destroy().
const BASE_INTERFACES = [
    { module: keyboardSimulatorFunctions, shortName: 'KeyboardSimulator' },
    { module: taggedWindowFunctions, shortName: 'TaggedWindows' },
    { module: windowFunctions, shortName: 'Windows' },
    { module: workspaceFunctions, shortName: 'Workspaces' },
    { module: keybindingFunctions, shortName: 'Keybinding' },
];

const INTERFACES = BASE_INTERFACES.map(iface => ({
    ...iface,
    path: `${BUS_PATH}/${iface.shortName}`,
    ifaceName: `${BUS_NAME}.${iface.shortName}`,
}));

const state = {
    ownerId: 0,
    exported: new Map(), // ifaceName -> { exported, module }
};

function exportAll(connection) {
    for (const iface of INTERFACES) {
        // Order matters: wrap and export first, only then call the module's
        // init(). If wrap or export throws, we never enter the half-inited
        // state where init() has run but the entry is missing from
        // state.exported — which would leak signal handlers because
        // unexportAll() would never find the module to call destroy() on.
        try {
            const exported = Gio.DBusExportedObject.wrapJSObject(
                iface.module.MR_DBUS_IFACE,
                iface.module.dbusObject,
            );
            exported.export(connection, iface.path);

            iface.module.init?.();
            state.exported.set(iface.ifaceName, { exported, module: iface.module });

            journal(`Exported ${iface.ifaceName} on ${iface.path}`);
        } catch (e) {
            journal(`Failed to export ${iface.ifaceName}: ${e.message}`, true);
            // Undo a partial init() if it ran before the failure.
            try { iface.module.destroy?.(); } catch (_) { /* nothing to clean */ }
        }
    }
}

function unexportAll() {
    for (const [ifaceName, { exported, module }] of state.exported) {
        try {
            exported.flush();
            exported.unexport();
        } catch (e) {
            // Ignore "not exported" errors during cleanup
        }
        try {
            module.destroy?.();
        } catch (e) {
            journal(`Error destroying ${ifaceName}: ${e.message}`, true);
        }
    }
    state.exported.clear();
}

function writeSpecCache() {
    try {
        GLib.mkdir_with_parents(SPEC_CACHE_DIR, 0o755);

        const interfaces = {};
        for (const iface of INTERFACES) {
            interfaces[iface.ifaceName] = {
                object_path: iface.path,
                xml: iface.module.MR_DBUS_IFACE,
            };
        }

        const spec = { bus_name: BUS_NAME, interfaces };
        const filePath = GLib.build_filenamev([SPEC_CACHE_DIR, SPEC_CACHE_FILE]);
        GLib.file_set_contents(filePath, JSON.stringify(spec, null, 2));
        journal(`Wrote spec cache to ${filePath}`);
    } catch (e) {
        journal(`Failed to write spec cache: ${e.message}`, true);
    }
}

function removeSpecCache() {
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

export default class GnomeUtils extends Extension {
    enable() {
        initLogging(this.uuid, 'both', false);
        journal(`Enabled`);

        state.ownerId = Gio.bus_own_name(
            Gio.BusType.SESSION,
            BUS_NAME,
            Gio.BusNameOwnerFlags.NONE,
            exportAll,
            (connection, name) => {
                journal(`${name}: name acquired`);
                writeSpecCache();
            },
            (connection, name) => {
                journal(`${name}: name lost`, true);
                unexportAll();
            },
        );
    }

    disable() {
        journal(`Disabled`);

        if (state.ownerId) {
            Gio.bus_unown_name(state.ownerId);
            state.ownerId = 0;
        }

        unexportAll();
        removeSpecCache();
    }
}