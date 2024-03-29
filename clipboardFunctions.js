const { Gio, GLib, Shell } = imports.gi;

var MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsClipboard">
      <method name="GetSelection">
         <arg type="s" direction="out" name="selection" />
      </method>
   </interface>
</node>`;

var clipboardFunctions = class clipboardFunctions {

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsClipboard org.gnome.Shell.Extensions.GnomeUtilsClipboard.GetSelection

    GetSelection() {
        // Not Done
        // https://github.com/awamper/gpaste-integration
        // https://github.com/lsnow/translate-clipboard
        // https://github.com/tuberry/light-dict
        // https://github.com/eexpress/gs-clip-translator
        let selection = Display.get_selection();
        // https://stackoverflow.com/a/10548059/1772898
        St.Clipboard.get_default().set_text(St.ClipboardType.PRIMARY, selection);

        return selection;
    }

}


