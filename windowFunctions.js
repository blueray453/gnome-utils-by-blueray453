import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { journal } from './utils.js'

const AppSystem = global.get_app_system();
const Display = global.get_display();
const WindowTracker = global.get_window_tracker();
const WorkspaceManager = global.get_workspace_manager();

const FSEARCH = "Io.github.cboxdoerfer.FSearch";
const VSCODIUM = "VSCodium";
const FIREFOX = "firefox-esr";
const NEMO = "Nemo";
const ALACRITTY = "Alacritty";

// privamive global variables can not be passed by reference that is why using objects. Array also work.

let align_windows_state_all_windows = { value: 0 };

// distinguish which functions just return window id and which return details. We can extract id from details. so specific id is not needed

// those functions which have output will output as json error

export const MR_DBUS_IFACE = `
<node>
    <interface name="org.gnome.Shell.Extensions.GnomeUtilsWindows">
        <method name="AlignWindowsOfFocusedWindowWMClass">
        </method>
        <method name="CloseOtherWindowsCurrentWorkspaceOfFocusedWindowWMClass">
        </method>
        <method name="EmitMetaO">
        </method>
        <method name="GetAppFocusedWindow">
            <arg type="s" direction="out" name="app" />
        </method>
        <method name="GetAppGivenAppID">
            <arg type="s" direction="in" name="app_id" />
            <arg type="s" direction="out" name="app" />
        </method>
        <method name="GetAppGivenPID">
            <arg type="u" direction="in" name="pid" />
            <arg type="s" direction="out" name="app" />
        </method>
        <method name="GetAppGivenWindowID">
            <arg type="u" direction="in" name="win_id" />
            <arg type="s" direction="out" name="icon" />
        </method>
        <method name="GetAppGivenWMClass">
            <arg type="s" direction="in" name="wm_class" />
            <arg type="s" direction="out" name="windows" />
        </method>
        <method name="GetAppsRunning">
            <arg type="s" direction="out" name="app" />
        </method>
        <method name="GetAppsRunningGivenWMClass">
            <arg type="s" direction="in" name="wm_class" />
            <arg type="s" direction="out" name="is_running" />
        </method>
        <method name="GetWindowFocused">
            <arg type="s" direction="out" name="win" />
        </method>
        <method name="GetWindowGivenWindowID">
            <arg type="u" direction="in" name="win_id" />
            <arg type="s" direction="out" name="win" />
        </method>
        <method name="GetWindows">
            <arg type="s" direction="out" name="win" />
        </method>
        <method name="GetWindowsCurrentWorkspace">
            <arg type="s" direction="out" name="win" />
        </method>
        <method name="GetWindowsCurrentWorkspaceCurrentMonitor">
            <arg type="s" direction="out" name="win" />
        </method>
        <method name="GetWindowsCurrentWorkspaceOfFocusedWindowWMClass">
            <arg type="s" direction="out" name="win" />
        </method>
        <method name="GetWindowsExcludingGivenWMClass">
            <arg type="as" direction="in" name="wm_classes" />
            <arg type="s" direction="out" name="win" />
        </method>
        <method name="GetWindowsForRofi">
            <arg type="s" direction="out" name="win" />
        </method>
        <method name="GetWindowsGivenWMClass">
            <arg type="s" direction="in" name="wm_class" />
            <arg type="s" direction="out" name="wins" />
        </method>
        <method name="ToggleLookingGlass">
        </method>
        <method name="MinimizeOtherWindowsOfFocusedWindowWMClass">
        </method>
        <method name="WindowActivateGivenWinID">
            <arg type="u" direction="in" name="win_id" />
        </method>
        <method name="WindowCloseGivenWinID">
            <arg type="u" direction="in" name="win_id" />
        </method>
        <method name="WindowFullScreenGivenWinID">
            <arg type="u" direction="in" name="win_id" />
        </method>
        <method name="WindowMaximizeGivenWinID">
            <arg type="u" direction="in" name="win_id" />
        </method>
        <method name="WindowMinimizeGivenWinID">
            <arg type="u" direction="in" name="win_id" />
        </method>
        <method name="WindowMoveGivenWinID">
            <arg type="u" direction="in" name="win_id" />
            <arg type="u" direction="in" name="x" />
            <arg type="u" direction="in" name="y" />
        </method>
        <method name="WindowMoveResizeGivenWinID">
            <arg type="u" direction="in" name="win_id" />
            <arg type="u" direction="in" name="x" />
            <arg type="u" direction="in" name="y" />
            <arg type="u" direction="in" name="width" />
            <arg type="u" direction="in" name="height" />
        </method>
        <method name="WindowMoveToCurrentWorkspace">
            <arg type="u" direction="in" name="win_id" />
        </method>
        <method name="WindowMoveToExcludingGivenWMClasses">
            <arg type="as" direction="in" name="wm_classes" />
            <arg type="u" direction="in" name="workspace_num" />
        </method>
        <method name="WindowMoveToGivenWorkspaceGivenWinID">
            <arg type="u" direction="in" name="win_id" />
            <arg type="u" direction="in" name="workspace_num" />
        </method>
        <method name="WindowRaiseGivenWinID">
            <arg type="u" direction="in" name="win_id" />
        </method>
        <method name="WindowResizeGivenWinID">
            <arg type="u" direction="in" name="win_id" />
            <arg type="u" direction="in" name="width" />
            <arg type="u" direction="in" name="height" />
        </method>
        <method name="WindowsActivateGivenWMClass">
            <arg type="s" direction="in" name="wm_class" />
        </method>
        <method name="WindowsCloseDuplicateNemo">
        </method>
        <method name="WindowsMoveSideBySide">
            <arg type="u" direction="in" name="win_id_1" />
            <arg type="u" direction="in" name="win_id_2" />
        </method>
        <method name="WindowsMoveToGivenWorkspaceGivenWMClass">
            <arg type="s" direction="in" name="wm_class" />
            <arg type="u" direction="in" name="workspace_num" />
        </method>
        <method name="WindowUnmaximizeGivenWinID">
            <arg type="u" direction="in" name="win_id" />
        </method>
        <method name="WindowUnminimizeGivenWinID">
            <arg type="u" direction="in" name="win_id" />
        </method>
    </interface>
</node>`;

export class WindowFunctions {

    /* Get Properties */

    _get_properties_brief_given_app_id = function (app_id) {
        let shell_apps = AppSystem.lookup_app(app_id);
        let desktop_apps = shell_apps.get_app_info();

        // NOTE: GioUnix.DesktopAppInfo inherited Gio.AppInfo
        // get_display_name is a function of AppInfo which is DesktopAppInfo inherited

        // console.log(" app windows : " + shell_apps.get_windows());

        let windows_array = [];

        shell_apps.get_windows().forEach(function (w) {
            // console.log("window id : " + w.get_id());
            windows_array.push(w.get_id());
        })

        if (app_id) {
            return {
                app_name: desktop_apps.get_name(),
                app_file_name: desktop_apps.get_filename(),
                app_display_name: desktop_apps.get_display_name(),
                app_id: desktop_apps.get_id(),
                wm_class: desktop_apps.get_startup_wm_class(),
                app_pids: shell_apps.get_pids(),
                app_icon: shell_apps.get_icon()?.to_string(),
                app_windows_number: shell_apps.get_n_windows(),
                app_windows: windows_array,
                state: shell_apps.get_state(),
                description: shell_apps.get_description(),
                commandline: desktop_apps.get_commandline(),
                executable: desktop_apps.get_executable(),
            };
        } else {
            throw new Error('Not found');
        }
    }

    _get_properties_brief_given_meta_window = function (win) {
        // let is_sticky = !win.is_skip_taskbar() && win.is_on_all_workspaces();
        // let tileMatchId = win.get_tile_match() ? win.get_tile_match().get_id() : null;

        // let app = this._get_app_given_meta_window(win);
        // let icon = app.get_icon().to_string();

        let workspace_id = win.get_workspace().index();

        return {
            id: win.get_id(),
            title: win.get_title(),
            pid: win.get_pid(),
            wm_class: win.get_wm_class(),
            wm_class_instance: win.get_wm_class_instance(),
            workspace_id: workspace_id,
            workspace_name: Meta.prefs_get_workspace_name(workspace_id),
            monitor: win.get_monitor()
        };
    }

    /* Get Normal Windows */

    /*
       There is a difference between _get_normal_window and _get_normal_windows

       _get_normal_window use find
       _get_normal_windows use filter

       find returns first element of the array that satisfies the condition specified in the callback function.
       filter returns all the elements of the array that satisfy the condition specified in the callback function.
    */

    // Meta.Display
    // get_current_monitor()
    // get_n_monitors()
    // Meta.Workspace
    // get_work_area_all_monitors()
    // get_work_area_for_monitor(which_monitor)
    // Meta.Window
    // get_work_area_all_monitors()
    // get_work_area_for_monitor(which_monitor)
    // get_work_area_current_monitor()

    _get_normal_windows() {
        // let wins = Display.get_tab_list(Meta.TabList.NORMAL, null).sort((a, b) => a.get_id() - b.get_id());

        let wins = global.get_window_actors().map(actor => actor.meta_window).filter(win => win.get_window_type() === Meta.WindowType.NORMAL).sort((a, b) => a.get_stable_sequence() - b.get_stable_sequence()); // ascending order

        return wins;
    }

    _get_normal_windows_current_workspace = function () {
        let current_workspace = WorkspaceManager.get_active_workspace();

        // let wins = Display.get_tab_list(Meta.TabList.NORMAL, current_workspace).sort((a, b) => a.get_id() - b.get_id());

        let wins = this._get_normal_windows().filter(win =>
            win.is_on_all_workspaces() || win.get_workspace() === current_workspace
            );

        return wins;
    }

    _get_normal_windows_current_workspace_current_monitor = function () {
        // Get the current monitor (in focus)
        let current_monitor = Display.get_current_monitor();

        // Filter windows based on both workspace and monitor
        let wins = this._get_normal_windows_current_workspace().filter(w => w.get_monitor() === current_monitor);

        return wins;
    }

    _get_normal_windows_current_workspace_of_focused_window_wm_class = function () {
        let win = Display.get_focus_window();
        let win_wm_class = win.get_wm_class();

        return this._get_normal_windows_current_workspace_given_wm_class(win_wm_class);
    }

    _get_normal_windows_current_workspace_given_wm_class = function (wm_class) {
        return this._get_normal_windows_current_workspace().filter(w => w.get_wm_class() == wm_class);
    }

    _get_normal_windows_excluding_given_wm_classes(wm_classes) {
        return this._get_normal_windows().filter(w => !wm_classes.includes(w.get_wm_class()))
    }

    _get_normal_window_given_window_id = function (win_id) {
        // find does not need filtered window. As it return one result. However keeping it for readability
        let win = this._get_normal_windows().find(w => w?.get_id() == win_id);
        return win ?? null;
    }

    _get_normal_windows_given_wm_class = function (wm_class) {
        return this._get_normal_windows().filter(w => w.get_wm_class() == wm_class);
    }

    _get_other_normal_windows_current_workspace_of_focused_window_wm_class = function () {
        let win = Display.get_focus_window();
        return this._get_normal_windows_current_workspace_given_wm_class(win.get_wm_class()).filter(w => win != w);
    }

    /* Utility Functions */

    _align_windows = function (windows_array, windows_per_container, global_object) {

        // remove windows from windows_array that do not have a minimize() method
        // This is just to check these are valid windows
        // windows_array = windows_array.filter(win => typeof win.minimize === 'function');

        let number_of_windows = windows_array.length;
        let number_of_states = Math.ceil(number_of_windows / windows_per_container);

        let state = global_object.value;

        // console.log(`state : ${state}`);

        if (state >= number_of_states) {
            state = 0;
        }

        let current_workspace = WorkspaceManager.get_active_workspace();
        // let monitor = this._get_current_monitor();
        // let work_area = current_workspace.get_work_area_for_monitor(monitor);
        let work_area = current_workspace.get_work_area_all_monitors();
        // let work_area = windows_array[0].get_work_area_current_monitor();
        let work_area_width = work_area.width;
        let work_area_height = work_area.height;

        let window_height = work_area_height;
        let window_width = work_area_width / windows_per_container;

        let all_x = [];

        for (let n = 0; n < windows_per_container; n++) {
            all_x[n] = window_width * n;
        }

        // minimize all the windows
        windows_array.forEach(win => win?.minimize());

        for (let i = state * windows_per_container, j = 0; i < windows_array.length && j < windows_per_container; i++, j++) {
            let win = windows_array[i];

            this._move_resize_window(win, all_x[j], 0, window_width, window_height);

            win.activate(0);
        }

        global_object.value = state + 1;
    }

    _get_app_given_meta_window = function (win) {
        let app = WindowTracker.get_window_app(win);
        return app;
    }

    _make_window_movable_and_resizable = function (window) {

        if (window.fullscreen) {
            window.unmake_fullscreen();
        }

        if (window.maximized_horizontally) {
            window.unmaximize(1);
        }

        if (window.maximized_vertically) {
            window.unmaximize(2);
        }
    }

    // _log_object_details = function (string, obj) {
    //     console.log(`${string}`);
    //     console.log(`=====`);
    //     console.log(`Type: ${typeof obj}`);
    //     console.log(`Constructor name: ${obj.constructor.name}`);
    //     let proto = Object.getPrototypeOf(obj);
    //     while (proto) {
    //         console.log(`Prototype: ${proto.constructor.name}`);
    //         proto = Object.getPrototypeOf(proto);
    //     }
    // }

    _move_resize_window = function (meta_window, x_coordinate, y_coordinate, width, height) {

        this._make_window_movable_and_resizable(meta_window);

        // let metaWindowActor = meta_window.get_compositor_private();

        // let id = metaWindowActor.connect('first-frame', _ => {
        //     meta_window.move_resize_frame(1, x_coordinate, y_coordinate, width, height);
        //     metaWindowActor.disconnect(id);
        // });

        let windowReadyId = 0;

        windowReadyId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            // stuff
            meta_window.move_resize_frame(1, x_coordinate, y_coordinate, width, height);
            journal(`Alhamdulillah, moved meta_window`);
            // before returning GLib.SOURCE_REMOVE, zero out the id
            windowReadyId = 0
            return GLib.SOURCE_REMOVE;
        });

        meta_window.connect('unmanaging', () => {
            if (windowReadyId)
                GLib.Source.remove(windowReadyId);
        });

        // GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
        //     win.move_resize_frame(1, x_coordinate, y_coordinate, width, height);
        //     return GLib.SOURCE_REMOVE;
        // });

    }

    _move_windows_side_by_side = function (win_id_1, win_id_2) {

        let win1 = this._get_normal_window_given_window_id(win_id_1);
        let win2 = this._get_normal_window_given_window_id(win_id_2);

        if (win1 !== null && win2 !== null) {
            let work_area = win1.get_work_area_current_monitor();

            //check if both are in current workspace
            //check if both are in same monitor

            let work_area_width = work_area.width;
            let work_area_height = work_area.height;

            let window_height = work_area_height;
            let window_width = work_area_width / 2;

            this._move_resize_window(win1, 0, 0, window_width, window_height);
            this._move_resize_window(win2, window_width, 0, window_width, window_height);
        }
    }

    _move_windows_to_given_workspace_given_wm_class(wm_class, workspace_num) {
        let wins = this._get_normal_windows_given_wm_class(wm_class);

        wins.forEach(win => {
            const currentIndex = win.get_workspace().index?.() ?? workspace_num;
            if (currentIndex !== workspace_num) {
                win.change_workspace_by_index(workspace_num, false);
            }
        });
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.AlignWindowsOfFocusedWindowWMClass | jq .

    AlignWindowsOfFocusedWindowWMClass() {
        let windows_array = this._get_normal_windows_current_workspace_of_focused_window_wm_class();

        if (windows_array.length === 0) {
            windows_array = this._get_normal_windows_current_workspace_given_wm_class(NEMO);
        }

        let windows_per_container = 2;

        this._align_windows(windows_array, windows_per_container, align_windows_state_all_windows);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.EmitMetaO

    EmitMetaO() {
        // let wins = this._get_normal_windows_given_wm_class(VSCODIUM);

        // // Focus VS Code window
        // wins.forEach(win => {
        //     let win_workspace = win.get_workspace();
        //     win_workspace.activate_with_focus(win, 0);
        // });

        // Schema for custom keybindings
        const settings = new Gio.Settings({ schema: 'org.gnome.settings-daemon.plugins.media-keys' });
        const customListKey = 'custom-keybindings';
        let customList = settings.get_strv(customListKey);

        // Find the index of our custom binding path
        const customPath = '/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom11/';
        const index = customList.indexOf(customPath);

        if (index !== -1) {
            // Temporarily remove it from the list
            const newList = customList.slice();
            newList.splice(index, 1);
            settings.set_strv(customListKey, newList);
        }

        // Delay to ensure VS Code window is focused
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
            const VirtualKeyboard = Clutter.get_default_backend()
                .get_default_seat()
                .create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);

            const eventTime = Clutter.get_current_event_time() * 1000;

            // Release stuck modifiers
            const stuckModifiers = [
                Clutter.KEY_Shift_L, Clutter.KEY_Shift_R,
                Clutter.KEY_Control_L, Clutter.KEY_Control_R,
                Clutter.KEY_Alt_L, Clutter.KEY_Alt_R,
                Clutter.KEY_Super_L, Clutter.KEY_Super_R
            ];
            stuckModifiers.forEach(key => {
                VirtualKeyboard.notify_keyval(eventTime, key, Clutter.KeyState.RELEASED);
            });

            // Press Meta+O
            VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_Super_L, Clutter.KeyState.PRESSED);
            VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_o, Clutter.KeyState.PRESSED);
            VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_o, Clutter.KeyState.RELEASED);
            VirtualKeyboard.notify_keyval(eventTime, Clutter.KEY_Super_L, Clutter.KeyState.RELEASED);

            // Restore the custom keybinding in the list
            if (index !== -1) {
                const restoredList = settings.get_strv(customListKey).slice();
                restoredList.splice(index, 0, customPath);
                settings.set_strv(customListKey, restoredList);
            }

            return GLib.SOURCE_REMOVE;
        });
    }


    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.CloseOtherWindowsCurrentWorkspaceOfFocusedWindowWMClass

    CloseOtherWindowsCurrentWorkspaceOfFocusedWindowWMClass() {

        let wins = this._get_other_normal_windows_current_workspace_of_focused_window_wm_class();

        wins.forEach(function (w) {

            // if (markedWindows.includes(w.get_id())) {
            //     return; // Skip this window if it's in the donotdelwindows array
            // }

            if (w.get_wm_class_instance() == 'file_progress') {
                return; // Skip this window if it's a 'file_progress' instance
            }

            w.delete(0);
        })
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetAppFocusedWindow | jq .

    GetAppFocusedWindow() {
        let app = WindowTracker.get_focus_app();
        return JSON.stringify(this._get_properties_brief_given_app_id(app.get_id()));
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetAppGivenAppID string:"io.github.cboxdoerfer.FSearch.desktop" | jq .

    GetAppGivenAppID(app_id) {
        return JSON.stringify(this._get_properties_brief_given_app_id(app_id));
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetAppGivenPID uint32:3931313482 | jq .

    GetAppGivenPID(pid) {
        let app = WindowTracker.get_app_from_pid(pid);
        return JSON.stringify(this._get_properties_brief_given_app_id(app.get_id()));
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetAppGivenWindowID uint32:44129093 | jq .

    GetAppGivenWindowID(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);
        let app = WindowTracker.get_window_app(win.meta_window);
        return JSON.stringify(this._get_properties_brief_given_app_id(app.get_id()));
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetAppGivenWMClass string:"firefox-esr" | jq

    GetAppGivenWMClass(wmclass) {
        let app = AppSystem.lookup_desktop_wmclass(wmclass);
        return JSON.stringify(this._get_properties_brief_given_app_id(app.get_id()));
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetAppsRunning | jq .

    GetAppsRunning() {
        let apps = AppSystem.get_running();
        let results = [];

        apps.forEach(app => {
            let app_id = app.get_id();
            try {
                let info = this._get_properties_brief_given_app_id(app_id);
                results.push(info);
            } catch (err) {
                results.push({ app_id, error: err.message });
            }
        });

        return JSON.stringify(results);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetAppsRunningGivenWMClass string:"firefox-esr" | xargs

    GetAppsRunningGivenWMClass(wm_class) {
        // let app = AppSystem.lookup_desktop_wmclass(wm_class);
        // if (!app) {
        //     return JSON.stringify(0); // app not found → 0 windows
        // }
        // else{
        //     return JSON.stringify(app.get_n_windows());  // returns integer
        // }
        let wins = this._get_normal_windows_given_wm_class(wm_class);
        return JSON.stringify(wins.length > 0);
        // return JSON.stringify(wins.length);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindowFocused | jq -r '.[].id'

    GetWindowFocused() {
        let win = Display.get_focus_window();
        let winPropertiesArr = this._get_properties_brief_given_meta_window(win);

        return JSON.stringify(winPropertiesArr);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindowGivenWindowID uint32:44129093

    GetWindowGivenWindowID(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);

        return JSON.stringify(this._get_properties_brief_given_meta_window(win));
    }

    //  dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindows | jq .

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindows | jq -r '.[].id'

    GetWindows() {
        let wins = this._get_normal_windows();

        // Map each window to its properties
        let winPropertiesArr = wins.map(win => this._get_properties_brief_given_meta_window(win));

        return JSON.stringify(winPropertiesArr);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindowsCurrentWorkspace | jq .

    GetWindowsCurrentWorkspace() {
        let wins = this._get_normal_windows_current_workspace();

        // Map each window to its properties
        let winPropertiesArr = wins.map(win => this._get_properties_brief_given_meta_window(win));

        return JSON.stringify(winPropertiesArr);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindowsCurrentWorkspaceCurrentMonitor | jq .

    GetWindowsCurrentWorkspaceCurrentMonitor() {
        let wins = this._get_normal_windows_current_workspace_current_monitor();

        // Map each window to its properties
        let winPropertiesArr = wins.map(win => this._get_properties_brief_given_meta_window(win));

        return JSON.stringify(winPropertiesArr);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindowsCurrentWorkspaceOfFocusedWindowWMClass | jq .

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindowsCurrentWorkspaceOfFocusedWindowWMClass | jq -r '.[].id'

    GetWindowsCurrentWorkspaceOfFocusedWindowWMClass() {
        let wins = this._get_normal_windows_current_workspace_of_focused_window_wm_class();

        // Map each window to its properties
        let winPropertiesArr = wins.map(win => this._get_properties_brief_given_meta_window(win));

        return JSON.stringify(winPropertiesArr);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindowsExcludingGivenWMClass array:string:"Io.github.cboxdoerfer.FSearch","VSCodium","firefox-esr","Nemo","Alacritty" | jq .

    GetWindowsExcludingGivenWMClass(wm_classes) {
        let wins = this._get_normal_windows_excluding_given_wm_classes(wm_classes);

        // Map each window to its properties
        let winPropertiesArr = wins.map(win => this._get_properties_brief_given_meta_window(win));

        return JSON.stringify(winPropertiesArr);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindowsForRofi | jq .

    GetWindowsForRofi() {
        let wins = this._get_normal_windows();

        const classOrder = {
            [FSEARCH]: 1,
            [VSCODIUM]: 2,
            [FIREFOX]: 3,
            [NEMO]: 4,
            [ALACRITTY]: 5,
        };

        wins.sort((winA, winB) => {
            let orderA = classOrder[winA.wm_class] || Number.MAX_SAFE_INTEGER;
            let orderB = classOrder[winB.wm_class] || Number.MAX_SAFE_INTEGER;

            // If both windows belong to the same class, sort
            if (orderA === orderB) {
                let userTimeA = winA.get_stable_sequence();
                let userTimeB = winB.get_stable_sequence();
                return userTimeB - userTimeA; // Sort in descending order of user time
            }

            return orderA - orderB;
        });

        // Map each window to its properties
        let winPropertiesArr = wins.map(win => this._get_properties_brief_given_meta_window(win));

        return JSON.stringify(winPropertiesArr);
    }

    //  dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindowsGivenWMClass string:"firefox-esr" | jq -r '.[].id'

    GetWindowsGivenWMClass(wm_class) {
        let wins = this._get_normal_windows_given_wm_class(wm_class);

        // Map each window to its properties
        let winPropertiesArr = wins.map(win => this._get_properties_brief_given_meta_window(win));

        return JSON.stringify(winPropertiesArr);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.ToggleLookingGlass

    ToggleLookingGlass(){
        if (Main.lookingGlass === null){
            Main.createLookingGlass();
        }
        Main.lookingGlass.toggle();
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MinimizeOtherWindowsOfFocusedWindowWMClass

    MinimizeOtherWindowsOfFocusedWindowWMClass() {
        let wins = this._get_other_normal_windows_current_workspace_of_focused_window_wm_class();
        wins.map(w => w.minimize());
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.WindowActivateGivenWinID uint32:44129093

    WindowActivateGivenWinID(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);
        if (win !== null) {
            let win_workspace = win.get_workspace();
            // Here global.get_current_time() instead of 0 will also work
            win_workspace.activate_with_focus(win, 0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.WindowCloseGivenWinID uint32:44129093

    WindowCloseGivenWinID(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);
        // win.get_compositor_private().destroy();

        if (win !== null) {
            win.delete(0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.WindowFullScreenGivenWinID uint32:44129093

    WindowFullScreenGivenWinID(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);

        if (win !== null) {
            let win_workspace = win.get_workspace();
            win.maximize(3);
            win_workspace.activate_with_focus(win, 0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.WindowMaximizeGivenWinID uint32:3931313482

    WindowMaximizeGivenWinID(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);

        if (win !== null) {
            if (win.minimized) {
                win.unminimize();
            }

            win.maximize(3);
            win.activate(0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.WindowMinimizeGivenWinID uint32:3931313482

    WindowMinimizeGivenWinID(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);
        if (win !== null) {
            win.minimize();
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.WindowMoveGivenWinID uint32:44129093 uint32:100 uint32:200

    WindowMoveGivenWinID(win_id, x, y) {
        let win = this._get_normal_window_given_window_id(win_id);
        if (win !== null) {
            this._make_window_movable_and_resizable(win);
            win.move_frame(1, x, y);
            win.activate(0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.WindowMoveResizeGivenWinID uint32:44129093 uint32:0 uint32:0 uint32:0 uint32:0

    WindowMoveResizeGivenWinID(win_id, x, y, width, height) {
        let win = this._get_normal_window_given_window_id(win_id);

        if (win !== null) {
            this._move_resize_window(win, x, y, width, height);

            win.activate(0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.WindowMoveToCurrentWorkspace uint32:44129093

    WindowMoveToCurrentWorkspace(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);

        if (win !== null) {
            let current_workspace = WorkspaceManager.get_active_workspace();
            win.change_workspace(current_workspace);
            // current_workspace.activate_with_focus(win, 0);
        }
    }

    //  dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.WindowMoveToExcludingGivenWMClasses array:string:"Io.github.cboxdoerfer.FSearch","VSCodium","firefox-esr","Nemo","Alacritty" uint32:7

    WindowMoveToExcludingGivenWMClasses(wm_classes, workspace_num) {
        let wins = this._get_normal_windows_excluding_given_wm_classes(wm_classes);
        wins.forEach(win => {
            if (win !== null) {
                win.change_workspace_by_index(workspace_num, false);
            }
        });
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.WindowMoveToGivenWorkspaceGivenWinID uint32:44129093 uint32:0

    WindowMoveToGivenWorkspaceGivenWinID(win_id, workspace_num) {
        let win = this._get_normal_window_given_window_id(win_id);

        if (win !== null) {
            win.change_workspace_by_index(workspace_num, false);
            // current_workspace.activate_with_focus(win, 0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.WindowRaiseGivenWinID uint32:44129093

    WindowRaiseGivenWinID(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);
        if (win !== null) {
            win.raise();
            win.raise_and_make_recent();
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.WindowResizeGivenWinID uint32:44129093 uint32:800 uint32:600

    WindowResizeGivenWinID(win_id, width, height) {
        let win = this._get_normal_window_given_window_id(win_id);
        if (win !== null) {
            this._move_resize_window(win, win.get_x(), win.get_y(), width, height);
            win.activate(0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.WindowsActivateGivenWMClass string:"firefox-esr"

    WindowsActivateGivenWMClass(wm_class) {
        let wins = this._get_normal_windows_given_wm_class(wm_class);

        wins.forEach(win => {
            let win_workspace = win.get_workspace();
            // Here global.get_current_time() instead of 0 will also work
            win_workspace.activate_with_focus(win, 0);
        });
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.WindowsCloseDuplicateNemo

    WindowsCloseDuplicateNemo() {
        let wins = this._get_normal_windows_current_workspace_given_wm_class(NEMO);
        let seen = {};
        wins.forEach(win => {
            let key = win.get_title();
            if (!seen[key]) {
                seen[key] = win;
            } else {
                if (win.get_user_time() < seen[key].get_user_time()) {
                    win.delete(0);
                } else {
                    seen[key].delete(0);
                    seen[key] = win;
                }
            }
        });
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.WindowsMoveSideBySide uint32:win_id_1 uint32:win_id_2

    WindowsMoveSideBySide(win_id_1, win_id_2) {
        this._move_windows_side_by_side(win_id_1, win_id_2);
    }

    //  dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.WindowsMoveToGivenWorkspaceGivenWMClass string:"firefox-esr" uint32:0

    // "Alacritty" "firefox-esr" "io.github.cboxdoerfer.FSearch" "Nemo"

    WindowsMoveToGivenWorkspaceGivenWMClass(wm_class, workspace_num) {
        this._move_windows_to_given_workspace_given_wm_class(wm_class, workspace_num);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.WindowUnmaximizeGivenWinID uint32:44129093

    WindowUnmaximizeGivenWinID(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);

        if (win !== null) {
            this._make_window_movable_and_resizable(win);
            win.unmaximize(3);
            win.activate(0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.WindowUnminimizeGivenWinID uint32:44129093

    WindowUnminimizeGivenWinID(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);
        if (win !== null) {
            if (win.minimized) {
                win.unminimize();
            }
        }
    }
}