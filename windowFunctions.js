const { Gio, GLib, Meta, Shell } = imports.gi;
const Display = global.get_display();

// const WorkspaceManager = global.get_workspace_manager();
const WorkspaceManager = Display.get_workspace_manager();

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
      <method name="GetIconFromWinID">
         <arg type="u" direction="in" name="winid" />
         <arg type="s" direction="out" name="icon" />
      </method>
      <method name="GetMonitorWorkArea">
         <arg type="s" direction="out" name="work_area" />
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
      <method name="GetWindowsForRofi">
         <arg type="s" direction="out" name="win" />
      </method>
      <method name="GetWindowsForRofiSorted">
         <arg type="s" direction="out" name="win" />
      </method>
      <method name="GetTitle">
         <arg type="u" direction="in" name="winid" />
         <arg type="s" direction="out" name="win" />
      </method>
      <method name="GetWindowDetails">
         <arg type="u" direction="in" name="winid" />
         <arg type="s" direction="out" name="win" />
      </method>
      <method name="GetWindows">
         <arg type="s" direction="out" name="win" />
      </method>
    <method name="GetWMClass">
         <arg type="u" direction="in" name="winid" />
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
      <method name="Stick">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Unmaximize">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Unminimize">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="UnMinimizeOtherWindowsCurrentWMClass">
      </method>
      <method name="Unstick">
         <arg type="u" direction="in" name="winid" />
      </method>
   </interface>
</node>`;

var WindowFunctions = class WindowFunctions {

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
            if (win.minimized) {
                win.unminimize();
            }
            if (win.maximized_horizontally || win.maximized_vertically) {
                win.unmaximize(3);
            }

            GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                win.move_resize_frame(1, all_x[j], 0, window_width, window_height);
                return GLib.SOURCE_REMOVE;
            });

            // let actor = win.get_compositor_private();
            // let id = actor.connect('first-frame', _ => {
            //     win.move_resize_frame(1, all_x[j], 0, window_width, window_height);
            //     actor.disconnect(id);
            // });

            win.activate(0);
        }

        global.set_persistent_state(persistent_state_key, GLib.Variant.new_int16(state + 1));
    }

    _get_app_by_win = function (win) {
        // let tracker = global.get_window_tracker().get_default();
        let tracker = Shell.WindowTracker.get_default();
        let app = tracker.get_window_app(win);
        return app;

    }

    _get_normal_windows = function () {
        let wins = Display.get_tab_list(Meta.TabList.NORMAL, null);
        return wins;
    }

    _get_normal_windows_current_workspace_current_wm_class = function () {
        let win = Display.get_focus_window();

        let win_workspace = win.get_workspace();
        let win_wm_class = win.get_wm_class();

        return Display.get_tab_list(Meta.TabList.NORMAL, win_workspace).filter(w => w.get_wm_class() == win_wm_class);
    }

    _get_normal_windows_current_workspace_current_wm_class_sorted = function () {
        let win = Display.get_focus_window();

        let win_workspace = win.get_workspace();
        let win_wm_class = win.get_wm_class();

        return Display.get_tab_list(Meta.TabList.NORMAL, win_workspace).filter(w => w.get_wm_class() == win_wm_class).sort((a, b) => a.get_id() - b.get_id());
    }

    _get_normal_windows_current_workspace_given_wm_class = function (wm_class) {
        let current_workspace = WorkspaceManager.get_active_workspace();
        return Display.get_tab_list(Meta.TabList.NORMAL, current_workspace).filter(w => w.get_wm_class() == wm_class);
    }

    _get_normal_windows_current_workspace_given_wm_class_sorted = function (wm_class) {
        let current_workspace = WorkspaceManager.get_active_workspace();
        return Display.get_tab_list(Meta.TabList.NORMAL, current_workspace).filter(w => w.get_wm_class() == wm_class).sort((a, b) => a.get_id() - b.get_id());
    }

    _get_normal_windows_given_wm_class = function (wm_class) {
        return Display.get_tab_list(Meta.TabList.NORMAL, null).filter(w => w.get_wm_class() == wm_class);
    }

    _get_normal_windows_given_wm_class_sorted = function (wm_class) {
        return Display.get_tab_list(Meta.TabList.NORMAL, null).filter(w => w.get_wm_class() == wm_class).sort((a, b) => a.get_id() - b.get_id());
    }

    _get_other_normal_windows_current_workspace_current_wm_class = function () {
        let win = Display.get_focus_window();

        let win_workspace = win.get_workspace();
        let win_wm_class = win.get_wm_class();

        // retrieve window list for all workspaces
        return Display.get_tab_list(Meta.TabList.NORMAL, win_workspace).filter(w => w.get_wm_class() == win_wm_class && win != w);

    }

    _get_window_actor_by_wid = function (winid) {
        let win = global.get_window_actors().find(w => w.get_meta_window().get_id() == winid);
        return win;
    }

    _get_window_by_wid = function (winid) {
        let win = Display.list_all_windows().find(w => w.get_id() == winid);
        return win;
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
        let win = this._get_window_by_wid(winid);
        let win_workspace = win.get_workspace();
        // Here global.get_current_time() instead of 0 will also work
        win_workspace.activate_with_focus(win, 0);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.AlignAlacrittyWindows | jq .

    AlignAlacrittyWindows() {
        let windows_array = this._get_normal_windows_current_workspace_given_wm_class_sorted("Alacritty");
        let persistent_state_key = "align_windows_state_nemo";
        let windows_per_container = 3;

        this._align_windows(windows_array, windows_per_container, persistent_state_key);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.AlignNemoWindows | jq .

    AlignNemoWindows() {
        let windows_array = this._get_normal_windows_current_workspace_given_wm_class_sorted("Nemo");
        let persistent_state_key = "align_windows_state_nemo";
        let windows_per_container = 3;

        this._align_windows(windows_array, windows_per_container, persistent_state_key);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.AlignWindowsCurrentWMClass | jq .

    AlignWindowsCurrentWMClass() {
        let windows_array = this._get_normal_windows_current_workspace_current_wm_class_sorted();
        let persistent_state_key = "align_windows_state_all_windows";
        let windows_per_container = 3;

        this._align_windows(windows_array, windows_per_container, persistent_state_key);
    }

    Close(winid) {
        try {
            let win = this._get_window_by_wid(winid);
            win.delete(0);
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
                    win.delete(global.get_current_time());
                } else {
                    seen[key].delete(global.get_current_time());
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
            let win = this._get_window_by_wid(winid);
            win.focus(0);
        } catch (error) {
            log(`Error : ${error}`);
        }
    }

    FullScreen(winid) {
        let win = this._get_window_by_wid(winid);
        let win_workspace = win.get_workspace();
        // Here global.get_current_time() instead of 0 will also work
        win.maximize(3);
        win_workspace.activate_with_focus(win, 0);
        // win.make_fullscreen();
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetFocusedWindow | jq .

    GetFocusedWindow() {
        let win = Display.get_focus_window();

        let is_sticky = !win.is_skip_taskbar() && win.is_on_all_workspaces();

        var winJsonArr = [];

        winJsonArr.push({
            description: win.get_description(),
            id: win.get_id(),
            is_sticky: is_sticky,
            layer: win.get_layer(),
            pid: win.get_pid(),
            root_ancestor: win.find_root_ancestor(),
            title: win.get_title(),
            window_type: win.get_window_type(),
            wm_class_instance: win.get_wm_class_instance(),
            wm_class: win.get_wm_class(),
            workspace: win.get_workspace().index()
        });
        return JSON.stringify(winJsonArr);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetIconFromWinID uint32:44129093

    GetIconFromWinID(winid) {
        let win = this._get_window_by_wid(winid);
        let app = this._get_app_by_win(win);
        return app.get_icon().to_string();
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetMonitorWorkArea

    GetMonitorWorkArea() {
        let win = global.get_window_actors().find(w => w.meta_window.has_focus() == true).meta_window;
        let work_area = win.get_work_area_current_monitor();
        var monitor = [];

        monitor.push({
            width: work_area.width,
            height: work_area.height
        });

        return JSON.stringify(monitor);
    }

    //  dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetNormalWindows | jq .

    GetNormalWindows() {
        let wins = this._get_normal_windows();

        var winJsonArr = [];
        wins.forEach(function (win) {

            let is_sticky = !win.is_skip_taskbar() && win.is_on_all_workspaces();

            winJsonArr.push({
                description: win.get_description(),
                focus: win.has_focus(),
                id: win.get_id(),
                is_sticky: is_sticky,
                layer: win.get_layer(),
                pid: win.get_pid(),
                root_ancestor: win.find_root_ancestor(),
                title: win.get_title(),
                window_type: win.get_window_type(),
                wm_class_instance: win.get_wm_class_instance(),
                wm_class: win.get_wm_class(),
                workspace: win.get_workspace().index()
            });
        })
        return JSON.stringify(winJsonArr);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetNormalWindowsCurrentWorkspace | jq .

    GetNormalWindowsCurrentWorkspace() {
        let wins = Display.get_tab_list(Meta.TabList.NORMAL, WorkspaceManager.get_active_workspace());

        var winJsonArr = [];
        wins.forEach(function (win) {

            let is_sticky = !win.is_skip_taskbar() && win.is_on_all_workspaces();

            winJsonArr.push({
                description: win.get_description(),
                focus: win.has_focus(),
                id: win.get_id(),
                is_sticky: is_sticky,
                layer: win.get_layer(),
                pid: win.get_pid(),
                root_ancestor: win.find_root_ancestor(),
                title: win.get_title(),
                window_type: win.get_window_type(),
                wm_class_instance: win.get_wm_class_instance(),
                wm_class: win.get_wm_class(),
                workspace: win.get_workspace().index()
            });
        })
        return JSON.stringify(winJsonArr);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetNormalWindowsCurrentWorkspaceCurrentWMClass | jq .

    GetNormalWindowsCurrentWorkspaceCurrentWMClass() {
        let wins = this._get_normal_windows_current_workspace_current_wm_class();

        let windows_array = [];

        wins.map(w => windows_array.push(w.get_id()));

        return JSON.stringify(windows_array);

    }

    //  dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindowsForRofi | jq .

    GetWindowsForRofi() {
        let wins = Display.get_tab_list(Meta.TabList.NORMAL, null);

        var winJsonArr = [];

        wins.forEach((win) => {
            let app = this._get_app_by_win(win);
            let icon = app.get_icon().to_string();

            let workspace_id = win.get_workspace().index();
            let workspace_name = Meta.prefs_get_workspace_name(workspace_id);

            winJsonArr.push({
                id: win.get_id(),
                title: win.get_title(),
                wm_class: win.get_wm_class(),
                icon: icon,
                workspace_id: workspace_id,
                workspace_name: workspace_name
            });
        })
        return JSON.stringify(winJsonArr);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindowsForRofiSorted | jq .

    GetWindowsForRofiSorted() {
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

        var winJsonArr = [];

        wins.forEach((win) => {
            let app = this._get_app_by_win(win);
            let icon = app.get_icon().to_string();

            let workspace_id = win.get_workspace().index();
            let workspace_name = Meta.prefs_get_workspace_name(workspace_id);
            // time is buggy, need fix
            winJsonArr.push({
                id: win.get_id(),
                title: win.get_title(),
                wm_class: win.get_wm_class(),
                time: new Date(win.get_user_time()).toLocaleString(),
                icon: icon,
                workspace_id: workspace_id,
                workspace_name: workspace_name
            });
        })
        return JSON.stringify(winJsonArr);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetTitle uint32:3931313482

    GetTitle(winid) {
        try {
            let win = this._get_window_by_wid(winid);
            return win.get_title();
        } catch (error) {
            log(`Error : ${error}`);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindowDetails uint32:740651535

    GetWindowDetails(winid) {
        let win_actor = this._get_window_actor_by_wid(winid);
        let win = this._get_window_by_wid(winid);

        log(`win_actor: ${win_actor}`);
        log(`win: ${win}`);

        if (win && win_actor) {

            let is_sticky = !win.is_skip_taskbar() && win.is_on_all_workspaces();

            log(`is_sticky: ${is_sticky}`);

            return JSON.stringify({
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
                frame_bounds: win.get_frame_bounds(),
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
            });
        } else {
            throw new Error('Not found');
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindows | jq

    GetWindows() {
        let wins = global.get_window_actors().map(w => w.meta_window);

        var winJsonArr = [];
        wins.forEach(function (win) {

            let is_sticky = !win.is_skip_taskbar() && win.is_on_all_workspaces();

            winJsonArr.push({
                description: win.get_description(),
                focus: win.has_focus(),
                id: win.get_id(),
                is_sticky: is_sticky,
                layer: win.get_layer(),
                pid: win.get_pid(),
                root_ancestor: win.find_root_ancestor(),
                title: win.get_title(),
                window_type: win.get_window_type(),
                wm_class_instance: win.get_wm_class_instance(),
                wm_class: win.get_wm_class(),
                workspace: win.get_workspace().index()
            });
        })
        return JSON.stringify(winJsonArr);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWMClass uint32:3931313482

    GetWMClass(winid) {
        try {
            let win = this._get_window_by_wid(winid);
            return win.get_wm_class();
        } catch (error) {
            log(`Error : ${error}`);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.Maximize uint32:3931313482

    Maximize(winid) {
        try {
            let win = this._get_window_by_wid(winid);
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
            let win = this._get_window_by_wid(winid);
            win.minimize();
        } catch (error) {
            log(`Error : ${error}`);
        }
    }

    MinimizeOtherWindowsCurrentWMClass() {
        let wins = this._get_other_normal_windows_current_workspace_current_wm_class();

        wins.map(w => w.minimize());
    }

    Move(winid, x, y) {
        let win = this._get_window_by_wid(winid);
        if (win) {

            if (win.minimized) {
                win.unminimize();
            }

            if (win.maximized_horizontally || win.maximized_vertically) {
                win.unmaximize(3);
            }
            win.move_frame(1, x, y);
            win.activate(0);
        } else {
            throw new Error('Not found');
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MoveAllNemoWindowsToCurrentWorkspace

    MoveAllAlacrittyWindowsToCurrentWorkspace() {
        this._move_all_app_windows_to_current_workspace("Alacritty");
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MoveAllNemoWindowsToCurrentWorkspace

    MoveAllNemoWindowsToCurrentWorkspace() {
        this._move_all_app_windows_to_current_workspace("Nemo");

    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MoveResize uint32:44129093 int32:0 int32:0 int32:0 int32:0

    MoveResize(winid, x, y, width, height) {
        let win = this._get_window_by_wid(winid);

        if (win) {
            if (win.minimized) {
                win.unminimize();
            }
            if (win.maximized_horizontally || win.maximized_vertically) {
                win.unmaximize(3);
            }
            // GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            //     win.move_resize_frame(1, x, y, width, height);
            //     return GLib.SOURCE_REMOVE;
            // });

            let actor = win.get_compositor_private();
            let id = actor.connect('first-frame', _ => {
                win.move_resize_frame(1, x, y, width, height);
                actor.disconnect(id);
            });

            win.activate(0);
        } else {
            throw new Error('Not found');
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

            // GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            //     win.move_resize_frame(1, left, top, width, height);
            //     return GLib.SOURCE_REMOVE;
            // });

            let actor = win.get_compositor_private();
            let id = actor.connect('first-frame', _ => {
                win.move_resize_frame(1, left, top, width, height);
                actor.disconnect(id);
            });
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

            // GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            //     win.move_resize_frame(1, left, top, width, height);
            //     return GLib.SOURCE_REMOVE;
            // });

            let actor = win.get_compositor_private();
            let id = actor.connect('first-frame', _ => {
                win.move_resize_frame(1, left, top, width, height);
                actor.disconnect(id);
            });
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MoveWindowToCurrentWorkspace uint32:44129093

    MoveWindowToCurrentWorkspace(winid) {
        let win = this._get_window_by_wid(winid);
        if (win) {
            let current_workspace = WorkspaceManager.get_active_workspace();
            win.change_workspace(current_workspace);
            // Here global.get_current_time() instead of 0 will also work
            current_workspace.activate_with_focus(win, 0);
        } else {
            throw new Error('Not found');
        }
    }

    Raise(winid) {
        let win = this._get_window_by_wid(winid);
        if (win) {
            win.raise();
            win.raise_and_make_recent();
        } else {
            throw new Error('Not found');
        }
    }

    Resize(winid, width, height) {
        let win = this._get_window_by_wid(winid);
        if (win) {

            if (win.minimized) {
                win.unminimize();
            }

            if (win.maximized_horizontally || win.maximized_vertically) {
                win.unmaximize(3);
            }

            // GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            //     win.move_resize_frame(1, win.get_x(), win.get_y(), width, height);
            //     return GLib.SOURCE_REMOVE;
            // });

            let actor = win.get_compositor_private();
            let id = actor.connect('first-frame', _ => {
                win.move_resize_frame(1, win.get_x(), win.get_y(), width, height);
                actor.disconnect(id);
            });

            win.activate(0);
        } else {
            throw new Error('Not found');
        }
    }

    Stick(winid) {
        let win = this._get_window_by_wid(winid);
        if (win) {
            win.stick();
        } else {
            throw new Error('Not found');
        }
    }

    Unmaximize(winid) {
        let win = this._get_window_by_wid(winid);
        if (win.maximized_horizontally || win.maximized_vertically) {
            win.unmaximize(3);
            win.activate(0);
        } else {
            throw new Error('Not found');
        }
    }

    Unminimize(winid) {
        let win = this._get_window_by_wid(winid);
        if (win.minimized) {
            win.unminimize();
        } else {
            throw new Error('Not found');
        }
    }

    UnMinimizeOtherWindowsCurrentWMClass() {
        let wins = this._get_other_normal_windows_current_workspace_current_wm_class();

        wins.map(w => {
            w.unminimize();
            w.raise();
        });
    }

    Unstick(winid) {
        let win = this._get_window_by_wid(winid);
        if (win) {
            win.unstick();
        } else {
            throw new Error('Not found');
        }
    }

}
