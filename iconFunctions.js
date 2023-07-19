const { Gio, GLib, Shell } = imports.gi;

var MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsIcons">
      <method name="GetIconFromAppID">
         <arg type="s" direction="in" name="appid" />
         <arg type="s" direction="out" name="icon" />
      </method>
      <method name="GetIconFromFilePath">
         <arg type="s" direction="in" name="path" />
         <arg type="s" direction="out" name="icon" />
      </method>
      <method name="GetIconFromMimeType">
         <arg type="s" direction="in" name="mimetype" />
         <arg type="s" direction="out" name="icon" />
      </method>
      <method name="GetIconFromWinID">
         <arg type="u" direction="in" name="winid" />
         <arg type="s" direction="out" name="icon" />
      </method>
      <method name="GetIconFromWMClass">
         <arg type="s" direction="in" name="wmclass" />
         <arg type="s" direction="out" name="icon" />
      </method>
   </interface>
</node>`;

var IconFunctions = class IconFunctions {

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsApps org.gnome.Shell.Extensions.GnomeUtilsApps.GetIconFromAppID string:"org.gnome.Calculator.desktop"

    GetIconFromAppID(app_id) {
        let app = Gio.AppInfo.get_all().find(a => a.get_id() == app_id);
        return app.get_icon().to_string();
        // return Shell.AppSystem.get_default().lookup_app(app_id).get_icon().to_string();
    }

    //  dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsApps org.gnome.Shell.Extensions.GnomeUtilsApps.GetIconFromFilePath string:"/home/ismail/Desktop/xgeticon-1.0.tar.bz2"

    GetIconFromFilePath(path) {
        let file = Gio.File.new_for_path(path);
        let fileInfo = file.query_info('*', Gio.FileQueryInfoFlags.NONE, null);
        let icons = fileInfo.get_icon().get_names();

        if (typeof icons[1] === 'undefined') {
            // does not exist
            return icons[0];
        }
        else {
            return icons[1];
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsApps org.gnome.Shell.Extensions.GnomeUtilsApps.GetIconFromMimeType string:"application/x-bzip-compressed-tar"

    GetIconFromMimeType(type) {
        let icons = Gio.content_type_get_icon(type).get_names();
        if (typeof icons[1] === 'undefined') {
            // image_file = icon_theme.lookup_icon(icons[0], 32, 0).get_filename();
            // print("Mimetype {0} can use icon file {1}".format(type, image_file))
            return icons[0];
        }
        else {
            return icons[1];
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetIconFromWinID uint32:44129093

    GetIconFromWinID(winid) {

        let win = global.get_window_actors().find(w => w.meta_window.get_id() == winid);
        let wmclass = win.meta_window.get_wm_class();
        let app_id = Shell.AppSystem.get_default().lookup_startup_wmclass(wmclass).get_id();
        return Shell.AppSystem.get_default().lookup_app(app_id).get_icon().to_string();
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsApps org.gnome.Shell.Extensions.GnomeUtilsApps.GetIconFromWMClass string:"Alacritty"

    GetIconFromWMClass(wmclass) {

        return Gio.AppInfo.get_all().find(a => a.get_startup_wm_class() == wmclass).get_icon().to_string();
        // let app_id = Shell.AppSystem.get_default().lookup_startup_wmclass(wmclass).get_id();
        // return Shell.AppSystem.get_default().lookup_app(app_id).get_icon().to_string();
    }

}