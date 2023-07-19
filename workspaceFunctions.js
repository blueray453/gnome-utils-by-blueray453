const { Gio, GLib, Shell, Meta } = imports.gi;

var MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsWorkspaces">
         <method name="GetWorkspaces">
         <arg type="s" direction="out" name="workspaces" />
      </method>
   </interface>
</node>`;

var WorkspaceFunctions = class WorkspaceFunctions {

    GetWorkspaces() {
        // let w = global.workspace_manager;
        // return JSON.stringify({
        //     workspace_number: w.get_n_workspaces(),
        //     workspace_index: w.get_active_workspace_index(),
        //     windows: global.screen.get_active_workspace().list_windows(),
        // });

        let number_of_workspaces = global.workspace_manager.n_workspaces;
        let name_of_workspaces = [];
        let windows_of_workspaces = [];

        for (let wks = 0; wks < number_of_workspaces; ++wks) {

            name_of_workspaces.push(Meta.prefs_get_workspace_name(wks));
            let metaWorkspace = global.workspace_manager.get_workspace_by_index(wks);
            let windows = [];
            metaWorkspace.list_windows().map(w => windows.push(w.get_id()));

            windows_of_workspaces.push({ [wks]: windows });

        }

        return JSON.stringify({
            number_of_workspaces: number_of_workspaces,
            name_of_workspaces: name_of_workspaces,
            windows_of_workspaces: windows_of_workspaces
        });

    }
}


































    // // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWorkspaces org.gnome.Shell.Extensions.GnomeUtilsWorkspaces.MoveToWorkspace uint32:4121447925 int32:2

    // // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWorkspaces org.gnome.Shell.Extensions.GnomeUtilsWorkspaces.GetWorkspaces

    // MoveToWorkspace(winid, workspaceNum) {
    //     let win = global.get_window_actors().find(w => w.meta_window.get_id() == winid).meta_window;
    //     if (win) {
    //         // change_workspace(workspace)
    //         win.change_workspace_by_index(workspaceNum, false);
    //     } else {
    //         throw new Error('Not found');
    //     }
    // }

    // MoveWindowToWorkspace() {
    //     activate_with_workspace(global.get_current_time(), workspace)
    // }









// Meta.prefs_change_workspace_name
// Meta.prefs_get_dynamic_workspaces
// Meta.prefs_get_num_workspaces
// Meta.prefs_get_workspace_name
// Meta.prefs_get_workspaces_only_on_primary
// Meta.prefs_set_num_workspaces
