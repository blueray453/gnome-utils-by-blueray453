const { Gio, GLib, Meta, Shell } = imports.gi;
const Display = global.get_display();

// const WorkspaceManager = global.get_workspace_manager();
const WorkspaceManager = Display.get_workspace_manager();

// distinguish which functions just return window id and which return details. We can extract id from details. so specific id is not needed

// brief and detailed

// actions will log error

// those functions which have output will output as json error

var MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsWindows">
      <method name="Activate">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="AlignAlacrittyWindows">
      </method>
      <method name="AlignNemoWindows">
      </method>
      <method name="AlignWindowsCurrentWMClass">
      </method>
      <method name="Close">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="CloseDuplicateNemoWindows">
      </method>
      <method name="CloseOtherWindowsCurrentWorkspaceCurrentWMClass">
      </method>
      <method name="Focus">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="FullScreen">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="GetFocusedWindow">
         <arg type="s" direction="out" name="win" />
      </method>
      <method name="GetNormalWindows">
         <arg type="s" direction="out" name="win" />
      </method>
      <method name="GetNormalWindowsCurrentWorkspace">
         <arg type="s" direction="out" name="win" />
      </method>
      <method name="GetNormalWindowsCurrentWorkspaceCurrentWMClass">
         <arg type="s" direction="out" name="win" />
      </method>
      <method name="GetWindowsByWMClass">
        <arg type="s" direction="in" name="wm_class" />
        <arg type="s" direction="out" name="windows" />
      </method>
      <method name="GetWindowsForRofi">
         <arg type="s" direction="out" name="win" />
      </method>
      <method name="GetWindowDetails">
         <arg type="u" direction="in" name="winid" />
         <arg type="s" direction="out" name="win" />
      </method>
      <method name="GetWindows">
         <arg type="s" direction="out" name="win" />
      </method>
      <method name="Maximize">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Minimize">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="MinimizeOtherWindowsCurrentWMClass">
      </method>
      <method name="Move">
         <arg type="u" direction="in" name="winid" />
         <arg type="i" direction="in" name="x" />
         <arg type="i" direction="in" name="y" />
      </method>
      <method name="MoveAllAlacrittyWindowsToCurrentWorkspace">
      </method>
      <method name="MoveAllFirefoxWindowsToCurrentWorkspace">
      </method>
      <method name="MoveAllFsearchWindowsToCurrentWorkspace">
      </method>
      <method name="MoveAllNemoWindowsToCurrentWorkspace">
      </method>
      <method name="MoveResize">
         <arg type="u" direction="in" name="winid" />
         <arg type="i" direction="in" name="x" />
         <arg type="i" direction="in" name="y" />
         <arg type="i" direction="in" name="width" />
         <arg type="i" direction="in" name="height" />
      </method>
      <method name="MoveResizeFocusedWindowToLeftHalfWorkArea">
      </method>
      <method name="MoveResizeFocusedWindowToRightHalfWorkArea">
      </method>
      <method name="MoveWindowsSideBySide">
         <arg type="u" direction="in" name="winid1" />
         <arg type="u" direction="in" name="winid2" />
      </method>
      <method name="MoveWindowToCurrentWorkspace">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Raise">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Resize">
         <arg type="u" direction="in" name="winid" />
         <arg type="i" direction="in" name="width" />
         <arg type="i" direction="in" name="height" />
      </method>
      <method name="Unmaximize">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Unminimize">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="UnMinimizeOtherWindowsCurrentWMClass">
      </method>
   </interface>
</node>`;

var WindowFunctions = class WindowFunctions {

    /* Atomic Utility Functions

    The utility functions that did not use anything other than the Gnome API functions

    These are the building blocks of other utility functions
    */

    _get_app_given_meta_window = function (win) {
        // let tracker = global.get_window_tracker().get_default();
        let tracker = Shell.WindowTracker.get_default();
        let app = tracker.get_window_app(win);
        return app;
    }

    _get_normal_windows = function () {
        let wins = Display.get_tab_list(Meta.TabList.NORMAL, null);
        return wins;
    }

    _get_normal_windows_current_workspace = function () {
        let current_workspace = WorkspaceManager.get_active_workspace();
        let wins = Display.get_tab_list(Meta.TabList.NORMAL, current_workspace);
        return wins;
    }

    _get_window_actor_given_window_id = function (winid) {
        let win = global.get_window_actors().find(w => w.get_meta_window().get_id() == winid);
        return win;
    }

    _make_window_movable_and_resizable = function (win) {
        if (win) {
            if (win.minimized) {
                win.unminimize();
            }
            if (win.maximized_horizontally || win.maximized_vertically) {
                win.unmaximize(3);
            }
        } else {
            log(`Window not found`);
        }
    }



    /* Composite Utility Functions

    The utility functions that use Atomic Utility Functions

    These are the building blocks of regular functions
    */

    _get_meta_window_given_window_id = function (winid) {
        let win = this._get_normal_windows.find(w => w.get_id() == winid);
        return win;
    }

    _get_meta_window_given_wm_class = function (wm_class) {
        let win = this._get_normal_windows.find(w => w.get_wm_class() == wm_class);
        return win;
    }

    _get_normal_windows_current_workspace_given_wm_class = function (wm_class) {
        return this._get_normal_windows_current_workspace.filter(w => w.get_wm_class() == wm_class);
    }

    _get_normal_windows_given_wm_class = function (wm_class) {
        return this._get_normal_windows.filter(w => w.get_wm_class() == wm_class);
    }

    _move_resize_window = function (win, x_coordinate, y_coordinate, width, height) {

        this._make_window_movable_and_resizable(win);

        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            win.move_resize_frame(1, x_coordinate, y_coordinate, width, height);
            return GLib.SOURCE_REMOVE;
        });

    }

    _move_windows_side_by_side = function (winid1, winid2) {
        let win1 = this._get_meta_window_given_window_id(winid1);
        let win2 = this._get_meta_window_given_window_id(winid2);

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

    _align_windows = function (windows_array, windows_per_container, persistent_state_key) {

        // remove windows from windows_array that do not have a minimize() method
        // This is just to check these are valid windows
        // windows_array = windows_array.filter(win => typeof win.minimize === 'function');

        let number_of_windows = windows_array.length;
        let number_of_states = Math.ceil(number_of_windows / windows_per_container);

        let state;

        try {
            state = global.get_persistent_state('n', persistent_state_key).get_int16();
        } catch (error) {
            // log(`Error : ${error}`);
            // Set default value for persistent state
            global.set_persistent_state(persistent_state_key, GLib.Variant.new_int16(0));
            state = 0;
        }

        // log(`state : ${state}`);

        if (state >= number_of_states) {
            state = 0;
        }

        let monitor = Display.get_current_monitor();
        let current_workspace = WorkspaceManager.get_active_workspace();
        let work_area = current_workspace.get_work_area_for_monitor(monitor);
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
        windows_array.forEach(win => win?.minimize() || log(`Win Not Found`));

        for (let i = state * windows_per_container, j = 0; i < windows_array.length && j < windows_per_container; i++, j++) {
            let win = windows_array[i];

            this._move_resize_window(win, all_x[j], 0, window_width, window_height);

            win.activate(0);
        }

        global.set_persistent_state(persistent_state_key, GLib.Variant.new_int16(state + 1));
    }

    _get_brief_properties_given_window_id = function (winid) {
        let win = this._get_meta_window_given_window_id(winid);
        this._get_brief_properties_given_meta_window(win);
    }

    _get_brief_properties_given_wm_class = function (wm_class) {
        let win = this._get_meta_window_given_wm_class(wm_class);
        this._get_brief_properties_given_meta_window(win);
    }

    _get_brief_properties_given_meta_window = function (win) {
        // let is_sticky = !win.is_skip_taskbar() && win.is_on_all_workspaces();
        // let tileMatchId = win.get_tile_match() ? win.get_tile_match().get_id() : null;

        let app = this._get_app_given_meta_window(win);
        let icon = app.get_icon().to_string();

        let workspace_id = win.get_workspace().index();

        return {
            id: win.get_id(),
            title: win.get_title(),
            description: win.get_description(),
            wm_class_instance: win.get_wm_class_instance(),
            wm_class: win.get_wm_class(),
            workspace_id: workspace_id,
            workspace_name: Meta.prefs_get_workspace_name(workspace_id),
            icon: icon
        };
    }

    _get_detailed_properties_given_meta_window = function (win) {

        let win_actor = this._get_window_actor_given_window_id(win.get_id());

        // frame bound create error for fsearch
        // try {
        //     let frame_bounds = win.get_frame_bounds();
        // } catch (error) {
        //     log(`Error : ${error}`);
        // }

        let is_sticky = !win.is_skip_taskbar() && win.is_on_all_workspaces();
        let tileMatchId = win.get_tile_match() ? win.get_tile_match().get_id() : null;

        return {
            width: win_actor.get_width(),
            height: win_actor.get_height(),
            flags: win_actor.get_flags(),
            area_all: win.get_work_area_all_monitors(),
            area_cust: win.get_work_area_for_monitor(Display.get_current_monitor()),
            area: win.get_work_area_current_monitor(),
            canclose: win.can_close(),
            canmaximize: win.can_maximize(),
            canminimize: win.can_minimize(),
            canshade: win.can_shade(),
            description: win.get_description(),
            display: win.get_display(),
            focus: win.has_focus(),
            frame_type: win.get_frame_type(),
            gtk_app_id: win.get_gtk_application_id(),
            id: win.get_id(),
            in_current_workspace: win.located_on_workspace(WorkspaceManager.get_active_workspace()),
            is_above: win.is_above(),
            is_fullscreen: win.is_fullscreen(),
            is_on_all_workspaces: win.is_on_all_workspaces(),
            is_always_on_all_workspaces: win.is_always_on_all_workspaces(),
            is_skip_taskbar: win.is_skip_taskbar(),
            is_sticky: is_sticky,
            layer: win.get_layer(),
            maximized: win.get_maximized(),
            monitor: win.get_monitor(),
            moveable: win.allows_move(),
            pid: win.get_pid(),
            resizeable: win.allows_resize(),
            role: win.get_role(),
            root_ancestor: win.find_root_ancestor(),
            sandbox_app_id: win.get_sandboxed_app_id(),
            title: win.get_title(),
            user_time: win.get_user_time(),
            window_type: win.get_window_type(),
            wm_class_instance: win.get_wm_class_instance(),
            wm_class: win.get_wm_class(),
            workspace: win.get_workspace().index(),
            x: win_actor.get_x(),
            y: win_actor.get_y(),
            tile_match: tileMatchId
        };
    }


    _get_normal_windows_current_workspace_current_wm_class = function () {
        let win = Display.get_focus_window();
        let win_wm_class = win.get_wm_class();

        return this._get_normal_windows_current_workspace_given_wm_class(win_wm_class);
    }

    _get_normal_windows_current_workspace_current_wm_class_sorted = function () {
        let win = Display.get_focus_window();
        let win_wm_class = win.get_wm_class();

        return this._get_normal_windows_current_workspace_given_wm_class_sorted(win_wm_class);
    }

    _get_normal_windows_current_workspace_given_wm_class_sorted = function (wm_class) {
        return this._get_normal_windows_current_workspace_given_wm_class.sort((a, b) => a.get_id() - b.get_id());
    }

    _get_normal_windows_given_wm_class_sorted = function (wm_class) {
        return this._get_normal_windows_given_wm_class.sort((a, b) => a.get_id() - b.get_id());
    }

    _get_other_normal_windows_current_workspace_current_wm_class = function () {
        let win = Display.get_focus_window();
        return this._get_normal_windows_current_workspace_given_wm_class().filter(w => win != w);
    }


    _move_all_app_windows_to_current_workspace = function (wm_class) {
        let current_workspace = WorkspaceManager.get_active_workspace();

        let windows_array = this._get_normal_windows_given_wm_class_sorted(wm_class);

        let isAllInCurrentWorkspace = windows_array.every(function (win) {
            return win.get_workspace().index() === current_workspace.index();
        });

        if (!isAllInCurrentWorkspace) {
            windows_array.forEach(win => {
                if (win.get_workspace().index() != current_workspace.index()) {
                    win.change_workspace(current_workspace);
                    // current_workspace.activate_with_focus(win, 0);
                }
            });
        }
    }























    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.Activate uint32:44129093

    Activate(winid) {
        let win = this._get_meta_window_given_window_id(winid);
        let win_workspace = win.get_workspace();
        // Here global.get_current_time() instead of 0 will also work
        win_workspace.activate_with_focus(win, 0);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.AlignAlacrittyWindows | jq .

    AlignAlacrittyWindows() {
        let windows_array = this._get_normal_windows_current_workspace_given_wm_class_sorted("Alacritty");
        let persistent_state_key = "align_windows_state_nemo";
        let windows_per_container = 2;

        this._align_windows(windows_array, windows_per_container, persistent_state_key);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.AlignNemoWindows | jq .

    AlignNemoWindows() {
        let windows_array = this._get_normal_windows_current_workspace_given_wm_class_sorted("Nemo");
        let persistent_state_key = "align_windows_state_nemo";
        let windows_per_container = 2;

        this._align_windows(windows_array, windows_per_container, persistent_state_key);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.AlignWindowsCurrentWMClass | jq .

    AlignWindowsCurrentWMClass() {
        let windows_array = this._get_normal_windows_current_workspace_current_wm_class_sorted();
        let persistent_state_key = "align_windows_state_all_windows";
        let windows_per_container = 2;

        this._align_windows(windows_array, windows_per_container, persistent_state_key);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.Close uint32:44129093

    Close(winid) {
        try {
            let win = this._get_meta_window_given_window_id(winid);
            // win.get_compositor_private().destroy();
            if (win.can_close()) {
                log(`Deleting Window`);
                win.delete(0);
            }

        } catch (error) {
            log(`Error : ${error}`);
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

    CloseOtherWindowsCurrentWorkspaceCurrentWMClass() {
        let wins = this._get_other_normal_windows_current_workspace_current_wm_class();
        wins.forEach(function (w) {
            if (w.get_wm_class_instance() !== 'file_progress') {
                // log(`closing: ${w.get_id()}`);
                // log(`closing: ${w.get_wm_class_instance()}`);
                w.delete(0);
            }
        })
    }

    Focus(winid) {
        try {
            let win = this._get_meta_window_given_window_id(winid);
            win.focus(0);
        } catch (error) {
            log(`Error : ${error}`);
        }
    }

    FullScreen(winid) {
        let win = this._get_meta_window_given_window_id(winid);
        let win_workspace = win.get_workspace();
        // Here global.get_current_time() instead of 0 will also work
        win.maximize(3);
        win_workspace.activate_with_focus(win, 0);
        // win.make_fullscreen();
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetFocusedWindow | jq '.[].id'

    GetFocusedWindow() {
        let win = Display.get_focus_window();
        let winProperties = this._get_brief_properties_given_meta_window(win);
        return JSON.stringify(winProperties);
    }

    //  dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetNormalWindows | jq .

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetNormalWindows | jq -r '.[].id'

    GetNormalWindows() {
        let wins = this._get_normal_windows();

        // Map each window to its properties
        let winPropertiesArr = wins.map(win => this._get_brief_properties_given_meta_window(win));

        return JSON.stringify(winPropertiesArr);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetNormalWindowsCurrentWorkspace | jq .

    GetNormalWindowsCurrentWorkspace() {
        let wins = this._get_normal_windows_current_workspace();

        // Map each window to its properties
        let winPropertiesArr = wins.map(win => this._get_brief_properties_given_meta_window(win));

        return JSON.stringify(winPropertiesArr);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetNormalWindowsCurrentWorkspaceCurrentWMClass | jq .

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetNormalWindowsCurrentWorkspaceCurrentWMClass | jq -r '.[].id'

    GetNormalWindowsCurrentWorkspaceCurrentWMClass() {
        let wins = this._get_normal_windows_current_workspace_current_wm_class();

        // Map each window to its properties
        let winPropertiesArr = wins.map(win => this._get_brief_properties_given_meta_window(win));

        return JSON.stringify(winPropertiesArr);

    }

    //  dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindowsByWMClass string:"firefox" | jq -r '.[]'

    //  dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindowsByWMClass string:"firefox" | jq -r '.[].id'

    GetWindowsByWMClass(wm_class) {
        let wins = _get_normal_windows_current_workspace_given_wm_class(wm_class).map(w => w.get_id());

        // Map each window to its properties
        let winPropertiesArr = wins.map(win => this._get_brief_properties_given_meta_window(win));

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
        let winPropertiesArr = wins.map(win => this._get_brief_properties_given_meta_window(win));

        return JSON.stringify(winPropertiesArr);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindowDetails uint32:740651535

    GetWindowDetails(winid) {

        let win = this._get_meta_window_given_window_id(winid);

        let winProperties = this._get_detailed_properties_given_meta_window(win);

        return JSON.stringify(winProperties);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindows | jq

    GetWindows() {
        let wins = this._get_normal_windows();

        // Map each window to its properties
        let winPropertiesArr = wins.map(win => this._get_brief_properties_given_meta_window(win));

        return JSON.stringify(winPropertiesArr);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.Maximize uint32:3931313482

    Maximize(winid) {
        try {
            let win = this._get_meta_window_given_window_id(winid);
            if (win.minimized) {
                win.unminimize();
            }
            win.maximize(3);
            win.activate(0);
        } catch (error) {
            log(`Error : ${error}`);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.Minimize uint32:3931313482

    Minimize(winid) {
        try {
            let win = this._get_meta_window_given_window_id(winid);
            win.minimize();
        } catch (error) {
            log(`Error : ${error}`);
        }
    }

    MinimizeOtherWindowsCurrentWMClass() {
        let wins = this._get_other_normal_windows_current_workspace_current_wm_class();

        wins.map(w => w.minimize());
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.Move uint32:44129093 int32:100 int32:200

    Move(winid, x, y) {
        let win = this._get_meta_window_given_window_id(winid);
        if (win) {
            this._make_window_movable_and_resizable(win);
            win.move_frame(1, x, y);
            win.activate(0);
        } else {
            log(`Window not found`);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MoveAllNemoWindowsToCurrentWorkspace

    MoveAllAlacrittyWindowsToCurrentWorkspace() {
        this._move_all_app_windows_to_current_workspace("Alacritty");
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MoveAllFirefoxWindowsToCurrentWorkspace

    MoveAllFirefoxWindowsToCurrentWorkspace() {
        this._move_all_app_windows_to_current_workspace("firefox");
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MoveAllFsearchWindowsToCurrentWorkspace

    MoveAllFsearchWindowsToCurrentWorkspace() {
        this._move_all_app_windows_to_current_workspace("Fsearch");
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MoveAllNemoWindowsToCurrentWorkspace

    MoveAllNemoWindowsToCurrentWorkspace() {
        this._move_all_app_windows_to_current_workspace("Nemo");

    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MoveResize uint32:44129093 int32:0 int32:0 int32:0 int32:0

    MoveResize(winid, x, y, width, height) {
        let win = this._get_meta_window_given_window_id(winid);

        if (win) {
            this._move_resize_window(win, x, y, width, height);

            // let actor = win.get_compositor_private();
            // let id = actor.connect('first-frame', _ => {
            //     win.move_resize_frame(1, x, y, width, height);
            //     actor.disconnect(id);
            // });

            win.activate(0);
        } else {
            log(`Window not found`);
        }
    }

    MoveResizeFocusedWindowToLeftHalfWorkArea() {
        let win = global.get_window_actors().find(w => w.meta_window.has_focus() == true).meta_window;
        let work_area = win.get_work_area_current_monitor();
        if (win && work_area) {
            let left = 0;
            let top = 0;
            let width = work_area.width / 2;
            let height = work_area.height;
            // win.move_resize_frame(true, left, top, width, height);

            this._move_resize_window(win, left, top, width, height);
        }
    }

    MoveResizeFocusedWindowToRightHalfWorkArea() {
        let win = global.get_window_actors().find(w => w.meta_window.has_focus() == true).meta_window;
        let work_area = win.get_work_area_current_monitor();
        if (win && work_area) {
            let top = 0;
            let width = work_area.width / 2;
            let left = width;
            let height = work_area.height;
            // win.move_resize_frame(true, left, top, width, height);

            this._move_resize_window(win, left, top, width, height);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MoveWindowsSideBySide uint32:winid1 uint32:winid2

    MoveWindowsSideBySide(winid1, winid2) {
        this._move_windows_side_by_side(winid1, winid2);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MoveWindowToCurrentWorkspace uint32:44129093

    MoveWindowToCurrentWorkspace(winid) {
        let win = this._get_meta_window_given_window_id(winid);
        if (win) {
            let current_workspace = WorkspaceManager.get_active_workspace();
            win.change_workspace(current_workspace);
            // Here global.get_current_time() instead of 0 will also work
            current_workspace.activate_with_focus(win, 0);
        } else {
            log(`Window not found`);
        }
    }

    Raise(winid) {
        let win = this._get_meta_window_given_window_id(winid);
        if (win) {
            win.raise();
            win.raise_and_make_recent();
        } else {
            log(`Window not found`);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.Resize uint32:44129093 int32:800 int32:600

    Resize(winid, width, height) {
        let win = this._get_meta_window_given_window_id(winid);
        if (win) {

            this._move_resize_window(win, win.get_x(), win.get_y(), width, height);

            win.activate(0);

        } else {
            log(`Window not found`);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.Resize uint32:44129093 int32:800 int32:600
    Unmaximize(winid) {
        let win = this._get_meta_window_given_window_id(winid);
        if (win.maximized_horizontally || win.maximized_vertically) {
            win.unmaximize(3);
            win.activate(0);
        } else {
            log(`Window not found`);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.Unminimize uint32:44129093
    Unminimize(winid) {
        let win = this._get_meta_window_given_window_id(winid);
        if (win.minimized) {
            win.unminimize();
        } else {
            log(`Window not found`);
        }
    }

    UnMinimizeOtherWindowsCurrentWMClass() {
        let wins = this._get_other_normal_windows_current_workspace_current_wm_class();

        wins.map(w => {
            w.unminimize();
            w.raise();
        });
    }
}
