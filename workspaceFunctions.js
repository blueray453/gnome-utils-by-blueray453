const { Gio, GLib, Shell, Meta } = imports.gi;

const WorkspaceManager = global.get_workspace_manager();

var MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsWorkspaces">
      <method name="GetCurrentWorkspace">
         <arg type="s" direction="out" name="workspaces" />
      </method>
      <method name="MoveFocusedWindowToWorkspace">
         <arg type="i" direction="in" name="workspace_num" />
      </method>
      <method name="MoveToWorkspace">
         <arg type="i" direction="in" name="workspace_num" />
      </method>
      <method name="MoveWindowToWorkspace">
         <arg type="u" direction="in" name="winid" />
         <arg type="i" direction="in" name="workspace_num" />
      </method>
      <method name="getWorkspaceIndexByName">
         <arg type="s" direction="in" name="workspace_name" />
         <arg type="s" direction="out" name="workspace_num" />
      </method>
      <method name="MoveWindowToWorkspaceAndFocus">
         <arg type="u" direction="in" name="winid" />
         <arg type="i" direction="in" name="workspace_num" />
      </method>
      <method name="GetWorkspaces">
         <arg type="s" direction="out" name="workspaces" />
      </method>
   </interface>
</node>`;

var WorkspaceFunctions = class WorkspaceFunctions {

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWorkspaces org.gnome.Shell.Extensions.GnomeUtilsWorkspaces.GetCurrentWorkspace
    GetCurrentWorkspace() {
        return JSON.stringify(WorkspaceManager.get_active_workspace().index());

    }

    MoveFocusedWindowToWorkspace(workspaceNum) {
        let win = global.get_window_actors().find(w => w.meta_window.has_focus() == true).meta_window;
        if (win) {
            // change_workspace(workspace)
            win.change_workspace_by_index(workspaceNum, false);
        } else {
            throw new Error('Not found');
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWorkspaces org.gnome.Shell.Extensions.GnomeUtilsWorkspaces.MoveToWorkspace int32:4
    MoveToWorkspace(workspaceNum) {
        let current_workspace = WorkspaceManager.get_active_workspace();
        let given_workspace = WorkspaceManager.get_workspace_by_index(workspaceNum);

        // Check if the given workspace exists and is different from the current workspace
        if (given_workspace.index() !== current_workspace.index()) {
            given_workspace.activate(global.get_current_time());
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

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWorkspaces org.gnome.Shell.Extensions.GnomeUtilsWorkspaces.MoveWindowToWorkspaceAndFocus uint32:1903985885 int32:4

    MoveWindowToWorkspaceAndFocus(winid, workspace) {
        let win = global.get_window_actors().find(w => w.meta_window.get_id() == winid).meta_window;
        let metaWorkspace = global.workspace_manager.get_workspace_by_index(workspace);
        win.change_workspace_by_index(workspace, false);
        // Here 0 instead of global.get_current_time() will also work
        metaWorkspace.activate_with_focus(win, global.get_current_time());
        // win.activate_with_workspace(global.get_current_time(), metaWorkspace);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWorkspaces org.gnome.Shell.Extensions.GnomeUtilsWorkspaces.getWorkspaceIndexByName string:"Codium"

    getWorkspaceIndexByName(workspaceName) {

        // Get the total number of workspaces
        let number_of_workspaces = global.workspace_manager.n_workspaces;

        // Iterate through each workspace
        for (let i = 0; i < number_of_workspaces; i++) {
            // Get the workspace
            const workspace = WorkspaceManager.get_workspace_by_index(i);

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
        // let w = global.workspace_manager;
        // return JSON.stringify({
        //     workspace_number: w.get_n_workspaces(),
        //     workspace_index: w.get_active_workspace_index(),
        //     windows: global.screen.get_active_workspace().list_windows(),
        // });

        let workspaces = []
        let current_workspace = Meta.prefs_get_workspace_name(WorkspaceManager.get_active_workspace().index());
        let number_of_workspaces = global.workspace_manager.n_workspaces;
        let all_windows_of_workspaces = {};
        let all_normal_windows_of_workspaces = {};
        let sticky_windows = [];

        for (let wks = 0; wks < number_of_workspaces; ++wks) {

            // let temp = ;

            workspaces.push({index: wks, name: Meta.prefs_get_workspace_name(wks)});



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
}




























    // // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWorkspaces org.gnome.Shell.Extensions.GnomeUtilsWorkspaces.MoveToWorkspace uint32:4121447925 int32:2

    // // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWorkspaces org.gnome.Shell.Extensions.GnomeUtilsWorkspaces.GetWorkspaces

    // MoveWindowToWorkspace() {
    //
    // }









// Meta.prefs_change_workspace_name
// Meta.prefs_get_dynamic_workspaces
// Meta.prefs_get_num_workspaces
// Meta.prefs_get_workspace_name
// Meta.prefs_get_workspaces_only_on_primary
// Meta.prefs_set_num_workspaces
