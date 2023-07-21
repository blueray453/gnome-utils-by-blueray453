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

    Activate(winid) {
        let metaWorkspace = global.workspace_manager.get_active_workspace();
        // Here 0 instead of global.get_current_time() will also work
        metaWorkspace.activate_with_focus(winid, global.get_current_time());

        // let win = this._get_window_by_wid(winid).meta_window;
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
