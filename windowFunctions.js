import GLib from 'gi://GLib';
import Meta from 'gi://Meta';

const AppSystem = global.get_app_system();
const Display = global.get_display();
const WindowTracker = global.get_window_tracker();
const WorkspaceManager = global.get_workspace_manager();

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
        <method name="GetWindowsForRofi">
            <arg type="s" direction="out" name="win" />
        </method>
        <method name="GetWindowsGivenWMClass">
            <arg type="s" direction="in" name="wm_class" />
            <arg type="s" direction="out" name="wins" />
        </method>
        <method name="MinimizeOtherWindowsOfFocusedWindowWMClass">
        </method>
        <method name="MoveAppWindowsToGivenWorkspaceGivenWMClass">
            <arg type="s" direction="in" name="wm_class" />
            <arg type="i" direction="in" name="workspace_num" />
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
            <arg type="i" direction="in" name="x" />
            <arg type="i" direction="in" name="y" />
        </method>
        <method name="WindowMoveResizeGivenWinID">
            <arg type="u" direction="in" name="win_id" />
            <arg type="i" direction="in" name="x" />
            <arg type="i" direction="in" name="y" />
            <arg type="i" direction="in" name="width" />
            <arg type="i" direction="in" name="height" />
        </method>
        <method name="WindowMoveToCurrentWorkspace">
            <arg type="u" direction="in" name="win_id" />
        </method>
        <method name="WindowMoveToGivenWorkspace">
            <arg type="u" direction="in" name="win_id" />
            <arg type="i" direction="in" name="workspace_num" />
        </method>
        <method name="WindowRaiseGivenWinID">
            <arg type="u" direction="in" name="win_id" />
        </method>
        <method name="WindowResizeGivenWinID">
            <arg type="u" direction="in" name="win_id" />
            <arg type="i" direction="in" name="width" />
            <arg type="i" direction="in" name="height" />
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

        let wins = global.get_window_actors().map(actor => actor.meta_window).filter(win => win.get_window_type() === Meta.WindowType.NORMAL).sort((a, b) => a.get_id() - b.get_id()); // ascending order

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
        const total_windows = windows_array.length;
        const total_states = Math.ceil(total_windows / windows_per_container);

        let state = global_object.value % total_states; // Wrap around automatically

        const workspace = WorkspaceManager.get_active_workspace();
        const work_area = workspace.get_work_area_all_monitors();
        const { width: area_width, height: area_height } = work_area;

        const window_width = area_width / windows_per_container;
        const window_height = area_height;

        // Precompute X positions for each window
        const x_positions = []; // this will hold the X coordinate (left position) for each window

        for (let i = 0; i < windows_per_container; i++) {
            let x = i * window_width;  // each window is placed side by side horizontally
            x_positions.push(x);       // add the computed X position to the array
        }

        // Minimize all windows before rearranging
        for (const win of windows_array) {
            win.minimize();
        }

        // Determine the slice of windows for the current state
        const start_index = state * windows_per_container;
        const visible_windows = windows_array.slice(start_index, start_index + windows_per_container);

        // Position and activate each visible window
        visible_windows.forEach((win, idx) => {
            this._move_resize_window(win, x_positions[idx], 0, window_width, window_height);
            win.activate(0);
        });

        // Move to next state
        global_object.value = state + 1;
    };

    _get_app_given_meta_window = function (win) {
        let app = WindowTracker.get_window_app(win);
        return app;
    }

    _make_window_movable_and_resizable = function (win) {

        if (win.minimized) {
            win.unminimize();
        }

        if (win.maximized_horizontally || win.maximized_vertically) {
            win.unmaximize(3);
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

    _move_resize_window = function (win, x_coordinate, y_coordinate, width, height) {

        this._make_window_movable_and_resizable(win);

        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            win.move_resize_frame(1, x_coordinate, y_coordinate, width, height);
            return GLib.SOURCE_REMOVE;
        });

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

    _move_app_windows_to_workspace(wm_class, workspace_num) {
        const app = AppSystem.lookup_desktop_wmclass(wm_class);
        let windows;
        if (app) {
            // App found using wm_class
            windows = app.get_windows();
        } else {
            // App not found — manually get windows of that wm_class
            windows = this._get_normal_windows_given_wm_class(wm_class);
        }

        windows.forEach(win => {
            if (!win) return;

            const currentIndex = win.get_workspace().index?.() ?? workspace_num;
            if (currentIndex !== workspace_num) {
                win.change_workspace_by_index(workspace_num, false);
            }
        });
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.AlignWindowsOfFocusedWindowWMClass | jq .

    AlignWindowsOfFocusedWindowWMClass() {
        let windows_array = this._get_normal_windows_current_workspace_of_focused_window_wm_class();
        let windows_per_container = 2;

        this._align_windows(windows_array, windows_per_container, align_windows_state_all_windows);
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

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindowsForRofi | jq .

    GetWindowsForRofi() {
        let wins = this._get_normal_windows();

        const classOrder = {
            "io.github.cboxdoerfer.FSearch": 1,
            "VSCodium": 2,
            "firefox-esr": 3,
            "nemo": 4,
            "Alacritty": 5
        };

        wins.sort((winA, winB) => {
            let orderA = classOrder[winA.wm_class] || Number.MAX_SAFE_INTEGER;
            let orderB = classOrder[winB.wm_class] || Number.MAX_SAFE_INTEGER;

            // If both windows belong to the same class, sort based on user time
            if (orderA === orderB) {
                let userTimeA = winA.get_user_time();
                let userTimeB = winB.get_user_time();
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

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MinimizeOtherWindowsOfFocusedWindowWMClass

    MinimizeOtherWindowsOfFocusedWindowWMClass() {
        let wins = this._get_other_normal_windows_current_workspace_of_focused_window_wm_class();
        wins.map(w => w.minimize());
    }

    //  dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MoveAppWindowsToGivenWorkspaceGivenWMClass string:"firefox-esr" int32:0

    // "Alacritty" "firefox-esr" "io.github.cboxdoerfer.FSearch" "nemo"

    MoveAppWindowsToGivenWorkspaceGivenWMClass(wm_class, workspace_num) {
        this._move_app_windows_to_workspace(wm_class, workspace_num);
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

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.WindowMoveGivenWinID uint32:44129093 int32:100 int32:200

    WindowMoveGivenWinID(win_id, x, y) {
        let win = this._get_normal_window_given_window_id(win_id);
        if (win !== null) {
            this._make_window_movable_and_resizable(win);
            win.move_frame(1, x, y);
            win.activate(0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.WindowMoveResizeGivenWinID uint32:44129093 int32:0 int32:0 int32:0 int32:0

    WindowMoveResizeGivenWinID(win_id, x, y, width, height) {
        let win = this._get_normal_window_given_window_id(win_id);

        if (win !== null) {
            this._move_resize_window(win, x, y, width, height);

            // let actor = win.get_compositor_private();
            // let id = actor.connect('first-frame', _ => {
            //     win.move_resize_frame(1, x, y, width, height);
            //     actor.disconnect(id);
            // });

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

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.WindowMoveToGivenWorkspace uint32:44129093 int32:0

    WindowMoveToGivenWorkspace(win_id, workspaceNum) {
        let win = this._get_normal_window_given_window_id(win_id);

        if (win !== null) {
            win.change_workspace_by_index(workspaceNum, false);
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

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.WindowResizeGivenWinID uint32:44129093 int32:800 int32:600

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
        let wins = this._get_normal_windows_current_workspace_given_wm_class("nemo");
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