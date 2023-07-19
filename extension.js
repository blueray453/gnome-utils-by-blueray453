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
const iconFunctions = Me.imports.iconFunctions;
const windowFunctions = Me.imports.windowFunctions;

class Extension {

    enable() {

        log(`enabling ${Me.metadata.name}`);

        this._dbus_apps = Gio.DBusExportedObject.wrapJSObject(appFunctions.MR_DBUS_IFACE, new appFunctions.AppFunctions());
        this._dbus_apps.export(Gio.DBus.session, '/org/gnome/Shell/Extensions/GnomeUtilsApps');

        this._dbus_icons = Gio.DBusExportedObject.wrapJSObject(iconFunctions.MR_DBUS_IFACE, new iconFunctions.IconFunctions());
        this._dbus_icons.export(Gio.DBus.session, '/org/gnome/Shell/Extensions/GnomeUtilsIcons');

        this._dbus_windows = Gio.DBusExportedObject.wrapJSObject(windowFunctions.MR_DBUS_IFACE, new windowFunctions.WindowFunctions());
        this._dbus_windows.export(Gio.DBus.session, '/org/gnome/Shell/Extensions/GnomeUtilsWindows');

    }

    disable() {
        log(`disabling ${Me.metadata.name}`);

        this._dbus_apps.flush();
        this._dbus_apps.unexport();
        delete this._dbus_apps;

        this._dbus_icons.flush();
        this._dbus_icons.unexport();
        delete this._dbus_icons;

        this._dbus_windows.flush();
        this._dbus_windows.unexport();
        delete this._dbus_windows;
    }
}

function init(meta) {
    log(`initializing ${meta.metadata.name}`);
    return new Extension();
}
