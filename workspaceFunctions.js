import Meta from 'gi://Meta';

import { createLogger } from './logger.js';

const journal = createLogger(import.meta.url);

const Display = global.get_display();
const WorkspaceManager = global.get_workspace_manager();

const state = {
    lastWorkspace: 1,
    workspaceChangedId: 0,
};

export const MR_DBUS_IFACE = `
<node>
   <interface name="io.github.blueray453.GnomeUtils.Workspaces">
      <method name="GetCurrentWorkspace">
         <arg type="s" direction="out" name="workspace" />
      </method>
      <method name="GetWorkspaceIndexByName">
         <arg type="s" direction="in" name="workspace_name" />
         <arg type="s" direction="out" name="workspace_num" />
      </method>
      <method name="GetWorkspaces">
         <arg type="s" direction="out" name="workspaces" />
      </method>
      <method name="GoToGivenWorkspace">
         <arg type="u" direction="in" name="workspace_num" />
      </method>
      <method name="MoveFocusedWindowToGivenWorkspace">
         <arg type="u" direction="in" name="workspace_num" />
      </method>
      <method name="MoveWindowToWorkspace">
         <arg type="u" direction="in" name="win_id" />
         <arg type="u" direction="in" name="workspace_num" />
      </method>
      <method name="ToggleWorkspaces">
      </method>
   </interface>
</node>`;

function onWorkspaceSwitched(display, prev, current, direction) {
    state.lastWorkspace = prev;
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Workspaces io.github.blueray453.GnomeUtils.Workspaces.GetCurrentWorkspace

function GetCurrentWorkspace() {
    return JSON.stringify(WorkspaceManager.get_active_workspace().index());
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Workspaces io.github.blueray453.GnomeUtils.Workspaces.GetWorkspaceIndexByName string:"Codium"

function GetWorkspaceIndexByName(workspaceName) {
    const number_of_workspaces = WorkspaceManager.get_n_workspaces();

    for (let i = 0; i < number_of_workspaces; i++) {
        if (Meta.prefs_get_workspace_name(i) == workspaceName) {
            return JSON.stringify(i);
        }
    }
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Workspaces io.github.blueray453.GnomeUtils.Workspaces.GetWorkspaces | jq .

function GetWorkspaces() {
    let workspaces = [];
    let number_of_workspaces = WorkspaceManager.get_n_workspaces();
    let all_windows_of_workspaces = {};
    let all_normal_windows_of_workspaces = {};
    let sticky_windows = [];

    for (let wks = 0; wks < number_of_workspaces; ++wks) {
        workspaces.push({ index: wks, name: Meta.prefs_get_workspace_name(wks) });

        let workspace_name = Meta.prefs_get_workspace_name(wks);
        let metaWorkspace = WorkspaceManager.get_workspace_by_index(wks);
        let all_windows = [];

        metaWorkspace.list_windows().map(w => all_windows.push(w.get_id()));
        all_windows_of_workspaces[workspace_name] = all_windows;

        let all_normal_windows = [];
        metaWorkspace.list_windows()
            .filter(w => w.get_window_type() == 0)
            .map(w => all_normal_windows.push(w.get_id()));
        all_normal_windows_of_workspaces[workspace_name] = all_normal_windows;

        metaWorkspace.list_windows()
            .filter(w => w.get_window_type() == 0 && !w.is_skip_taskbar() && w.is_on_all_workspaces())
            .map(w => sticky_windows.push(w.get_id()));
    }

    return JSON.stringify({
        workspaces,
        all_normal_windows_of_workspaces,
    });
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Workspaces io.github.blueray453.GnomeUtils.Workspaces.GoToGivenWorkspace uint32:4

function GoToGivenWorkspace(workspaceNum) {
    let current_workspace = WorkspaceManager.get_active_workspace();
    let given_workspace = WorkspaceManager.get_workspace_by_index(workspaceNum);

    if (given_workspace.index() !== current_workspace.index()) {
        given_workspace.activate(global.get_current_time());
    }
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Workspaces io.github.blueray453.GnomeUtils.Workspaces.MoveFocusedWindowToGivenWorkspace uint32:4

function MoveFocusedWindowToGivenWorkspace(workspaceNum) {
    let win = Display.get_focus_window();

    if (!win)
        throw new Error('Not found');

    win.change_workspace_by_index(workspaceNum, false);
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Workspaces io.github.blueray453.GnomeUtils.Workspaces.MoveWindowToWorkspace uint32:44129093 uint32:0

function MoveWindowToWorkspace(win_id, workspaceNum) {
    let win = Display.list_all_windows().find(w => w.get_id() == win_id);
    if (!win)
        throw new Error('Not found');

    win.change_workspace_by_index(workspaceNum, false);
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Workspaces io.github.blueray453.GnomeUtils.Workspaces.ToggleWorkspaces

function ToggleWorkspaces() {
    WorkspaceManager.get_workspace_by_index(state.lastWorkspace).activate(global.get_current_time());
}

export const dbusObject = {
    GetCurrentWorkspace,
    GetWorkspaceIndexByName,
    GetWorkspaces,
    GoToGivenWorkspace,
    MoveFocusedWindowToGivenWorkspace,
    MoveWindowToWorkspace,
    ToggleWorkspaces,
};

export function init() {
    state.lastWorkspace = 1;
    if (!state.workspaceChangedId)
        state.workspaceChangedId = WorkspaceManager.connect('workspace-switched', onWorkspaceSwitched);
}

export function destroy() {
    if (state.workspaceChangedId) {
        WorkspaceManager.disconnect(state.workspaceChangedId);
        state.workspaceChangedId = 0;
    }
}