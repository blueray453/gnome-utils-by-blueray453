const { Gio, GLib, Shell } = imports.gi;

var MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsApps">
      <method name="GetAppDetails">
         <arg type="s" direction="in" name="appid" />
         <arg type="s" direction="out" name="app" />
      </method>
      <method name="GetAppFromPID">
         <arg type="u" direction="in" name="pid" />
         <arg type="s" direction="out" name="app" />
      </method>
      <method name="GetAppFromFocusedWindow">
         <arg type="s" direction="out" name="app" />
      </method>
      <method name="GetAppFromWinID">
         <arg type="u" direction="in" name="winid" />
         <arg type="s" direction="out" name="icon" />
      </method>
      <method name="GetRunningApps">
         <arg type="s" direction="out" name="app" />
      </method>
   </interface>
</node>`;

var AppFunctions = class AppFunctions {
    _get_app_by_appid = function (appid) {
        let app = Gio.AppInfo.get_all().find(a => a.get_id() == appid);
        return app;
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsApps org.gnome.Shell.Extensions.GnomeUtilsApps.GetAppDetails string:"io.github.cboxdoerfer.FSearch.desktop" | jq .

    GetAppDetails(app_id) {
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
            let icon_val = "";

            if (shell_apps.get_icon()) {
                icon_val = shell_apps.get_icon().to_string();
            }
            return JSON.stringify({
                app_name: desktop_apps.get_name(),
                app_file_name: desktop_apps.get_filename(),
                app_display_name: desktop_apps.get_display_name(),
                app_id: desktop_apps.get_id(),
                wm_class: desktop_apps.get_startup_wm_class(),
                app_pids: shell_apps.get_pids(),
                app_icon: icon_val,
                app_windows_number: shell_apps.get_n_windows(),
                app_windows: windows_array,
                state: shell_apps.get_state(),
                commandline: shell_apps.get_commandline()
            });
        } else {
            throw new Error('Not found');
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsApps org.gnome.Shell.Extensions.GnomeUtilsApps.GetAppFromPID uint32:3931313482

    GetAppFromPID(pid) {
        let tracker = Shell.WindowTracker.get_default();
        let app = tracker.get_app_from_pid(pid);
        return app.get_id();
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsApps org.gnome.Shell.Extensions.GnomeUtilsApps.GetAppFromFocusedWindow

    GetAppFromFocusedWindow() {
        let w = global.get_window_actors().find(w => w.meta_window.has_focus() == true);
        // let wmclass = w.meta_window.get_wm_class();
        // return Gio.AppInfo.get_all().find(a => a.get_startup_wm_class() == wmclass).get_id();

        let tracker = Shell.WindowTracker.get_default();
        let app = tracker.get_window_app(w.meta_window);
        return app.get_id();
    }

    GetAppFromWinID(winid) {

        let w = global.get_window_actors().find(w => w.meta_window.get_id() == winid);
        //   let wmclass = win.meta_window.get_wm_class();
        //   let app_id = Shell.AppSystem.get_default().lookup_startup_wmclass(wmclass).get_id();
        //   return Shell.AppSystem.get_default().lookup_app(app_id).get_icon().to_string();
        let tracker = Shell.WindowTracker.get_default();
        let app = tracker.get_window_app(w.meta_window);
        return app.get_id();
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsApps org.gnome.Shell.Extensions.GnomeUtilsApps.GetRunningApps string:"io.github.cboxdoerfer.FSearch.desktop" | jq .

    GetRunningApps() {
        let apps = Shell.AppSystem.get_default().get_running();

        var appsJsonArr = [];
        apps.forEach(function (a) {
            let icon_val = "";

            if (a.get_icon()) {
                icon_val = a.get_icon().to_string();
            }
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
                app_icons: icon_val
            });

        })

        return JSON.stringify(appsJsonArr);
    }
}


