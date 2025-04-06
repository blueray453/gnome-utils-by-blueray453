const { Meta, St } = imports.gi;

const Display = global.get_display();

var MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsClipboard">
      <method name="SetClipboard">
         <arg type="s" direction="in" name="input" />
      </method>
      <method name="GetClipboard">
         <arg type="s" direction="out" name="output" />
      </method>
   </interface>
</node>`;

var clipboardFunctions = class clipboardFunctions {

   // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsClipboard org.gnome.Shell.Extensions.GnomeUtilsClipboard.SetClipboard string:"firefox"

   SetClipboard(input) {
        // Not Done
        // https://github.com/awamper/gpaste-integration
        // https://github.com/lsnow/translate-clipboard
        // https://github.com/tuberry/light-dict
        // https://github.com/eexpress/gs-clip-translator
      //   let selection = Display.get_selection();
        // https://stackoverflow.com/a/10548059/1772898



      //   log(`Selection: ${selection}`);

        try {
           St.Clipboard.get_default().set_text(St.ClipboardType.PRIMARY, input);
           St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, input);
        }
        catch (error) {
            log(`Clipboard: ${error}`);
        }

        // try {
        // let clipboard = St.Clipboard.get_default();

        //     clipboard.set_text(St.ClipboardType.PRIMARY, selection);
        // }
        // catch (error) {
        //     log(`Error GetSelection: ${error}`);
        // }
        // return selection;
    }

   // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsClipboard org.gnome.Shell.Extensions.GnomeUtilsClipboard.GetClipboard

   GetClipboard() {
      St.Clipboard.get_default().get_text(St.ClipboardType.CLIPBOARD, (_, text) => {
         log(`Inside GetClipboard`);
         if (text) {
            text = text.trim();
            log(`Inside Text`);
            return text;
         } else {
            log(`No Text`);
            return "";
         }
      });
   }
}


