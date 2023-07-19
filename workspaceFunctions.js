const { Gio, GLib, Shell } = imports.gi;

var MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsWorkspaces">
      <method name="GetWorkspaceNames">
         <arg type="s" direction="out" name="workspaces" />
      </method>
   </interface>
</node>`;

var WorkspaceFunctions = class WorkspaceFunctions {

    GetActiveWorkspace() {
        let w = Meta.WorkspaceManager
        return JSON.stringify({
            workspace: w.get_active_workspace(),
            workspace_index: w.get_active_workspace_index()
        });
    }

    GetWindowsOfCurrentWorkspace() {
        let w = Meta.Workspace.list_windows();
    }

    GetWorkspaceNames() {
        return (Meta.Preference.WORKSPACE_NAMESto_string());
    }

    GetWorkspaces() {
        let w = Meta.WorkspaceManager.get_n_workspaces();
    }



    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MoveToWorkspace uint32:4121447925 int32:2


    MoveToWorkspace(winid, workspaceNum) {
        let win = global.get_window_actors().find(w => w.meta_window.get_id() == winid).meta_window;
        if (win) {
            // change_workspace(workspace)
            win.change_workspace_by_index(workspaceNum, false);
        } else {
            throw new Error('Not found');
        }
    }

    MoveWindowToWorkspace() {
        activate_with_workspace(global.get_current_time(), workspace)
    }






}
