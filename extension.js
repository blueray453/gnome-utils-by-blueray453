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
const { Gio } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const appFunctions = Me.imports.appFunctions;
const windowFunctions = Me.imports.windowFunctions;
const workspaceFunctions = Me.imports.workspaceFunctions;
const clipboardFunctions = Me.imports.clipboardFunctions;

class Extension {

    enable() {

        log(`enabling ${Me.metadata.name}`);

        this._dbus_apps = Gio.DBusExportedObject.wrapJSObject(appFunctions.MR_DBUS_IFACE, new appFunctions.AppFunctions());
        this._dbus_apps.export(Gio.DBus.session, '/org/gnome/Shell/Extensions/GnomeUtilsApps');

        this._dbus_windows = Gio.DBusExportedObject.wrapJSObject(windowFunctions.MR_DBUS_IFACE, new windowFunctions.WindowFunctions());
        this._dbus_windows.export(Gio.DBus.session, '/org/gnome/Shell/Extensions/GnomeUtilsWindows');

        this._dbus_workspaces = Gio.DBusExportedObject.wrapJSObject(workspaceFunctions.MR_DBUS_IFACE, new workspaceFunctions.WorkspaceFunctions());
        this._dbus_workspaces.export(Gio.DBus.session, '/org/gnome/Shell/Extensions/GnomeUtilsWorkspaces');

        this._dbus_clipboard = Gio.DBusExportedObject.wrapJSObject(clipboardFunctions.MR_DBUS_IFACE, new clipboardFunctions.clipboardFunctions());
        this._dbus_clipboard.export(Gio.DBus.session, '/org/gnome/Shell/Extensions/GnomeUtilsClipboard');

    }

    disable() {
        log(`disabling ${Me.metadata.name}`);

        this._dbus_apps.flush();
        this._dbus_apps.unexport();
        delete this._dbus_apps;

        this._dbus_windows.flush();
        this._dbus_windows.unexport();
        delete this._dbus_windows;

        this._dbus_workspaces.flush();
        this._dbus_workspaces.unexport();
        delete this._dbus_workspaces;

        this._dbus_clipboard.flush();
        this._dbus_clipboard.unexport();
        delete this._dbus_clipboard;
    }
}

function init(meta) {
    log(`initializing ${meta.metadata.name}`);
    return new Extension();
}
