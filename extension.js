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
const { Gio, GLib, Shell } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

// dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/Windows org.gnome.Shell.Extensions.Windows.ListWindows | jq .

const MR_DBUS_IFACE_WINDOWS = `
<node>
   <interface name="org.gnome.Shell.Extensions.Windows">
      <method name="ListWindows">
         <arg type="s" direction="out" name="win" />
      </method>
      <method name="DetailsWindow">
         <arg type="u" direction="in" name="winid" />
         <arg type="s" direction="out" name="win" />
      </method>
      <method name="GetTitle">
         <arg type="u" direction="in" name="winid" />
         <arg type="s" direction="out" name="win" />
      </method>
      <method name="GetFocusedWindow">
         <arg type="s" direction="out" name="win" />
      </method>
      <method name="MoveToWorkspace">
         <arg type="u" direction="in" name="winid" />
         <arg type="u" direction="in" name="workspaceNum" />
      </method>
      <method name="MoveResize">
         <arg type="u" direction="in" name="winid" />
         <arg type="i" direction="in" name="x" />
         <arg type="i" direction="in" name="y" />
         <arg type="u" direction="in" name="width" />
         <arg type="u" direction="in" name="height" />
      </method>
      <method name="Resize">
         <arg type="u" direction="in" name="winid" />
         <arg type="u" direction="in" name="width" />
         <arg type="u" direction="in" name="height" />
      </method>
      <method name="Move">
         <arg type="u" direction="in" name="winid" />
         <arg type="i" direction="in" name="x" />
         <arg type="i" direction="in" name="y" />
      </method>
      <method name="Maximize">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Minimize">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Unmaximize">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Unminimize">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Activate">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Close">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Raise">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Stick">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Unstick">
         <arg type="u" direction="in" name="winid" />
      </method>

   </interface>
</node>`;

// dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/Apps org.gnome.Shell.Extensions.Apps.ListApps | jq .
// dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/Apps org.gnome.Shell.Extensions.Apps.DetailsApp string:'org.gnome.Evince.desktop' | jq .
// dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/Apps org.gnome.Shell.Extensions.Apps.DetailsApp string:"io.github.cboxdoerfer.FSearch.desktop" | jq .

const MR_DBUS_IFACE_APPS = `
<node>
   <interface name="org.gnome.Shell.Extensions.Apps">
      <method name="ListApps">
         <arg type="s" direction="out" name="app" />
      </method>
      <method name="ListRunningApps">
         <arg type="s" direction="out" name="app" />
      </method>
      <method name="DetailsApp">
         <arg type="s" direction="in" name="app" />
         <arg type="s" direction="out" name="win" />
      </method>
   </interface>
</node>`;

class Extension {
    enable() {
        this._dbus_windows = Gio.DBusExportedObject.wrapJSObject(MR_DBUS_IFACE_WINDOWS, this);
        this._dbus_windows.export(Gio.DBus.session, '/org/gnome/Shell/Extensions/Windows');

        this._dbus_apps = Gio.DBusExportedObject.wrapJSObject(MR_DBUS_IFACE_APPS, this);
        this._dbus_apps.export(Gio.DBus.session, '/org/gnome/Shell/Extensions/Apps');

        this._connection = Gio.DBus.session;

        // var interface = Gio.DBusObject.get_interface("org.gtk.gio.DesktopAppInfo").get_info().lookup_signal("Launched");

        this.handlerId = this._connection.signal_subscribe(null, "org.gtk.gio.DesktopAppInfo", "Launched", "/org/gtk/gio/DesktopAppInfo", null, 0, _parseSignal);

        function _parseSignal(connection, sender, path, iface, signal, params) {

            // log("Calling _parseSignal");

            // let focused_window_id = global.get_window_actors().find(w => w.meta_window.has_focus() == true).meta_window.get_id();

            const app_path = params.get_child_value(0).get_bytestring();
            const app = Gio.DesktopAppInfo.new_from_filename(String.fromCharCode(...app_path));
            const app_id = app.get_id();
            const app_pid = params.get_child_value(2).get_int64();
            const opened_file_path = params.get_child_value(3).get_strv();

            // const variantString = params.print(true);
            // log("variantString : " + variantString);
            // log("variantString unpack : " + params.unpack());
            // log("variantString deep unpack : " + params.deepUnpack());
            // log("variantString recursive unpack : " + params.recursiveUnpack());

            // log("app_path : " + app_path);
            // log("app_id : " + app_id);
            // log("app_pid : " + app_pid);
            // log("app_path : " + app_path);
            // // log("apppath type : " + typeof apppath);
            // log("opened_file_path : " + opened_file_path);

            if (opened_file_path) {
                const file_path = GLib.build_filenamev([GLib.get_home_dir(), 'opened-files.log']);
                const file = Gio.File.new_for_path(file_path);
                // const outputStreamCreate = file.create(Gio.FileCreateFlags.NONE, null);
                const outputStreamAppend = file.append_to(Gio.FileCreateFlags.NONE, null);
                var to_write = focused_window_id + ' ' + app_id + ' ' + app_pid + ' ' + opened_file_path + '\n'
                const bytesWritten = outputStreamAppend.write_all(to_write, null);
            }
        }
    }

    disable() {
        this._dbus_windows.flush();
        this._dbus_windows.unexport();
        delete this._dbus_windows;

        this._dbus_apps.flush();
        this._dbus_apps.unexport();
        delete this._dbus_apps;

        this._connection.signal_unsubscribe(this.handlerId);
        log(`disabling ${Me.metadata.name}`);
    }

    _get_window_by_wid(winid) {
        let win = global.get_window_actors().find(w => w.meta_window.get_id() == winid);
        return win;
    }

    ListApps() {

        let apps = Gio.AppInfo.get_all();

        var appsJsonArr = [];
        apps.forEach(function (a) {
            appsJsonArr.push({
                app_name: a.get_display_name(),
                app_id: a.get_id(),
                app_icon: a.get_icon().to_string(),
            });
        })
        return JSON.stringify(appsJsonArr);
    }

    ListRunningApps() {

        let apps = Shell.AppSystem.get_default().get_running();

        var appsJsonArr = [];
        apps.forEach(function (a) {
            // var windows = a.get_windows();
            // log("windows : " + windows);

            // if (windows){
            //     windows.forEach(function (w) {
            //         log("window id : " + w.get_id());
            //     });
            // }
            appsJsonArr.push({
                app_name: a.get_name(),
                app_id: a.get_id(),
                app_pids: a.get_pids(),
                app_icons: a.get_icon().to_string()
            });

        })

        return JSON.stringify(appsJsonArr);
    }

    DetailsApp(app_id) {
        let desktop_apps = Gio.DesktopAppInfo.new(app_id);
        let shell_apps = Shell.AppSystem.get_default().lookup_app(app_id);

        // get_display_name is a function of AppInfo which is DesktopAppInfo inherited

        // log("Details app windows : " + shell_apps.get_windows());

        let windows_array = [];

        shell_apps.get_windows().forEach(function (w) {
            // log("window id : " + w.get_id());
            windows_array.push(w.get_id());
        })

        if (app_id) {
            return JSON.stringify({
                app_name: desktop_apps.get_name(),
                app_file_name: desktop_apps.get_filename(),
                app_display_name: desktop_apps.get_display_name(),
                app_id: desktop_apps.get_id(),
                app_pids: shell_apps.get_pids(),
                app_icon: shell_apps.get_icon().to_string(),
                app_windows_number: shell_apps.get_n_windows(),
                app_windows: windows_array,
                state: shell_apps.get_state()
            });
        } else {
            throw new Error('Not found');
        }
    }

    GetFocusedWindow() {
        let w = global.get_window_actors().find(w => w.meta_window.has_focus() == true);

        let workspaceManager = global.workspace_manager;

        if (w) {
            var winJsonArr = [];

            winJsonArr.push({
                gtk_app_id: w.meta_window.get_gtk_application_id(),
                sandbox_app_id: w.meta_window.get_sandboxed_app_id(),
                gtk_bus_name: w.meta_window.get_gtk_unique_bus_name(),
                gtk_obj_path: w.meta_window.get_gtk_window_object_path(),
                wm_class: w.meta_window.get_wm_class(),
                wm_class_instance: w.meta_window.get_wm_class_instance(),
                pid: w.meta_window.get_pid(),
                id: w.meta_window.get_id(),
                frame_type: w.meta_window.get_frame_type(),
                window_type: w.meta_window.get_window_type(),
                width: w.get_width(),
                height: w.get_height(),
                x: w.get_x(),
                y: w.get_y(),
                focus: w.meta_window.has_focus(),
                in_current_workspace: w.meta_window.located_on_workspace(workspaceManager.get_active_workspace())
            });

            return JSON.stringify(winJsonArr);

        } else {
            throw new Error('Not found');
        }

    }

    ListWindows() {
        let win = global.get_window_actors();

        let workspaceManager = global.workspace_manager;

        var winJsonArr = [];
        win.forEach(function (w) {
            winJsonArr.push({
                gtk_app_id: w.meta_window.get_gtk_application_id(),
                sandbox_app_id: w.meta_window.get_sandboxed_app_id(),
                gtk_bus_name: w.meta_window.get_gtk_unique_bus_name(),
                gtk_obj_path: w.meta_window.get_gtk_window_object_path(),
                wm_class: w.meta_window.get_wm_class(),
                wm_class_instance: w.meta_window.get_wm_class_instance(),
                pid: w.meta_window.get_pid(),
                id: w.meta_window.get_id(),
                frame_type: w.meta_window.get_frame_type(),
                window_type: w.meta_window.get_window_type(),
                width: w.get_width(),
                height: w.get_height(),
                x: w.get_x(),
                y: w.get_y(),
                focus: w.meta_window.has_focus(),
                in_current_workspace: w.meta_window.located_on_workspace(workspaceManager.get_active_workspace())
            });
        })
        return JSON.stringify(winJsonArr);
    }

    DetailsWindow(winid) {
        let w = this._get_window_by_wid(winid);
        let workspaceManager = global.workspace_manager;
        let currentmonitor = global.display.get_current_monitor();
        // let monitor = global.display.get_monitor_geometry(currentmonitor);
        if (w) {
            return JSON.stringify({
                gtk_app_id: w.meta_window.get_gtk_application_id(),
                sandbox_app_id: w.meta_window.get_sandboxed_app_id(),
                gtk_bus_name: w.meta_window.get_gtk_unique_bus_name(),
                gtk_obj_path: w.meta_window.get_gtk_window_object_path(),
                wm_class: w.meta_window.get_wm_class(),
                wm_class_instance: w.meta_window.get_wm_class_instance(),
                pid: w.meta_window.get_pid(),
                id: w.meta_window.get_id(),
                width: w.get_width(),
                height: w.get_height(),
                x: w.get_x(),
                y: w.get_y(),
                focus: w.meta_window.has_focus(),
                in_current_workspace: w.meta_window.located_on_workspace(workspaceManager.get_active_workspace()),
                moveable: w.meta_window.allows_move(),
                resizeable: w.meta_window.allows_resize(),
                canclose: w.meta_window.can_close(),
                canmaximize: w.meta_window.can_maximize(),
                maximized: w.meta_window.get_maximized(),
                canminimize: w.meta_window.can_minimize(),
                canshade: w.meta_window.can_shade(),
                display: w.meta_window.get_display(),
                frame_bounds: w.meta_window.get_frame_bounds(),
                frame_type: w.meta_window.get_frame_type(),
                window_type: w.meta_window.get_window_type(),
                layer: w.meta_window.get_layer(),
                monitor: w.meta_window.get_monitor(),
                role: w.meta_window.get_role(),
                area: w.meta_window.get_work_area_current_monitor(),
                area_all: w.meta_window.get_work_area_all_monitors(),
                area_cust: w.meta_window.get_work_area_for_monitor(currentmonitor),
                user_time: w.meta_window.get_user_time(),
                flags: w.get_flags()
            });
        } else {
            throw new Error('Not found');
        }
    }

    GetTitle(winid) {
        let w = this._get_window_by_wid(winid).meta_window;
        if (w) {
            return w.get_title();
        } else {
            throw new Error('Not found');
        }
    }

    GetIconByWid(winid) {
        let w = this._get_window_by_wid(winid).meta_window;
        if (w) {
            return w.get_title();
        } else {
            throw new Error('Not found');
        }
    }

    MoveToWorkspace(winid, workspaceNum) {
        let win = this._get_window_by_wid(winid).meta_window;
        if (win) {
            win.change_workspace_by_index(workspaceNum, false);
        } else {
            throw new Error('Not found');
        }
    }

    MoveResize(winid, x, y, width, height) {
        let win = this._get_window_by_wid(winid).meta_window;

        if (win) {
            if (win.minimized) {
                win.unminimize();
            }
            if (win.maximized_horizontally || win.maximized_vertically) {
                win.unmaximize(3);
            }
            win.move_resize_frame(1, x, y, width, height);
            win.activate(0);
        } else {
            throw new Error('Not found');
        }
    }

    Resize(winid, width, height) {
        let win = this._get_window_by_wid(winid).meta_window;
        if (win) {

            if (win.minimized) {
                win.unminimize();
            }

            if (win.maximized_horizontally || win.maximized_vertically) {
                win.unmaximize(3);
            }
            win.move_resize_frame(1, win.get_x(), win.get_y(), width, height);
            win.activate(0);
        } else {
            throw new Error('Not found');
        }
    }

    Move(winid, x, y) {
        let win = this._get_window_by_wid(winid).meta_window;
        if (win) {

            if (win.minimized) {
                win.unminimize();
            }

            if (win.maximized_horizontally || win.maximized_vertically) {
                win.unmaximize(3);
            }
            win.move_frame(1, x, y);
            win.activate(0);
        } else {
            throw new Error('Not found');
        }
    }

    Maximize(winid) {
        let win = this._get_window_by_wid(winid).meta_window;

        if (win) {
            if (win.minimized) {
                win.unminimize();
            }
            win.maximize(3);
            win.activate(0);
        } else {
            throw new Error('Not found');
        }
    }

    Minimize(winid) {
        let win = this._get_window_by_wid(winid).meta_window;
        if (win) {
            win.minimize();
        } else {
            throw new Error('Not found');
        }
    }

    Unmaximize(winid) {
        let win = this._get_window_by_wid(winid).meta_window;
        if (win.maximized_horizontally || win.maximized_vertically) {
            win.unmaximize(3);
            win.activate(0);
        } else {
            throw new Error('Not found');
        }
    }

    Unminimize(winid) {
        let win = this._get_window_by_wid(winid).meta_window;
        if (win.minimized) {
                win.unminimize();
        } else {
            throw new Error('Not found');
        }
    }

    Raise(winid) {
        let win = this._get_window_by_wid(winid).meta_window;
        if (win) {
            win.raise();
            win.raise_and_make_recent();
        } else {
            throw new Error('Not found');
        }
    }
    Stick(winid) {
        let win = this._get_window_by_wid(winid).meta_window;
        if (win) {
            win.stick();
        } else {
            throw new Error('Not found');
        }
    }
    Unstick(winid) {
        let win = this._get_window_by_wid(winid).meta_window;
        if (win) {
            win.unstick();
        } else {
            throw new Error('Not found');
        }
    }
    Activate(winid) {
        let win = this._get_window_by_wid(winid).meta_window;
        if (win) {
            win.activate(0);
        } else {
            throw new Error('Not found');
        }
    }

    Close(winid) {
        let win = this._get_window_by_wid(winid).meta_window;
        if (win) {
            win.kill();
            // win.delete(Math.floor(Date.now() / 1000));
        } else {
            throw new Error('Not found');
        }
    }
}

function init() {
    log(`initializing ${Me.metadata.name}`);
    return new Extension();
}
