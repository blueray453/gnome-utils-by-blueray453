// keybindingFunctions.js
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';

import * as windowFunctions from './windowFunctions.js';
import * as keyboardSimulatorFunctions from './keyboardSimulatorFunctions.js';
import { callDBusMethod } from './dbusClient.js';

import { createLogger } from './logger.js';

const journal = createLogger(import.meta.url);

// Cross-extension: TopNotchWorkspaces' overlay service. Used to show its
// "windows on this workspace" search overlay instead of a bare workspace
// switch when the target workspace is crowded.
const TOPNOTCH_BUS_NAME = 'io.github.blueray453.TopNotchWorkspaces';
const TOPNOTCH_OVERLAY_PATH = '/io/github/blueray453/TopNotchWorkspaces/Overlay';
const TOPNOTCH_OVERLAY_IFACE = 'io.github.blueray453.TopNotchWorkspaces.Overlay';

// Must match TopNotchWorkspaces' own DIRECT_MODE_MAX_WINDOWS — above this
// many windows, its thumbnail shows an overflow button instead of icons.
const DIRECT_MODE_MAX_WINDOWS = 5;

const WORKSPACE_CONFIG = {
    "0": {
        apps: ["Alacritty"],
        launch: { "Alacritty": "alacritty" },
        extra: [],
    },
    "1": {
        apps: ["Nemo"],
        launch: { "Nemo": "nemo" },
        extra: ["close_duplicate_nemo"],
    },
    "2": {
        apps: ["Io.github.cboxdoerfer.FSearch"],
        launch: { "Io.github.cboxdoerfer.FSearch": "fsearch" },
        extra: ["select_all_fsearch"],
    },
    "3": {
        apps: ["VSCodium"],
        launch: { "VSCodium": "codium --reuse-window" },
        extra: [],
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
    },
    "6": {
        apps: ["calibre", "Evince", "xchm"],
        launch: {
            "calibre": "calibre",
            "Evince": "evince",
            "xchm": "xchm",
        },
        extra: [],
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

// Focus the previous window on the current workspace in a stable order
// (creation order), so repeated presses go 4,3,2,1,4,3,2...
function cycleWindowsCurrentWorkspace() {
    const workspace = global.get_workspace_manager().get_active_workspace();

    const windows = workspace.list_windows()
        .filter(w => w.get_window_type() === Meta.WindowType.NORMAL && !w.is_skip_taskbar())
        .sort((a, b) => a.get_stable_sequence() - b.get_stable_sequence());

    if (windows.length === 0)
        return;

    const focused = global.display.get_focus_window();
    const idx = windows.indexOf(focused); // -1 if none of these is focused

    // Step backwards, wrapping from the first window to the last.
    // If nothing is focused, start at the last window.
    const prevIdx = idx === -1
        ? windows.length - 1
        : (idx - 1 + windows.length) % windows.length;
    const next = windows[prevIdx];

    if (next.minimized)
        next.unminimize();
    next.activate(global.get_current_time());
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

// Crowded target (> DIRECT_MODE_MAX_WINDOWS) → show TopNotchWorkspaces'
// search overlay for that workspace INSTEAD OF switching to it directly.
// (The overlay's own ToggleWorkspaceWindows handler calls
// workspace.activate() on TopNotchWorkspaces' side, so the real GNOME
// workspace switch still happens — just via that extension, and
// asynchronously over DBus rather than synchronously here.)
function switchOrShowOverlay(workspaceNum) {
    const windowCount = JSON.parse(windowFunctions.dbusObject.GetWindowCountGivenWorkspace(workspaceNum));

    if (windowCount > DIRECT_MODE_MAX_WINDOWS) {
        journal(`Workspace ${workspaceNum} has ${windowCount} windows — showing overlay instead of switching`);
        callDBusMethod(
            TOPNOTCH_BUS_NAME, TOPNOTCH_OVERLAY_PATH, TOPNOTCH_OVERLAY_IFACE,
            'ToggleWorkspaceWindows',
            new GLib.Variant('(u)', [workspaceNum]),
        );
        return;
    }

    // This workspace isn't crowded — no overflow overlay exists for it.
    // If TopNotchWorkspaces has one open from a PREVIOUS crowded
    // workspace, tell it to close. CloseOverlay is safe to call even
    // when nothing's open — it checks first and no-ops.
    callDBusMethod(
        TOPNOTCH_BUS_NAME, TOPNOTCH_OVERLAY_PATH, TOPNOTCH_OVERLAY_IFACE,
        'CloseOverlay',
    );

    goToWorkspace(workspaceNum);
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Keybinding io.github.blueray453.GnomeUtils.Keybinding.SwitchToWorkspace uint32:0

function SwitchToWorkspace(workspaceNum) {
    const WorkspaceManager = global.get_workspace_manager();
    const currentIndex = WorkspaceManager.get_active_workspace().index();
    const alreadyHere = currentIndex === workspaceNum;

    if (workspaceNum === 7) {
        rearrangeToWorkspaces(WORKSPACE_CONFIG);
        if (alreadyHere)
            cycleWindowsCurrentWorkspace();
        else
            switchOrShowOverlay(workspaceNum);
        return;
    }

    const wsConfig = WORKSPACE_CONFIG[String(workspaceNum)];
    if (!wsConfig) {
        journal(`No config for workspace ${workspaceNum}`, true);
        return;
    }

    const { apps, launch, extra, primary_launch } = wsConfig;

    // 1. Cycle if already on this workspace, otherwise switch to it
    if (alreadyHere) {
        cycleWindowsCurrentWorkspace();
    } else {
        switchOrShowOverlay(workspaceNum);
        for (const wmClass of apps)
            windowFunctions.dbusObject.WindowsMoveToGivenWorkspaceGivenWMClass(wmClass, workspaceNum);
    }

    // 2. Launch apps only if the workspace has NO windows at all (any wm_class)
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

    // 3. Extra actions
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