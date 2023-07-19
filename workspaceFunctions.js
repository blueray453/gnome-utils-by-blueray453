const { Gio, GLib, Shell } = imports.gi;

// Get Workspace Names

var MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsWorkspaces">

      <method name="MoveToWorkspace">
         <arg type="u" direction="in" name="winid" />
         <arg type="i" direction="in" name="workspaceNum" />
      </method>
   </interface>
</node>`;

// dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MoveToWorkspace uint32:4121447925 int32:2

function MoveToWorkspace(winid, workspaceNum) {
    let win = _get_window_by_wid(winid).meta_window;
    if (win) {
        // change_workspace(workspace)
        win.change_workspace_by_index(workspaceNum, false);
    } else {
        throw new Error('Not found');
    }
}

function MoveWindowToWorkspace() {
    activate_with_workspace(global.get_current_time(), workspace)
}

function GetWorkspaces() {
    let w = Meta.WorkspaceManager.get_n_workspaces();
}

function GetActiveWorkspace() {
    let w = Meta.WorkspaceManager
    return JSON.stringify({
        workspace: w.get_active_workspace(),
        workspace_index: w.get_active_workspace_index()
    });
}

function GetWindowsOfCurrentWorkspace() {
    let w = Meta.Workspace.list_windows();
}

