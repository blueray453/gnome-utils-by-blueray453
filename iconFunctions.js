const { Gio, GLib, Shell } = imports.gi;

var MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsIcons">
      <method name="GetIconFromWinID">
         <arg type="u" direction="in" name="winid" />
         <arg type="s" direction="out" name="icon" />
      </method>
   </interface>
</node>`;

var IconFunctions = class IconFunctions {

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsIcons org.gnome.Shell.Extensions.GnomeUtilsIcons.GetIconFromWinID uint32:44129093

    GetIconFromWinID(winid) {

        let w = global.get_window_actors().find(w => w.meta_window.get_id() == winid);
      //   let wmclass = win.meta_window.get_wm_class();
      //   let app_id = Shell.AppSystem.get_default().lookup_startup_wmclass(wmclass).get_id();
      //   return Shell.AppSystem.get_default().lookup_app(app_id).get_icon().to_string();
       let tracker = Shell.WindowTracker.get_default();
       let app = tracker.get_window_app(w.meta_window);
       return app.get_icon().to_string();
    }

}