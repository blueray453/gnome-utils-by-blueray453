const { Gio, GLib, Shell } = imports.gi;

var MR_DBUS_IFACE_APPS = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsApps">
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

function ListApps() {

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

function ListRunningApps() {

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

function DetailsApp(app_id) {
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