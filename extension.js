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

// dbus - send--print - reply=literal--session--dest = org.gnome.Shell / org / gnome / Shell / Extensions / GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.ListWindows | jq.

// dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/Windows org.gnome.Shell.Extensions.Windows.ListWindows | jq .

const appFunctions = Me.imports.appFunctions;
const windowFunctions = Me.imports.windowFunctions;

// dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/Apps org.gnome.Shell.Extensions.Apps.ListApps | jq .
// dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/Apps org.gnome.Shell.Extensions.Apps.DetailsApp string:'org.gnome.Evince.desktop' | jq .
// dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/Apps org.gnome.Shell.Extensions.Apps.DetailsApp string:"io.github.cboxdoerfer.FSearch.desktop" | jq .

class Extension {

    ListWindows = windowFunctions.ListWindows;
    GetFocusedWindow = windowFunctions.GetFocusedWindow;
    DetailsWindow = windowFunctions.DetailsWindow;
    GetTitle = windowFunctions.GetTitle;
    GetIconByWid = windowFunctions.GetIconByWid;
    MoveToWorkspace = windowFunctions.MoveToWorkspace;
    MoveResize = windowFunctions.MoveResize;
    Resize = windowFunctions.Resize;
    Move = windowFunctions.Move;
    Maximize = windowFunctions.Maximize;
    Minimize = windowFunctions.Minimize;
    Unmaximize = windowFunctions.Unmaximize;
    Unminimize = windowFunctions.Unminimize;
    Raise = windowFunctions.Raise;
    Stick = windowFunctions.Stick;
    Unstick = windowFunctions.Unstick;
    Activate = windowFunctions.Activate;
    Close = windowFunctions.Close;

    ListApps = appFunctions.ListApps;
    ListApps = appFunctions.ListRunningApps;
    ListApps = appFunctions.DetailsApp;

    enable() {
        console.debug(`enabling ${Me.metadata.name}`);
        this._dbus_windows = Gio.DBusExportedObject.wrapJSObject(windowFunctions.MR_DBUS_IFACE_WINDOWS, this);
        this._dbus_windows.export(Gio.DBus.session, '/org/gnome/Shell/Extensions/GnomeUtilsWindows');

        this._dbus_apps = Gio.DBusExportedObject.wrapJSObject(appFunctions.MR_DBUS_IFACE_APPS, this);
        this._dbus_apps.export(Gio.DBus.session, '/org/gnome/Shell/Extensions/GnomeUtilsApps');
    }

    disable() {
        console.debug(`disabling ${Me.metadata.name}`);
        this._dbus_windows.flush();
        this._dbus_windows.unexport();
        delete this._dbus_windows;

        this._dbus_apps.flush();
        this._dbus_apps.unexport();
        delete this._dbus_apps;

        log(`disabling ${Me.metadata.name}`);
    }
}

function init(meta) {
    console.debug(`initializing ${meta.metadata.name}`);
    return new Extension();
}
