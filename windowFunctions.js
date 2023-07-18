const { Gio, GLib, Shell } = imports.gi;

// dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.ListWindows | jq .

var MR_DBUS_IFACE_WINDOWS = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsWindows">
      <method name="ListWindows">
         <arg type="s" direction="out" name="win" />
      </method>
      <method name="DetailsWindow">
         <arg type="u" direction="in" name="winid" />
         <arg type="s" direction="out" name="win" />
      </method>
      <method name="GetTitle">
         <arg type="u" direction="in" name="winid" />
         <arg type="s" direction="out" name="win" />
      </method>
      <method name="GetFocusedWindow">
         <arg type="s" direction="out" name="win" />
      </method>
      <method name="MoveToWorkspace">
         <arg type="u" direction="in" name="winid" />
         <arg type="i" direction="in" name="workspaceNum" />
      </method>
      <method name="MoveResize">
         <arg type="u" direction="in" name="winid" />
         <arg type="i" direction="in" name="x" />
         <arg type="i" direction="in" name="y" />
         <arg type="i" direction="in" name="width" />
         <arg type="i" direction="in" name="height" />
      </method>
      <method name="Resize">
         <arg type="u" direction="in" name="winid" />
         <arg type="i" direction="in" name="width" />
         <arg type="i" direction="in" name="height" />
      </method>
      <method name="Move">
         <arg type="u" direction="in" name="winid" />
         <arg type="i" direction="in" name="x" />
         <arg type="i" direction="in" name="y" />
      </method>
      <method name="Maximize">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Minimize">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Unmaximize">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Unminimize">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Activate">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Close">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Raise">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Stick">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="Unstick">
         <arg type="u" direction="in" name="winid" />
      </method>
      <method name="GetIconFromWinID">
         <arg type="u" direction="in" name="winid" />
         <arg type="s" direction="out" name="icon" />
      </method>

   </interface>
</node>`;

function ListWindows() {
    let win = global.get_window_actors();

    let workspaceManager = global.workspace_manager;

    var winJsonArr = [];
    win.forEach(function (w) {
        winJsonArr.push({
            gtk_app_id: w.meta_window.get_gtk_application_id(),
            sandbox_app_id: w.meta_window.get_sandboxed_app_id(),
            gtk_bus_name: w.meta_window.get_gtk_unique_bus_name(),
            gtk_obj_path: w.meta_window.get_gtk_window_object_path(),
            wm_class: w.meta_window.get_wm_class(),
            wm_class_instance: w.meta_window.get_wm_class_instance(),
            pid: w.meta_window.get_pid(),
            id: w.meta_window.get_id(),
            frame_type: w.meta_window.get_frame_type(),
            window_type: w.meta_window.get_window_type(),
            width: w.get_width(),
            height: w.get_height(),
            x: w.get_x(),
            y: w.get_y(),
            focus: w.meta_window.has_focus(),
            in_current_workspace: w.meta_window.located_on_workspace(workspaceManager.get_active_workspace())
        });
    })
    return JSON.stringify(winJsonArr);
}

function GetFocusedWindow() {
    let w = global.get_window_actors().find(w => w.meta_window.has_focus() == true);

    let workspaceManager = global.workspace_manager;

    if (w) {
        var winJsonArr = [];

        winJsonArr.push({
            gtk_app_id: w.meta_window.get_gtk_application_id(),
            sandbox_app_id: w.meta_window.get_sandboxed_app_id(),
            gtk_bus_name: w.meta_window.get_gtk_unique_bus_name(),
            gtk_obj_path: w.meta_window.get_gtk_window_object_path(),
            wm_class: w.meta_window.get_wm_class(),
            wm_class_instance: w.meta_window.get_wm_class_instance(),
            pid: w.meta_window.get_pid(),
            id: w.meta_window.get_id(),
            frame_type: w.meta_window.get_frame_type(),
            window_type: w.meta_window.get_window_type(),
            width: w.get_width(),
            height: w.get_height(),
            x: w.get_x(),
            y: w.get_y(),
            focus: w.meta_window.has_focus(),
            in_current_workspace: w.meta_window.located_on_workspace(workspaceManager.get_active_workspace())
        });

        return JSON.stringify(winJsonArr);

    } else {
        throw new Error('Not found');
    }

}

let _get_window_by_wid = function (winid) {
    let win = global.get_window_actors().find(w => w.meta_window.get_id() == winid);
    return win;
}

function DetailsWindow(winid) {
    let w = _get_window_by_wid(winid);
    let workspaceManager = global.workspace_manager;
    let currentmonitor = global.display.get_current_monitor();
    // let monitor = global.display.get_monitor_geometry(currentmonitor);
    if (w) {
        return JSON.stringify({
            gtk_app_id: w.meta_window.get_gtk_application_id(),
            sandbox_app_id: w.meta_window.get_sandboxed_app_id(),
            gtk_bus_name: w.meta_window.get_gtk_unique_bus_name(),
            gtk_obj_path: w.meta_window.get_gtk_window_object_path(),
            wm_class: w.meta_window.get_wm_class(),
            wm_class_instance: w.meta_window.get_wm_class_instance(),
            pid: w.meta_window.get_pid(),
            id: w.meta_window.get_id(),
            width: w.get_width(),
            height: w.get_height(),
            x: w.get_x(),
            y: w.get_y(),
            focus: w.meta_window.has_focus(),
            in_current_workspace: w.meta_window.located_on_workspace(workspaceManager.get_active_workspace()),
            moveable: w.meta_window.allows_move(),
            resizeable: w.meta_window.allows_resize(),
            canclose: w.meta_window.can_close(),
            canmaximize: w.meta_window.can_maximize(),
            maximized: w.meta_window.get_maximized(),
            canminimize: w.meta_window.can_minimize(),
            canshade: w.meta_window.can_shade(),
            display: w.meta_window.get_display(),
            frame_bounds: w.meta_window.get_frame_bounds(),
            frame_type: w.meta_window.get_frame_type(),
            window_type: w.meta_window.get_window_type(),
            layer: w.meta_window.get_layer(),
            monitor: w.meta_window.get_monitor(),
            role: w.meta_window.get_role(),
            area: w.meta_window.get_work_area_current_monitor(),
            area_all: w.meta_window.get_work_area_all_monitors(),
            area_cust: w.meta_window.get_work_area_for_monitor(currentmonitor),
            user_time: w.meta_window.get_user_time(),
            flags: w.get_flags()
        });
    } else {
        throw new Error('Not found');
    }
}

// dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetTitle uint32:3931313482

function GetTitle(winid) {
    let w = _get_window_by_wid(winid).meta_window;
    if (w) {
        return w.get_title();
    } else {
        throw new Error('Not found');
    }
}

// dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MoveToWorkspace uint32:4121447925 int32:2

function MoveToWorkspace(winid, workspaceNum) {
    let win = _get_window_by_wid(winid).meta_window;
    if (win) {
        win.change_workspace_by_index(workspaceNum, false);
    } else {
        throw new Error('Not found');
    }
}

// dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.MoveResize uint32:44129093 int32:0 int32:0 int32:0 int32:0

function MoveResize(winid, x, y, width, height) {
    let win = _get_window_by_wid(winid).meta_window;

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

function Resize(winid, width, height) {
    let win = _get_window_by_wid(winid).meta_window;
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

function Move(winid, x, y) {
    let win = _get_window_by_wid(winid).meta_window;
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

function Maximize(winid) {
    let win = _get_window_by_wid(winid).meta_window;

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

function Minimize(winid) {
    let win = _get_window_by_wid(winid).meta_window;
    if (win) {
        win.minimize();
    } else {
        throw new Error('Not found');
    }
}

function Unmaximize(winid) {
    let win = _get_window_by_wid(winid).meta_window;
    if (win.maximized_horizontally || win.maximized_vertically) {
        win.unmaximize(3);
        win.activate(0);
    } else {
        throw new Error('Not found');
    }
}

function Unminimize(winid) {
    let win = _get_window_by_wid(winid).meta_window;
    if (win.minimized) {
        win.unminimize();
    } else {
        throw new Error('Not found');
    }
}

function Raise(winid) {
    let win = _get_window_by_wid(winid).meta_window;
    if (win) {
        win.raise();
        win.raise_and_make_recent();
    } else {
        throw new Error('Not found');
    }
}
function Stick(winid) {
    let win = _get_window_by_wid(winid).meta_window;
    if (win) {
        win.stick();
    } else {
        throw new Error('Not found');
    }
}
function Unstick(winid) {
    let win = _get_window_by_wid(winid).meta_window;
    if (win) {
        win.unstick();
    } else {
        throw new Error('Not found');
    }
}
function Activate(winid) {
    let win = _get_window_by_wid(winid).meta_window;
    if (win) {
        win.activate(0);
    } else {
        throw new Error('Not found');
    }
}

function Close(winid) {
    let win = _get_window_by_wid(winid).meta_window;
    if (win) {
        win.kill();
        // win.delete(Math.floor(Date.now() / 1000));
    } else {
        throw new Error('Not found');
    }
}

// dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsWindows org.gnome.Shell.Extensions.GnomeUtilsWindows.GetIconFromWinID uint32:44129093

function GetIconFromWinID(winid) {
    let wmclass = _get_window_by_wid(winid).meta_window.get_wm_class();
    let app_id = Shell.AppSystem.get_default().lookup_startup_wmclass(wmclass).get_id();
    return Shell.AppSystem.get_default().lookup_app(app_id).get_icon().to_string();
}