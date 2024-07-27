const { Gio, GLib, Shell, Meta } = imports.gi;

// I think Gio, GLib, Shell are unused

const WorkspaceManager = global.get_workspace_manager();

var MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsWorkspaces">
      <method name="GetCurrentWorkspace">
         <arg type="s" direction="out" name="workspaces" />
      </method>
      <method name="GetWorkspaceIndexByName">
         <arg type="s" direction="in" name="workspace_name" />
         <arg type="s" direction="out" name="workspace_num" />
      </method>
      <method name="GetWorkspaces">
         <arg type="s" direction="out" name="workspaces" />
      </method>
      <method name="GoToGivenWorkspace">
         <arg type="i" direction="in" name="workspace_num" />
      </method>
      <method name="MoveFocusedWindowToGivenWorkspace">
         <arg type="i" direction="in" name="workspace_num" />
      </method>
      <method name="MoveWindowToWorkspace">
         <arg type="u" direction="in" name="winid" />
         <arg type="i" direction="in" name="workspace_num" />
      </method>
   </interface>
</node>`;

var WorkspaceFunctions = class WorkspaceFunctions {

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWorkspaces org.gnome.Shell.Extensions.GnomeUtilsWorkspaces.GetCurrentWorkspace

    GetCurrentWorkspace() {
        return JSON.stringify(WorkspaceManager.get_active_workspace().index());

    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWorkspaces org.gnome.Shell.Extensions.GnomeUtilsWorkspaces.GetWorkspaceIndexByName string:"Codium"

    GetWorkspaceIndexByName(workspaceName) {

        // Get the total number of workspaces
        let number_of_workspaces = global.workspace_manager.n_workspaces;

        // Iterate through each workspace
        for (let i = 0; i < number_of_workspaces; i++) {

            // Check if the workspace name matches
            if (Meta.prefs_get_workspace_name(i) == workspaceName) {
                // Return the index of the workspace
                return JSON.stringify(i);
            }
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWorkspaces org.gnome.Shell.Extensions.GnomeUtilsWorkspaces.GetWorkspaces | jq .

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWorkspaces org.gnome.Shell.Extensions.GnomeUtilsWorkspaces.GetWorkspaces | jq -r '.workspace_names[].name'

    GetWorkspaces() {

        let workspaces = []
        // let current_workspace = Meta.prefs_get_workspace_name(WorkspaceManager.get_active_workspace().index());
        let number_of_workspaces = global.workspace_manager.n_workspaces;
        let all_windows_of_workspaces = {};
        let all_normal_windows_of_workspaces = {};
        let sticky_windows = [];

        for (let wks = 0; wks < number_of_workspaces; ++wks) {

            // let temp = ;

            workspaces.push({ index: wks, name: Meta.prefs_get_workspace_name(wks) });

            // let workspace_name = wks+'_'+Meta.prefs_get_workspace_name(wks);
            let workspace_name = Meta.prefs_get_workspace_name(wks);

            let metaWorkspace = global.workspace_manager.get_workspace_by_index(wks);
            let all_windows = [];

            metaWorkspace.list_windows().map(w => all_windows.push(w.get_id()));

            // all_windows_of_workspaces.push({ [wks]: all_windows });
            all_windows_of_workspaces[workspace_name] = all_windows;

            let all_normal_windows = [];

            metaWorkspace.list_windows().filter(w => w.get_window_type() == 0).map(w => all_normal_windows.push(w.get_id()));

            // all_normal_windows_of_workspaces.push({ [wks]: all_normal_windows });
            all_normal_windows_of_workspaces[workspace_name] = all_normal_windows;

            metaWorkspace.list_windows().filter(w => w.get_window_type() == 0 && !w.is_skip_taskbar() && w.is_on_all_workspaces()).map(w => sticky_windows.push(w.get_id()));
        }

        return JSON.stringify({
            workspaces: workspaces,
            // number_of_workspaces: number_of_workspaces,
            // current_workspace: current_workspace,
            // all_windows_of_workspaces: all_windows_of_workspaces,
            all_normal_windows_of_workspaces: all_normal_windows_of_workspaces
        });
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWorkspaces org.gnome.Shell.Extensions.GnomeUtilsWorkspaces.GoToGivenWorkspace int32:4

    GoToGivenWorkspace(workspaceNum) {
        let current_workspace = WorkspaceManager.get_active_workspace();
        let given_workspace = WorkspaceManager.get_workspace_by_index(workspaceNum);

        // Check if the given workspace exists and is different from the current workspace
        if (given_workspace.index() !== current_workspace.index()) {
            given_workspace.activate(global.get_current_time());
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWorkspaces org.gnome.Shell.Extensions.GnomeUtilsWorkspaces.MoveFocusedWindowToGivenWorkspace int32:4

    MoveFocusedWindowToGivenWorkspace(workspaceNum) {
        let win = global.get_window_actors().find(w => w.meta_window.has_focus() == true).meta_window;
        if (win) {
            // change_workspace(workspace)
            win.change_workspace_by_index(workspaceNum, false);
        } else {
            throw new Error('Not found');
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWorkspaces org.gnome.Shell.Extensions.GnomeUtilsWorkspaces.MoveWindowToWorkspace uint32:44129093 int32:0

    MoveWindowToWorkspace(winid, workspaceNum) {
        let win = global.get_window_actors().find(w => w.meta_window.get_id() == winid).meta_window;
        if (win) {
            // change_workspace(workspace)
            win.change_workspace_by_index(workspaceNum, false);
        } else {
            throw new Error('Not found');
        }
    }
}
