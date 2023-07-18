const { Gio, GLib, Shell } = imports.gi;

// dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsApps org.gnome.Shell.Extensions.GnomeUtilsApps.ListApps | jq .

// dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsApps org.gnome.Shell.Extensions.GnomeUtilsApps.DetailsApp string:'org.gnome.Evince.desktop' | jq .

// dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsApps org.gnome.Shell.Extensions.GnomeUtilsApps.DetailsApp string:"io.github.cboxdoerfer.FSearch.desktop" | jq .


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
         <arg type="s" direction="in" name="appid" />
         <arg type="s" direction="out" name="app" />
      </method>
      <method name="GetIconFromAppID">
         <arg type="s" direction="in" name="appid" />
         <arg type="s" direction="out" name="icon" />
      </method>
      <method name="GetAppFromWMClass">
         <arg type="s" direction="in" name="wmclass" />
         <arg type="s" direction="out" name="icon" />
      </method>
      <method name="GetIconFromWMClass">
         <arg type="s" direction="in" name="wmclass" />
         <arg type="s" direction="out" name="icon" />
      </method>
      <method name="GetDefaultAppForType">
         <arg type="s" direction="in" name="type" />
         <arg type="s" direction="out" name="app" />
      </method>
      <method name="GetTypeOfFile">
         <arg type="s" direction="in" name="path" />
         <arg type="s" direction="out" name="file_type" />
      </method>
      <method name="GetIconOfFile">
         <arg type="s" direction="in" name="path" />
         <arg type="s" direction="out" name="icon" />
      </method>
   </interface>
</node>`;

function ListApps() {

    let apps = Gio.AppInfo.get_all();

    var appsJsonArr = [];
    apps.forEach(function (a) {
        let icon_val = "";

        if (a.get_icon()) {
            icon_val = a.get_icon().to_string()
        }
        appsJsonArr.push({
            app_name: a.get_display_name(),
            app_id: a.get_id(),
            app_icon: icon_val
        });
    })
    return JSON.stringify(appsJsonArr);
}

function ListRunningApps() {

    let apps = Shell.AppSystem.get_default().get_running();

    var appsJsonArr = [];
    apps.forEach(function (a) {
        let icon_val = "";

        if (a.get_icon()) {
            icon_val = a.get_icon().to_string()
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
        let icon_val = "";

        if (shell_apps.get_icon()) {
            icon_val = shell_apps.get_icon().to_string()
        }
        return JSON.stringify({
            app_name: desktop_apps.get_name(),
            app_file_name: desktop_apps.get_filename(),
            app_display_name: desktop_apps.get_display_name(),
            app_id: desktop_apps.get_id(),
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

// dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsApps org.gnome.Shell.Extensions.GnomeUtilsApps.GetIconFromAppID string:"org.gnome.Calculator.desktop"

function GetIconFromAppID(app_id) {
    return Shell.AppSystem.get_default().lookup_app(app_id).get_icon().to_string();
}

// dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsApps org.gnome.Shell.Extensions.GnomeUtilsApps.GetAppFromWMClass string:"Alacritty"

function GetAppFromWMClass(wmclass) {
    return Shell.AppSystem.get_default().lookup_startup_wmclass(wmclass).get_id();
}

// dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsApps org.gnome.Shell.Extensions.GnomeUtilsApps.GetIconFromWMClass string:"Alacritty"

function GetIconFromWMClass(wmclass) {
    let app_id = Shell.AppSystem.get_default().lookup_startup_wmclass(wmclass).get_id();
    return Shell.AppSystem.get_default().lookup_app(app_id).get_icon().to_string();
}

//  dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsApps org.gnome.Shell.Extensions.GnomeUtilsApps.GetIconOfFile string:"/home/ismail/Desktop/xgeticon-1.0.tar.bz2"

function GetIconOfFile(path) {
    let file = Gio.File.new_for_path(path);
    let fileInfo = file.query_info('*', Gio.FileQueryInfoFlags.NONE, null);
    return fileInfo.get_icon().get_names()[0];
}

// dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsApps org.gnome.Shell.Extensions.GnomeUtilsApps.GetTypeOfFile string:"/home/ismail/Desktop/xgeticon-1.0.tar.bz2"

function GetTypeOfFile(path) {
    let file = Gio.File.new_for_path(path);
    // file.query_info('standard::content-type,standard::size,time::modified', Gio.FileQueryInfoFlags.NONE, null);
    let fileInfo = file.query_info('*', Gio.FileQueryInfoFlags.NONE, null);
    return fileInfo.get_content_type();
}

// dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsApps org.gnome.Shell.Extensions.GnomeUtilsApps.GetDefaultAppForType string:"application/x-bzip-compressed-tar"

function GetDefaultAppForType(type) {
    return Gio.AppInfo.get_default_for_type(type, true).get_id();
}