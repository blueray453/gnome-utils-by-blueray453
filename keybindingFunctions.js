// keybindingFunctions.js
import GLib from 'gi://GLib';

import * as windowFunctions from './windowFunctions.js';
import * as keyboardSimulatorFunctions from './keyboardSimulatorFunctions.js';

import { createLogger } from './logger.js';

const journal = createLogger(import.meta.url);

const WORKSPACE_CONFIG = {
    "0": {
        apps: ["Alacritty"],
        launch: { "Alacritty": "alacritty" },
        extra: [],
        toggle_if_current: false,
    },
    "1": {
        apps: ["Nemo"],
        launch: { "Nemo": "nemo" },
        extra: ["close_duplicate_nemo"],
        toggle_if_current: false,
    },
    "2": {
        apps: ["Io.github.cboxdoerfer.FSearch"],
        launch: { "Io.github.cboxdoerfer.FSearch": "fsearch" },
        extra: ["select_all_fsearch"],
        toggle_if_current: false,
    },
    "3": {
        apps: ["VSCodium"],
        launch: { "VSCodium": "codium --reuse-window" },
        extra: [],
        toggle_if_current: false,
    },
    "4": {
        apps: ["firefox-esr", "Chromium", "Epiphany", "Tor Browser"],
        launch: {
            "firefox-esr": "firefox",
            "Chromium": "chromium",
            "Epiphany": "epiphany",
            "Tor Browser": "tor-browser",
        },
        extra: [],
        toggle_if_current: true,
        primary_launch: "firefox-esr",
    },
    "5": {
        apps: ["Audacious", "io.github.celluloid_player.Celluloid", "mpv"],
        launch: {
            "Audacious": "audacious",
            "io.github.celluloid_player.Celluloid": "celluloid",
            "mpv": "mpv",
        },
        extra: [],
        toggle_if_current: false,
    },
    "6": {
        apps: ["calibre", "Evince", "xchm"],
        launch: {
            "calibre": "calibre",
            "Evince": "evince",
            "xchm": "xchm",
        },
        extra: [],
        toggle_if_current: false,
    },
    // Workspace 7 is handled separately below – no config entry needed
};

export const MR_DBUS_IFACE = `
<node>
   <interface name="io.github.blueray453.GnomeUtils.Keybinding">
      <method name="SwitchToWorkspace">
         <arg type="u" direction="in" name="workspace_num" />
      </method>
   </interface>
</node>`;

function goToWorkspace(workspaceNum) {
    const WorkspaceManager = global.get_workspace_manager();
    const current = WorkspaceManager.get_active_workspace();
    const target = WorkspaceManager.get_workspace_by_index(workspaceNum);
    if (target && target.index() !== current.index())
        target.activate(global.get_current_time());
}

function rearrangeToWorkspaces(config) {
    // Build a map from WM_CLASS -> workspace number
    const wmClassToWorkspace = {};
    for (const [ws, data] of Object.entries(config)) {
        const wsNum = parseInt(ws);
        for (const wmClass of data.apps)
            wmClassToWorkspace[wmClass] = wsNum;
    }

    // Step 1: Move each known app window to its configured workspace
    for (const [wmClass, ws] of Object.entries(wmClassToWorkspace))
        windowFunctions.dbusObject.WindowsMoveToGivenWorkspaceGivenWMClass(wmClass, ws);

    // Step 2: Move all other windows (not in the map) to workspace 7
    const allKnownWmClasses = Object.keys(wmClassToWorkspace);
    const otherWindows = windowFunctions.dbusObject.GetWindowsExcludingGivenWMClass(allKnownWmClasses);

    let windowsArray = [];
    try {
        windowsArray = JSON.parse(otherWindows);
    } catch (e) {
        journal(`Failed to parse window list: ${e}`, true);
        return;
    }

    for (const win of windowsArray) {
        const winId = win.id;
        if (winId !== undefined)
            windowFunctions.dbusObject.WindowMoveToGivenWorkspaceGivenWinID(winId, 7);
    }

    journal(`Rearranged windows: moved known apps to their workspaces, others to workspace 7`);
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Keybinding io.github.blueray453.GnomeUtils.Keybinding.SwitchToWorkspace uint32:0

function SwitchToWorkspace(workspaceNum) {
    if (workspaceNum === 7) {
        rearrangeToWorkspaces(WORKSPACE_CONFIG);
        goToWorkspace(workspaceNum);
        return;
    }

    const wsConfig = WORKSPACE_CONFIG[String(workspaceNum)];
    if (!wsConfig) {
        journal(`No config for workspace ${workspaceNum}`, true);
        return;
    }

    const { apps, launch, extra, toggle_if_current, primary_launch } = wsConfig;

    // 1. Check current workspace
    const WorkspaceManager = global.get_workspace_manager();
    const currentWorkspace = WorkspaceManager.get_active_workspace();
    const currentIndex = currentWorkspace.index();

    // 2. Toggle or switch
    if (toggle_if_current && currentIndex === workspaceNum) {
        windowFunctions.dbusObject.ToggleWindowsCurrentWorkspace();
    } else {
        goToWorkspace(workspaceNum);
        for (const wmClass of apps)
            windowFunctions.dbusObject.WindowsMoveToGivenWorkspaceGivenWMClass(wmClass, workspaceNum);
    }

    // 3. Launch apps only if the workspace has NO windows at all (any wm_class)
    let windowCount = 0;
    try {
        windowCount = JSON.parse(windowFunctions.dbusObject.GetWindowCountCurrentWorkspace());
    } catch (e) {
        journal(`Failed to parse window count for workspace ${workspaceNum}: ${e}`, true);
    }

    if (windowCount === 0 && workspaceNum !== 5 && workspaceNum !== 6) {
        let cmd;
        if (primary_launch && launch[primary_launch])
            cmd = launch[primary_launch];
        else if (apps.length > 0 && launch[apps[0]])
            cmd = launch[apps[0]];

        if (cmd)
            GLib.spawn_command_line_async(cmd);
        else
            journal(`No launch command for workspace ${workspaceNum}`, true);
    }

    // 4. Extra actions
    for (const action of extra) {
        switch (action) {
            case 'select_all_fsearch':
                keyboardSimulatorFunctions.dbusObject.SelectAllFsearchText();
                break;
            case 'close_duplicate_nemo':
                windowFunctions.dbusObject.WindowsCloseDuplicateNemo();
                break;
            default:
                journal(`Unknown extra action: ${action}`, true);
        }
    }
}

export const dbusObject = {
    SwitchToWorkspace,
};