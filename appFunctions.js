export const MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsApps">
      <method name="GetAppDetailsGivenAppID">
         <arg type="s" direction="in" name="appid" />
         <arg type="s" direction="out" name="app" />
      </method>
      <method name="GetAppDetailsGivenPID">
         <arg type="u" direction="in" name="pid" />
         <arg type="s" direction="out" name="app" />
      </method>
      <method name="GetAppDetailsFocusedWindow">
         <arg type="s" direction="out" name="app" />
      </method>
      <method name="GetAppDetailsGivenWindowID">
         <arg type="u" direction="in" name="winid" />
         <arg type="s" direction="out" name="icon" />
      </method>
      <method name="GetAppDetailsGivenWMClass">
        <arg type="s" direction="in" name="wm_class" />
        <arg type="s" direction="out" name="windows" />
      </method>
      <method name="GetRunningApps">
         <arg type="s" direction="out" name="app" />
      </method>
   </interface>
</node>`;

export class AppFunctions {
    // _get_app_by_appid = function (appid) {
    //     let app = Gio.AppInfo.get_all().find(a => a.get_id() == appid);
    //     return app;
    // }



    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsApps org.gnome.Shell.Extensions.GnomeUtilsApps.GetAppDetailsGivenAppID string:"io.github.cboxdoerfer.FSearch.desktop" | jq .

    GetAppDetailsGivenAppID(app_id) {
        return JSON.stringify(this._get_properties_brief_given_app_id(app_id));
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsApps org.gnome.Shell.Extensions.GnomeUtilsApps.GetAppDetailsGivenPID uint32:3931313482 | jq .

    GetAppDetailsGivenPID(pid) {
        let tracker = global.get_window_tracker();
        let app = tracker.get_app_from_pid(pid);
        return JSON.stringify(this._get_properties_brief_given_app_id(app.get_id()));
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsApps org.gnome.Shell.Extensions.GnomeUtilsApps.GetAppDetailsFocusedWindow | jq .

    GetAppDetailsFocusedWindow() {
        let tracker = global.get_window_tracker();
        let app = tracker.get_focus_app();
        return JSON.stringify(this._get_properties_brief_given_app_id(app.get_id()));
        // let win = global.get_window_actors().find(w => w.meta_window.has_focus() == true);
        // // let wmclass = w.meta_window.get_wm_class();
        // // return Gio.AppInfo.get_all().find(a => a.get_startup_wm_class() == wmclass).get_id();

        // let tracker = global.get_window_tracker();
        // let app = tracker.get_window_app(win.meta_window);
        // return app.get_id();
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsApps org.gnome.Shell.Extensions.GnomeUtilsApps.GetAppDetailsGivenWindowID uint32:44129093  | jq .

    GetAppDetailsGivenWindowID(winid) {
        let w = global.get_window_actors().find(w => w.meta_window.get_id() == winid);
        //   let wmclass = win.meta_window.get_wm_class();
        //   let app_id = global.get_app_system().lookup_startup_wmclass(wmclass).get_id();
        //   return global.get_app_system().lookup_app(app_id).get_icon().to_string();
        let tracker = global.get_window_tracker();
        let app = tracker.get_window_app(w.meta_window);
        return JSON.stringify(this._get_properties_brief_given_app_id(app.get_id()));
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsApps org.gnome.Shell.Extensions.GnomeUtilsApps.GetAppDetailsGivenWMClass string:"firefox-esr" | jq

    GetAppDetailsGivenWMClass(wmclass) {
        let appsystem = global.get_app_system();
        let app = appsystem.lookup_desktop_wmclass(wmclass);;
        return JSON.stringify(this._get_properties_brief_given_app_id(app.get_id()));
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsApps org.gnome.Shell.Extensions.GnomeUtilsApps.GetRunningApps | jq .

    GetRunningApps() {
        let apps = global.get_app_system().get_running();
        let results = [];

        apps.forEach(app => {
            let app_id = app.get_id();
            try {
                let info = this._get_properties_brief_given_app_id(app_id);
                results.push(info);
            } catch (err) {
                results.push({ app_id, error: err.message });
            }
        });

        return JSON.stringify(results);
    }
}


