// keybindingFunctions.js
import GLib from 'gi://GLib';
import * as windowFunctions from './windowFunctions.js';
import * as taggedWindowFunctions from './taggedWindowFunctions.js';
import * as keyboardSimulatorFunctions from './keyboardSimulatorFunctions.js';

import { createLogger } from './logger.js';

const journal = createLogger(import.meta.url);

export const MR_DBUS_IFACE = `
<node>
   <interface name="io.github.blueray453.GnomeUtils.Keybinding">
      <method name="SwitchToWorkspace">
         <arg type="u" direction="in" name="workspace_num" />
      </method>
   </interface>
</node>`;

export class KeybindingFunctions {
    constructor() {
        this._windows = new windowFunctions.WindowFunctions();
        this._tagged = new taggedWindowFunctions.TaggedWindowFunctions();
        this._keyboard = new keyboardSimulatorFunctions.KeyboardSimulatorFunctions();
    }

    SwitchToWorkspace(workspaceNum) {
        // ---------- Configuration ----------
        const config = {
            "0": {
                apps: ["Alacritty"],
                launch: { "Alacritty": "alacritty" },
                extra: [],
                toggle_if_current: false
            },
            "1": {
                apps: ["Nemo"],
                launch: { "Nemo": "nemo" },
                extra: ["close_duplicate_nemo"],
                toggle_if_current: false
            },
            "2": {
                apps: ["Io.github.cboxdoerfer.FSearch"],
                launch: { "Io.github.cboxdoerfer.FSearch": "fsearch" },
                extra: ["select_all_fsearch"],
                toggle_if_current: false
            },
            "3": {
                apps: ["VSCodium"],
                launch: { "VSCodium": "codium --reuse-window" },
                extra: [],
                toggle_if_current: false
            },
            "4": {
                apps: ["firefox-esr", "Chromium", "Epiphany", "Tor Browser"],
                launch: {
                    "firefox-esr": "firefox",
                    "Chromium": "chromium",
                    "Epiphany": "epiphany",
                    "Tor Browser": "tor-browser"
                },
                extra: [],   // maximize_if_single removed - now applies to all workspaces via step 4
                toggle_if_current: true,
                primary_launch: "firefox-esr"
            },
            "5": {
                apps: ["Audacious", "io.github.celluloid_player.Celluloid", "mpv"],
                launch: {
                    "Audacious": "audacious",
                    "io.github.celluloid_player.Celluloid": "celluloid",
                    "mpv": "mpv"
                },
                extra: [],
                toggle_if_current: false
            },
            "6": {
                apps: ["calibre", "Evince", "xchm"],
                launch: {
                    "calibre": "calibre",
                    "Evince": "evince",
                    "xchm": "xchm"
                },
                extra: [],
                toggle_if_current: false
            }
            // Workspace 7 is handled separately below – no config entry needed
        };

        // ---------- Special case: workspace 7 (rearrange only) ----------
        if (workspaceNum === 7) {
            this._rearrangeToWorkspaces(config);
            return;
        }

        // ---------- Normal workspace switching (0‑6) ----------
        const wsConfig = config[String(workspaceNum)];
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
            this._windows.ToggleWindowsCurrentWorkspace();
        } else {
            this._goToWorkspace(workspaceNum);
            for (const wmClass of apps) {
                this._windows.WindowsMoveToGivenWorkspaceGivenWMClass(wmClass, workspaceNum);
            }
        }

        // 3. Launch apps only if the workspace has NO windows at all (any wm_class)
        let windowCount = 0;
        try {
            windowCount = JSON.parse(this._windows.GetWindowCountCurrentWorkspace());
        } catch (e) {
            journal(`Failed to parse window count for workspace ${workspaceNum}: ${e}`, true);
        }

        if (windowCount === 0 && workspaceNum !== 5 && workspaceNum !== 6) {
            let cmd;
            if (primary_launch && launch[primary_launch]) {
                cmd = launch[primary_launch];
            } else if (apps.length > 0 && launch[apps[0]]) {
                cmd = launch[apps[0]];
            }
            if (cmd) {
                GLib.spawn_command_line_async(cmd);
            } else {
                journal(`No launch command for workspace ${workspaceNum}`, true);
            }
        }

        // 4. Maximize/focus single window on the current workspace (applies to all workspaces)
        this._windows.MaximizeWindowIfSingleOnCurrentWorkspace();

        // 5. Activate pinned windows (all workspaces)
        this._tagged.ActivatePinnedWindows();

        // 6. Extra actions
        for (const action of extra) {
            switch (action) {
                case 'select_all_fsearch':
                    this._keyboard.SelectAllFsearchText();
                    break;
                case 'close_duplicate_nemo':
                    this._windows.WindowsCloseDuplicateNemo();
                    break;
                default:
                    journal(`Unknown extra action: ${action}`, true);
            }
        }

        // 7. Focus any uncovered fullscreen window on this workspace
        this._windows.FocusFullscreenWindowOnCurrentWorkspace();
    }

    // ---------- Helper: rearrange windows according to the config ----------
    _rearrangeToWorkspaces(config) {
        // Build a map from WM_CLASS -> workspace number
        const wmClassToWorkspace = {};
        for (const [ws, data] of Object.entries(config)) {
            const wsNum = parseInt(ws);
            for (const wmClass of data.apps) {
                wmClassToWorkspace[wmClass] = wsNum;
            }
        }

        // Step 1: Move each known app window to its configured workspace
        for (const [wmClass, ws] of Object.entries(wmClassToWorkspace)) {
            this._windows.WindowsMoveToGivenWorkspaceGivenWMClass(wmClass, ws);
        }

        // Step 2: Move all other windows (not in the map) to workspace 7
        const allKnownWmClasses = Object.keys(wmClassToWorkspace);
        // Get all windows excluding the known ones
        const otherWindows = this._windows.GetWindowsExcludingGivenWMClass(allKnownWmClasses);
        // Parse JSON result (it returns a JSON string)
        let windowsArray = [];
        try {
            windowsArray = JSON.parse(otherWindows);
        } catch (e) {
            journal(`Failed to parse window list: ${e}`, true);
            return;
        }

        // Move each of these windows to workspace 7
        for (const win of windowsArray) {
            const winId = win.id;
            if (winId !== undefined) {
                this._windows.WindowMoveToGivenWorkspaceGivenWinID(winId, 7);
            }
        }

        journal(`Rearranged windows: moved known apps to their workspaces, others to workspace 7`);
    }

    _goToWorkspace(workspaceNum) {
        const WorkspaceManager = global.get_workspace_manager();
        const current = WorkspaceManager.get_active_workspace();
        const target = WorkspaceManager.get_workspace_by_index(workspaceNum);
        if (target && target.index() !== current.index()) {
            target.activate(global.get_current_time());
        }
    }
}