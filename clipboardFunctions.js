const { Meta, St } = imports.gi;

const Display = global.get_display();

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

        try {
            let text = selection.get_text();
            log(`Text of Selection is : ${error}`);

        }
        catch (error) {
            log(`Error Text of Selection: ${error}`);
        }

        try {
        let clipboard = St.Clipboard.get_default();

            clipboard.set_text(St.ClipboardType.PRIMARY, selection);
        }
        catch (error) {
            log(`Error GetSelection: ${error}`);
        }
        // return selection;
        return "selection";
    }
}


