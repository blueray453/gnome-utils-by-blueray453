const { Gio, GLib, Meta, Shell } = imports.gi;

// I think Gio, Shell are unused

const Display = global.get_display();

// const WorkspaceManager = global.get_workspace_manager();
const WorkspaceManager = Display.get_workspace_manager();

// privamive global variables can not be passed by reference that is why using objects. Array also work.
let align_windows_state_nemo = { value: 0 };
let align_windows_state_all_windows = { value: 0 };

// distinguish which functions just return window id and which return details. We can extract id from details. so specific id is not needed

// those functions which have output will output as json error

var MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsWindows">
      <method name="Activate">
         <arg type="u" direction="in" name="win_id" />
      </method>
      <method name="ActivateWindowsGivenWMClass">
        <arg type="s" direction="in" name="wm_class" />
      </method>
      <method name="AlignNemoWindows">
      </method>
      <method name="AlignWindowsOfFocusedWindowWMClass">
      </method>
      <method name="Close">
         <arg type="u" direction="in" name="win_id" />
      </method>
      <method name="CloseDuplicateNemoWindows">
      </method>
      <method name="CloseOtherWindowsCurrentWorkspaceOfFocusedWindowWMClass">
      </method>
      <method name="FullScreen">
         <arg type="u" direction="in" name="win_id" />
      </method>
      <method name="GetWindows">
         <arg type="s" direction="out" name="win" />
      </method>
      <method name="GetWindowDetailsGivenWindowID">
         <arg type="u" direction="in" name="win_id" />
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
      <method name="GetWindowFocused">
        <arg type="s" direction="out" name="win" />
      </method>
      <method name="GetWindowsGivenWMClass">
        <arg type="s" direction="in" name="wm_class" />
        <arg type="s" direction="out" name="windows" />
      </method>
      <method name="Maximize">
         <arg type="u" direction="in" name="win_id" />
      </method>
      <method name="Minimize">
         <arg type="u" direction="in" name="win_id" />
      </method>
      <method name="MinimizeOtherWindowsOfFocusedWindowWMClass">
      </method>
      <method name="Move">
         <arg type="u" direction="in" name="win_id" />
         <arg type="i" direction="in" name="x" />
         <arg type="i" direction="in" name="y" />
      </method>
      <method name="MoveWindowsToCurrentWorkspaceGivenWMClass">
         <arg type="s" direction="in" name="wm_class" />
      </method>
      <method name="MoveResize">
         <arg type="u" direction="in" name="win_id" />
         <arg type="i" direction="in" name="x" />
         <arg type="i" direction="in" name="y" />
         <arg type="i" direction="in" name="width" />
         <arg type="i" direction="in" name="height" />
      </method>
      <method name="MoveWindowsSideBySide">
         <arg type="u" direction="in" name="win_id_1" />
         <arg type="u" direction="in" name="win_id_2" />
      </method>
      <method name="MoveWindowToCurrentWorkspace">
         <arg type="u" direction="in" name="win_id" />
      </method>
      <method name="MoveWindowsToGivenWorkspaceGivenWMClass">
      <arg type="s" direction="in" name="wm_class" />
         <arg type="i" direction="in" name="workspace_num" />
      </method>
      <method name="MoveWindowToGivenWorkspace">
         <arg type="u" direction="in" name="win_id" />
         <arg type="i" direction="in" name="workspace_num" />
      </method>
      <method name="Raise">
         <arg type="u" direction="in" name="win_id" />
      </method>
      <method name="Resize">
         <arg type="u" direction="in" name="win_id" />
         <arg type="i" direction="in" name="width" />
         <arg type="i" direction="in" name="height" />
      </method>
      <method name="Unmaximize">
         <arg type="u" direction="in" name="win_id" />
      </method>
      <method name="Unminimize">
         <arg type="u" direction="in" name="win_id" />
      </method>
      <method name="UnMinimizeOtherWindowsOfFocusedWindowWMClass">
      </method>
   </interface>
</node>`;

var WindowFunctions = class WindowFunctions {

    /* Get Properties */

    _get_properties_brief_given_meta_window = function (win) {
        // let is_sticky = !win.is_skip_taskbar() && win.is_on_all_workspaces();
        // let tileMatchId = win.get_tile_match() ? win.get_tile_match().get_id() : null;

        let app = this._get_app_given_meta_window(win);
        let icon = app.get_icon().to_string();

        let workspace_id = win.get_workspace().index();

        return {
            id: win.get_id(),
            title: win.get_title(),
            pid: win.get_pid(),
            wm_class: win.get_wm_class(),
            wm_class_instance: win.get_wm_class_instance(),
            workspace_id: workspace_id,
            workspace_name: Meta.prefs_get_workspace_name(workspace_id),
            monitor: win.get_monitor(),
            icon: icon
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

    _get_normal_windows = function () {
        // can also sort by get_user_time()
        let wins = Display.get_tab_list(Meta.TabList.NORMAL, null).sort((a, b) => a.get_id() - b.get_id());
        return wins;
    }

    _get_normal_focused_window = function () {
        // More direct method if available in your GNOME version
        return Display.get_tab_list(Meta.TabList.NORMAL, null)
            .find(win => win.has_focus()) || null;
    };

    _get_normal_windows_current_workspace = function () {
        let current_workspace = WorkspaceManager.get_active_workspace();
        // let wins = Display.get_tab_list(Meta.TabList.NORMAL, current_workspace);
        let wins = Display.get_tab_list(Meta.TabList.NORMAL, current_workspace).sort((a, b) => a.get_id() - b.get_id());
        return wins;
    }

    _get_normal_windows_current_workspace_current_monitor = function () {
        // Get the active workspace
        let current_workspace = WorkspaceManager.get_active_workspace();

        // Get the current monitor (in focus)
        let current_monitor = Display.get_current_monitor();

        // Filter windows based on both workspace and monitor
        let wins = this._get_normal_windows().filter(w =>
            w.get_workspace() === current_workspace &&
            w.get_monitor() === current_monitor
        );

        return wins;
    }

    _get_normal_windows_current_workspace_of_focused_window_wm_class = function () {
        let win = this._get_normal_focused_window();
        let win_wm_class = win.get_wm_class();

        return this._get_normal_windows_current_workspace_given_wm_class(win_wm_class);
    }

    _get_normal_windows_current_workspace_current_monitor_given_wm_class = function (wm_class) {
        return this._get_normal_windows_current_workspace_current_monitor().filter(w => w.get_wm_class() == wm_class);
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

    _get_other_normal_windows_current_workspace_current_monitor_of_focused_window_wm_class = function () {
        let win = this._get_normal_focused_window();
        return this._get_normal_windows_current_workspace_current_monitor_given_wm_class(win.get_wm_class()).filter(w => win != w);

    }
    _get_other_normal_windows_current_workspace_of_focused_window_wm_class = function () {
        let win = this._get_normal_focused_window();
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

        // log(`state : ${state}`);

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
        // windows_array.forEach(win => win?.minimize() || log(`Win Not Found`));

        for (let i = state * windows_per_container, j = 0; i < windows_array.length && j < windows_per_container; i++, j++) {
            let win = windows_array[i];

            this._move_resize_window(win, all_x[j], 0, window_width, window_height);

            win.activate(0);
        }

        global_object.value = state + 1;
    }

    _move_all_app_windows_to_current_workspace = function (wm_class) {
        let current_workspace_index = WorkspaceManager.get_active_workspace().index();

        this._move_all_app_windows_to_given_workspace(wm_class, current_workspace_index);
    }

    _move_all_app_windows_to_given_workspace = function (wm_class, workspace_num) {
        let windows_array = this._get_normal_windows_given_wm_class(wm_class);
        windows_array.forEach(win => {
            if (win.get_workspace().index() != workspace_num) {
                win.change_workspace_by_index(workspace_num, false);
            }
        });
    }

    _get_app_given_meta_window = function (win) {
        // let tracker = global.get_window_tracker().get_default();
        let tracker = Shell.WindowTracker.get_default();
        let app = tracker.get_window_app(win);
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

    _log_object_details = function (string, obj) {
        log(`${string}`);
        log(`=====`);
        log(`Type: ${typeof obj}`);
        log(`Constructor name: ${obj.constructor.name}`);
        let proto = Object.getPrototypeOf(obj);
        while (proto) {
            log(`Prototype: ${proto.constructor.name}`);
            proto = Object.getPrototypeOf(proto);
        }
    }

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

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.Activate uint32:44129093

    Activate(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);
        if (win !== null){
            let win_workspace = win.get_workspace();
            // Here global.get_current_time() instead of 0 will also work
            win_workspace.activate_with_focus(win, 0);
        }
    }
    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.ActivateWindowsGivenWMClass string:"firefox"

    ActivateWindowsGivenWMClass(wm_class) {
        let wins = this._get_normal_windows_given_wm_class(wm_class);

        wins.forEach(win => {
            let win_workspace = win.get_workspace();
            // Here global.get_current_time() instead of 0 will also work
            win_workspace.activate_with_focus(win, 0);
        });
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.AlignNemoWindows | jq .

    AlignNemoWindows() {
        let windows_array = this._get_normal_windows_current_workspace_given_wm_class("Nemo");
        let windows_per_container = 2;

        this._align_windows(windows_array, windows_per_container, align_windows_state_nemo);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.AlignWindowsOfFocusedWindowWMClass | jq .

    AlignWindowsOfFocusedWindowWMClass() {
        let windows_array = this._get_normal_windows_current_workspace_of_focused_window_wm_class();
        let windows_per_container = 2;

        this._align_windows(windows_array, windows_per_container, align_windows_state_all_windows);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.Close uint32:44129093

    Close(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);
        // win.get_compositor_private().destroy();

        if (win !== null) {
            win.delete(0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.CloseDuplicateNemoWindows

    CloseDuplicateNemoWindows() {
        let wins = this._get_normal_windows_current_workspace_given_wm_class("Nemo");
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

    FullScreen(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);

        if (win !== null) {
            let win_workspace = win.get_workspace();
            win.maximize(3);
            win_workspace.activate_with_focus(win, 0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindowDetailsGivenWindowID uint32:44129093

    GetWindowDetailsGivenWindowID(win_id) {
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

        // try {
        //     let wins = this._get_normal_windows_current_workspace();

        //     // Map each window to its properties
        //     let winPropertiesArr = wins.map(win => this._get_properties_brief_given_meta_window(win));

        //     return JSON.stringify(winPropertiesArr);
        // } catch (error) {
        //     return JSON.stringify({ error: error });
        // }
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

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindowFocused | jq -r '.[].id'

    GetWindowFocused() {
        let win = this._get_normal_focused_window();
        let winPropertiesArr = this._get_properties_brief_given_meta_window(win);

        return JSON.stringify(winPropertiesArr);
    }

    //  dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindowsGivenWMClass string:"firefox" | jq -r '.[].id'

    GetWindowsGivenWMClass(wm_class) {
        let wins = this._get_normal_windows_given_wm_class(wm_class);

        // Map each window to its properties
        let winPropertiesArr = wins.map(win => this._get_properties_brief_given_meta_window(win));

        return JSON.stringify(winPropertiesArr);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindowsForRofi | jq .

    GetWindowsForRofi() {
        let wins = this._get_normal_windows();

        const classOrder = {
            "Fsearch": 1,
            "VSCodium": 2,
            "firefox": 3,
            "Nemo": 4,
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

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.Maximize uint32:3931313482

    Maximize(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);

        if (win !== null) {
            if (win.minimized) {
                win.unminimize();
            }

            win.maximize(3);
            win.activate(0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.Minimize uint32:3931313482

    Minimize(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);
        if (win !== null) {
            win.minimize();
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MinimizeOtherWindowsOfFocusedWindowWMClass

    MinimizeOtherWindowsOfFocusedWindowWMClass() {
        let wins = this._get_other_normal_windows_current_workspace_of_focused_window_wm_class();
        wins.map(w => w.minimize());
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.Move uint32:44129093 int32:100 int32:200

    Move(win_id, x, y) {
        let win = this._get_normal_window_given_window_id(win_id);
        if (win !== null) {
            this._make_window_movable_and_resizable(win);
            win.move_frame(1, x, y);
            win.activate(0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MoveWindowToCurrentWorkspace uint32:44129093

    MoveWindowToCurrentWorkspace(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);

        if (win !== null) {
            let current_workspace = WorkspaceManager.get_active_workspace();
            win.change_workspace(current_workspace);
            // current_workspace.activate_with_focus(win, 0);
        }
    }

    //  dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MoveWindowsToCurrentWorkspaceGivenWMClass string:"firefox"

    // "Alacritty" "firefox" "Fsearch" "Nemo"

    MoveWindowsToCurrentWorkspaceGivenWMClass(wm_class) {
        this._move_all_app_windows_to_current_workspace(wm_class);
    }

    //  dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MoveWindowsToGivenWorkspaceGivenWMClass string:"firefox" int32:0

    // "Alacritty" "firefox" "Fsearch" "Nemo"

    MoveWindowsToGivenWorkspaceGivenWMClass(wm_class, workspace_num) {
        this._move_all_app_windows_to_given_workspace(wm_class, workspace_num);
    }


    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MoveWindowToGivenWorkspace uint32:44129093 int32:0

    MoveWindowToGivenWorkspace(win_id, workspaceNum) {
        let win = this._get_normal_window_given_window_id(win_id);

        if (win !== null) {
            win.change_workspace_by_index(workspaceNum, false);
            // current_workspace.activate_with_focus(win, 0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MoveResize uint32:44129093 int32:0 int32:0 int32:0 int32:0

    MoveResize(win_id, x, y, width, height) {
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

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MoveWindowsSideBySide uint32:win_id_1 uint32:win_id_2

    MoveWindowsSideBySide(win_id_1, win_id_2) {
        this._move_windows_side_by_side(win_id_1, win_id_2);
    }

    Raise(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);
        if (win !== null) {
            win.raise();
            win.raise_and_make_recent();
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.Resize uint32:44129093 int32:800 int32:600

    Resize(win_id, width, height) {
        let win = this._get_normal_window_given_window_id(win_id);
        if (win !== null) {
            this._move_resize_window(win, win.get_x(), win.get_y(), width, height);
            win.activate(0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.Resize uint32:44129093 int32:800 int32:600
    Unmaximize(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);

        if (win !== null) {
            this._make_window_movable_and_resizable(win);

            win.unmaximize(3);
            win.activate(0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.Unminimize uint32:44129093
    Unminimize(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);
        if (win !== null) {
            if (win.minimized) {
                win.unminimize();
            }
        }
    }

    UnMinimizeOtherWindowsOfFocusedWindowWMClass() {
        let wins = this._get_other_normal_windows_current_workspace_of_focused_window_wm_class();

        wins.map(w => {
            w.unminimize();
            w.raise();
        });
    }
}
