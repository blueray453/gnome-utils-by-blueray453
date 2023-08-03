const { Meta, Gio, GLib, Shell } = imports.gi;

// dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindows | jq .

var MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsWindows">
      <method name="Activate">
         <arg type="u" direction="in" name="winid" />
      </method>
    <method name="Close">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Focus">
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
      <method name="GetSelection">
         <arg type="s" direction="out" name="selection" />
      </method>
      <method name="GetTitle">
         <arg type="u" direction="in" name="winid" />
         <arg type="s" direction="out" name="win" />
      </method>
      <method name="GetWindowDetails">
         <arg type="u" direction="in" name="winid" />
         <arg type="s" direction="out" name="win" />
      </method>
      <method name="GetWindowsNormal">
         <arg type="s" direction="out" name="win" />
      </method>
      <method name="GetWindowsNormalCurrentWorkspaceCurrentApplication">
         <arg type="s" direction="out" name="win" />
      </method>
      <method name="GetWindowsNormalCurrentWorkspace">
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
      <method name="Move">
         <arg type="u" direction="in" name="winid" />
         <arg type="i" direction="in" name="x" />
         <arg type="i" direction="in" name="y" />
      </method>
      <method name="MoveResize">
         <arg type="u" direction="in" name="winid" />
         <arg type="i" direction="in" name="x" />
         <arg type="i" direction="in" name="y" />
         <arg type="i" direction="in" name="width" />
         <arg type="i" direction="in" name="height" />
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
      <method name="TileWindowsNormalCurrentWorkspaceCurrentApplication">
      </method>
      <method name="Unmaximize">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Unminimize">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Unstick">
         <arg type="u" direction="in" name="winid" />
      </method>
   </interface>
</node>`;

var WindowFunctions = class WindowFunctions {

    _get_window_actor_by_wid = function (winid) {
        let win = global.get_window_actors().find(w => w.meta_window.get_id() == winid);
        return win;
    }

    _get_window_by_wid = function (winid) {
        let win = global.get_window_actors().find(w => w.meta_window.get_id() == winid);
        return win.get_meta_window();
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.Activate uint32:44129093

    Activate(winid) {
        // let metaWorkspace = global.workspace_manager.get_active_workspace();
        let win = this._get_window_by_wid(winid);
        let win_workspace = win.get_workspace();
        // Here 0 instead of global.get_current_time() will also work
        win_workspace.activate_with_focus(win, global.get_current_time());

        // if (win) {
        //     // Here 0 instead of global.get_current_time() will also work
        //     win.activate(global.get_current_time());
        // } else {
        //     throw new Error('Not found');
        // }
    }

    Close(winid) {
        let win = this._get_window_by_wid(winid);
        if (win) {
            win.kill();
            // win.delete(Math.floor(Date.now() / 1000));
        } else {
            throw new Error('Not found');
        }
    }

    Focus(winid) {
        let win = this._get_window_by_wid(winid);
        if (win) {
            // Here 0 instead of global.get_current_time() will also work
            win.focus(global.get_current_time());
        } else {
            throw new Error('Not found');
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetFocusedWindow | jq .

    GetFocusedWindow() {
        let win = global.get_window_actors().find(w => w.meta_window.has_focus() == true).meta_window;

        let is_sticky = !win.is_skip_taskbar() && win.is_on_all_workspaces();

        if (win) {
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

        } else {
            throw new Error('Not found');
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetIconFromWinID uint32:44129093

    GetIconFromWinID(winid) {

        let win = this._get_window_by_wid(winid);
        //   let wmclass = win.meta_window.get_wm_class();
        //   let app_id = Shell.AppSystem.get_default().lookup_startup_wmclass(wmclass).get_id();
        //   return Shell.AppSystem.get_default().lookup_app(app_id).get_icon().to_string();
        let tracker = Shell.WindowTracker.get_default();
        let app = tracker.get_window_app(win);
        return app.get_icon().to_string();
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetMonitorWorkArea

    GetMonitorWorkArea() {

        // let workspaceManager = global.workspace_manager;
        // let active_workspace =  workspaceManager.get_active_workspace();

        // let display = global.get_display();
        // let work_area = active_workspace.get_work_area_for_monitor(display.get_current_monitor());

        let win = global.get_window_actors().find(w => w.meta_window.has_focus() == true).meta_window;

        let work_area = win.get_work_area_current_monitor();

        var monitor = [];

        monitor.push({
            width: work_area.width,
            height: work_area.height
        });

        return JSON.stringify(monitor);
    }

    GetSelection() {
        // Not Done
        // https://github.com/awamper/gpaste-integration
        // https://github.com/lsnow/translate-clipboard
        // https://github.com/tuberry/light-dict
        // https://github.com/eexpress/gs-clip-translator
        let display = global.display;
        let selection = display.get_selection();
        // https://stackoverflow.com/a/10548059/1772898
        St.Clipboard.get_default().set_text(St.ClipboardType.PRIMARY, selection);

        return selection;
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetTitle uint32:3931313482

    GetTitle(winid) {
        let w = this._get_window_by_wid(winid);
        if (w) {
            return w.get_title();
        } else {
            throw new Error('Not found');
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindowDetails uint32:740651535

    GetWindowDetails(winid) {
        let win_actor = this._get_window_actor_by_wid(winid);
        let win = this._get_window_by_wid(winid);
        let workspaceManager = global.workspace_manager;
        let display = global.display;
        // let monitor = global.display.get_monitor_geometry(currentmonitor);

        if (win && win_actor) {

            let is_sticky = !win.is_skip_taskbar() && win.is_on_all_workspaces();

            return JSON.stringify({
                width: win_actor.get_width(),
                height: win_actor.get_height(),
                flags: win_actor.get_flags(),
                area_all: win.get_work_area_all_monitors(),
                area_cust: win.get_work_area_for_monitor(display.get_current_monitor()),
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
                in_current_workspace: win.located_on_workspace(workspaceManager.get_active_workspace()),
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

    //  dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindowsNormal | jq .

    GetWindowsNormal() {
        let wins = global.get_window_actors().filter(w => w.meta_window.get_window_type() == 0).map(w => w.meta_window);

        var winJsonArr = [];
        wins.forEach(function (win) {

            let is_sticky = !win.is_skip_taskbar() && win.is_on_all_workspaces();

            winJsonArr.push({
                description:  win.get_description(),
                focus:  win.has_focus(),
                id:  win.get_id(),
                is_sticky: is_sticky,
                layer:  win.get_layer(),
                pid:  win.get_pid(),
                root_ancestor:  win.find_root_ancestor(),
                title:  win.get_title(),
                window_type:  win.get_window_type(),
                wm_class_instance:  win.get_wm_class_instance(),
                wm_class:  win.get_wm_class(),
                workspace:  win.get_workspace().index()
            });
        })
        return JSON.stringify(winJsonArr);
    }

    GetWindowsNormalCurrentWorkspaceCurrentApplication(){

        let win = global.get_window_actors().find(w => w.meta_window.has_focus() == true).meta_window;
        // let wmclass = w.meta_window.get_wm_class();
        // return Gio.AppInfo.get_all().find(a => a.get_startup_wm_class() == wmclass).get_id();

        let tracker = Shell.WindowTracker.get_default();
        let app = tracker.get_window_app(win);

        let windows_array = [];

        app.get_windows().forEach(function (w) {
            // log("window id : " + w.get_id());
            if (w.get_window_type() == 0)
            {
                windows_array.push(w.get_id());
            }
        })

        return JSON.stringify(windows_array);

    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetWindowsNormalCurrentWorkspace | jq .

    GetWindowsNormalCurrentWorkspace() {

        let workspaceManager = global.workspace_manager;

        let wins = global.get_window_actors().filter(w => w.meta_window.get_window_type() == 0 && w.meta_window.located_on_workspace(workspaceManager.get_active_workspace())).map(w => w.meta_window);

        var winJsonArr = [];
        wins.forEach(function (win) {

            let is_sticky = !win.is_skip_taskbar() && win.is_on_all_workspaces();

            winJsonArr.push({
                description:  win.get_description(),
                focus:  win.has_focus(),
                id:  win.get_id(),
                is_sticky: is_sticky,
                layer:  win.get_layer(),
                pid:  win.get_pid(),
                root_ancestor:  win.find_root_ancestor(),
                title:  win.get_title(),
                window_type:  win.get_window_type(),
                wm_class_instance:  win.get_wm_class_instance(),
                wm_class:  win.get_wm_class(),
                workspace:  win.get_workspace().index()
            });
        })
        return JSON.stringify(winJsonArr);
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

    Maximize(winid) {
        let win = this._get_window_by_wid(winid);

        if (win) {
            if (win.minimized) {
                win.unminimize();
            }
            win.maximize(3);
            win.activate(0);
        } else {
            throw new Error('Not found');
        }
    }

    Minimize(winid) {
        let win = this._get_window_by_wid(winid);
        if (win) {
            win.minimize();
        } else {
            throw new Error('Not found');
        }
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
            win.move_resize_frame(1, x, y, width, height);
            win.activate(0);
        } else {
            throw new Error('Not found');
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MoveWindowToCurrentWorkspace uint32:44129093

    MoveWindowToCurrentWorkspace(winid) {
        let win = this._get_window_by_wid(winid);
        if (win) {
            let workspaceManager = global.workspace_manager;
            let current_workspace = workspaceManager.get_active_workspace();
            win.change_workspace(current_workspace);
            current_workspace.activate_with_focus(win, global.get_current_time());
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
            win.move_resize_frame(1, win.get_x(), win.get_y(), width, height);
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

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.TileWindowsNormalCurrentWorkspaceCurrentApplication | jq .

    TileWindowsNormalCurrentWorkspaceCurrentApplication() {

        let workspaceManager = global.workspace_manager;

        // const file_path = GLib.build_filenamev([GLib.get_home_dir(), 'align-windows.txt']);
        const file_path_state = GLib.build_filenamev([GLib.get_home_dir(), 'align-windows-state.txt']);
        // const file = Gio.File.new_for_path(file_path);
        const file_state = Gio.File.new_for_path(file_path_state);

        // try {
        //     file.delete(null);
        // } catch (e) {
        //     logError(e);
        // }

        // const outputStreamAppend = file.append_to(Gio.FileCreateFlags.NONE, null);

        let win = global.get_window_actors().find(w => w.meta_window.has_focus() == true).meta_window;

        let tracker = Shell.WindowTracker.get_default();
        let app = tracker.get_window_app(win);

        let number_of_windows = 0;

        let windows_array = [];

        app.get_windows().forEach(function (w) {
            if (w.get_window_type() == 0 && w.located_on_workspace(workspaceManager.get_active_workspace())) {
                windows_array.push(w.get_id());
                // outputStreamAppend.write_all(w.get_id() + '\n', null);
                number_of_windows = number_of_windows + 1;
            }
        });

        let work_area = win.get_work_area_current_monitor();
        let work_area_width = work_area.width;
        let work_area_height = work_area.height;

        // log(`Work area width ${work_area_width}`);
        // log(`Work area height ${work_area_height}`);

        let windows_per_container = 3;

        let number_of_states = Math.ceil(number_of_windows / windows_per_container);

        let window_height = work_area_height;
        let window_width = work_area_width / windows_per_container;

        let all_x=[];

        for (let n = 0; n < windows_per_container; n++) {
            all_x[n] = window_width * n;
        }

        // const [ok, contents, etag] = file.load_contents(null);

        // const decoder = new TextDecoder('utf-8');
        // const contentsString = decoder.decode(contents);

        // let lines = contentsString.split(/\n/);

        for (let i = 0; i < windows_array.length; i++) {


                let win = this._get_window_by_wid(windows_array[i]);
                if (win.minimized) {
                    win.unminimize();
                }
                if (win.maximized_horizontally || win.maximized_vertically) {
                    win.unmaximize(3);
                }
                win.move_resize_frame(1, 0, 0, window_width, window_height);
                win.activate(0);

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

    Unstick(winid) {
        let win = this._get_window_by_wid(winid);
        if (win) {
            win.unstick();
        } else {
            throw new Error('Not found');
        }
    }

}
