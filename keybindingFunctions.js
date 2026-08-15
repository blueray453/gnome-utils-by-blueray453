// keybindingFunctions.js
import GLib from 'gi://GLib';
import { journal } from './utils.js';
import * as windowFunctions from './windowFunctions.js';
import * as taggedWindowFunctions from './taggedWindowFunctions.js';
import * as keyboardSimulatorFunctions from './keyboardSimulatorFunctions.js';

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

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Keybinding io.github.blueray453.GnomeUtils.Keybinding.SwitchToWorkspace uint32:2
    SwitchToWorkspace(workspaceNum) {
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
                extra: ["maximize_if_single"],
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
        };

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

        // 2. If toggle_if_current and we are already on this workspace, toggle windows
        if (toggle_if_current && currentIndex === workspaceNum) {
            this._windows.ToggleWindowsCurrentWorkspace();
        } else {
            // Otherwise switch and move windows
            this._goToWorkspace(workspaceNum);
            for (const wmClass of apps) {
                this._windows.WindowsMoveToGivenWorkspaceGivenWMClass(wmClass, workspaceNum);
            }
        }

        // 3. Launch apps if none are running
        let anyRunning = false;
        for (const wmClass of apps) {
            const isRunning = this._windows.GetAppsRunningGivenWMClass(wmClass);
            if (isRunning === 'true') {
                anyRunning = true;
                break;
            }
        }

        if (!anyRunning) {
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

        // 4. Activate pinned windows – now called for ALL workspaces
        this._tagged.ActivatePinnedWindows();

        // 5. Extra workspace‑specific actions
        for (const action of extra) {
            switch (action) {
                case 'maximize_if_single':
                    this._windows.MaximizeWindowIfSingleOnCurrentWorkspace();
                    break;
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