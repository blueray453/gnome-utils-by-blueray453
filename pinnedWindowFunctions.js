const { Meta, St } = imports.gi;

const Display = global.get_display();
const WorkspaceManager = global.workspace_manager;
const WindowManager = global.window_manager;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const { WindowFunctions } = Me.imports.windowFunctions;

let pinnedWindowsData = new Map();

var MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsMarkedWindows">
      <method name="GetPinnedWindows">
        <arg type="s" direction="out" name="win" />
      </method>
      <method name="ToggleMarksFocusedWindow">
      </method>
   </interface>
</node>`;

var MarkedWindowFunctions = class MarkedWindowFunctions {

    constructor() {
        this.windowFunctionsInstance = new WindowFunctions();
        this._workspaceChangedId = WorkspaceManager.connect('active-workspace-changed', () => {
            let currentWorkspace = WorkspaceManager.get_active_workspace();
            pinnedWindowsData.forEach((_, actor) => {
                let win = actor.get_meta_window();
                if (win.get_workspace() !== currentWorkspace) {
                    this._remove_border(actor);
                } else {
                    this._add_border(actor);
                }
            });
        });

        this._minimizeId = WindowManager.connect('minimize', (wm, actor) => this._remove_border(actor));

        this._unminimizeId = WindowManager.connect('unminimize', (wm, actor) => {
            if (pinnedWindowsData.has(actor)) {
                this._add_border(actor);
            }
        });

        this._restackedId = Display.connect('restacked', (display) => {
            pinnedWindowsData.forEach((data, actor) => {
                if (data.get('border')) {
                    let wg = Meta.get_window_group_for_display(display);
                    wg.set_child_above_sibling(data.get('border'), actor);
                }
            });
        });
    }

    destroy() {
        if (this._workspaceChangedId) {
            WorkspaceManager.disconnect(this._workspaceChangedId);
            this._workspaceChangedId = null;
        }
        if (this._minimizeId) {
            WindowManager.disconnect(this._minimizeId);
            this._minimizeId = null;
        }
        if (this._unminimizeId) {
            WindowManager.disconnect(this._unminimizeId);
            this._unminimizeId = null;
        }
        if (this._restackedId) {
            Display.disconnect(this._restackedId);
            this._restackedId = null;
        }
    }

    // pinnedWindowsData Utility Functions

    _set_marked_window_data(actor, key, value) {
        if (!pinnedWindowsData.has(actor)) {
            pinnedWindowsData.set(actor, new Map());
        }
        pinnedWindowsData.get(actor).set(key, value);
    }

    _get_marked_window_data(actor, key) {
        if (pinnedWindowsData.has(actor)) {
            return pinnedWindowsData.get(actor).get(key);
        }
        return null;
    }

    _remove_marked_window_data(actor, key) {
        if (pinnedWindowsData.has(actor)) {
            pinnedWindowsData.get(actor).delete(key);
            if (pinnedWindowsData.get(actor).size === 0) {
                pinnedWindowsData.delete(actor);
            }
        }
    }

    // Window Signals

    _add_window_signals(actor) {
        let win = actor.get_meta_window();

        let positionChangedId = win.connect('position-changed', () => {
            let actor = win.get_compositor_private();
            this._add_border(actor);
        });

        let sizeChangedId = win.connect('size-changed', () => {
            let actor = win.get_compositor_private();
            this._add_border(actor);

        });

        let unmanagedId = win.connect('unmanaging', () => {
            this._unpin_window(actor);
        });

        let workspaceChangedId = win.connect('workspace-changed', () => {
            this._add_border(actor);
        });

        this._set_marked_window_data(actor, 'positionChangedId', positionChangedId);
        this._set_marked_window_data(actor, 'sizeChangedId', sizeChangedId);
        this._set_marked_window_data(actor, 'unmanagedId', unmanagedId);
        this._set_marked_window_data(actor, 'workspaceChangedId', workspaceChangedId);
    }

    _remove_window_signals(actor) {
        let win = actor.get_meta_window();

        win.disconnect(this._get_marked_window_data(actor, 'positionChangedId'));
        win.disconnect(this._get_marked_window_data(actor, 'sizeChangedId'));
        win.disconnect(this._get_marked_window_data(actor, 'unmanagedId'));
        win.disconnect(this._get_marked_window_data(actor, 'workspaceChangedId'));
    }

    // Window Borders

    _add_border(actor) {
        let actor_parent = actor.get_parent();
        let win = actor.get_meta_window();
        let rect = win.get_frame_rect();

        let border;

        if (this._get_marked_window_data(actor, 'border')) {
            border = this._get_marked_window_data(actor, 'border');
        } else {
            border = new St.Bin({
                style_class: 'border'
            });
            this._set_marked_window_data(actor, 'border', border);
        }

        actor_parent.add_child(border);

        border.set_position(rect.x, rect.y);
        border.set_size(rect.width, rect.height);
    }

    _remove_border(actor) {
        if (this._get_marked_window_data(actor, 'border')) {
            let actor_parent = actor.get_parent();

            actor_parent.remove_child(this._get_marked_window_data(actor, 'border'));
            this._remove_marked_window_data(actor, 'border');
        }
    }

    // Windows Mark

    /*
    By marking window, i mean pinnedWindowsData.has(actor). it normally has signals attached to it.
    We generally only remove the signals when we unmark.

    However, Whether it has border or not is irrelevant.
    A marked window may not have border attached to it.

    The only one way to unmark a marked window is _unpin_window
    */

    /* Please note that _unpin_window and _remove_border is not same.

    This is important because when minimizing window, we _remove_border
    but we have to get the border back when we unminimize.

    This is also true for _update_borders. We have to add border to the window again.

    This is also true for _add_border. We have to add border to the window again.
    */

    _mark_window(actor) {
        this._add_border(actor);
        this._add_window_signals(actor);
    }

    _unpin_window(actor) {
        this._remove_border(actor);
        this._remove_window_signals(actor);
        pinnedWindowsData.delete(actor);
    }

    _unpin_windows() {
        pinnedWindowsData.forEach((_, actor) => {
            this._unpin_window(actor);
        });
    }

    _toggle_pin(actor) {
        if (pinnedWindowsData.has(actor)) {
            this._unpin_window(actor);
        } else {
            this._mark_window(actor);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsMarkedWindows org.gnome.Shell.Extensions.GnomeUtilsMarkedWindows.GetPinnedWindows

    GetPinnedWindows() {
        let markedWindows =  Array.from(pinnedWindowsData.keys()).map(actor =>
            actor.get_meta_window().get_id()
        );

        return JSON.stringify(markedWindows);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsMarkedWindows org.gnome.Shell.Extensions.GnomeUtilsMarkedWindows.ToggleMarksFocusedWindow

    ToggleMarksFocusedWindow() {
        let win = Display.get_focus_window();
        let actor = win.get_compositor_private();
        this._toggle_pin(actor);

        // log(`pinnedWindowsData : ${[...pinnedWindowsData.entries()]}`);
        // log(`pinnedWindowsData : ${JSON.stringify([...pinnedWindowsData.entries()])}`);
        // // [[{},{}],[{},{}]]
        // log(`pinnedWindowsData : ${[...pinnedWindowsData.keys()]}`);
        // log(`pinnedWindowsData : ${JSON.stringify([...pinnedWindowsData.keys()])}`);
        // log(`pinnedWindowsData : ${[...pinnedWindowsData.values()]}`);
        // log(`pinnedWindowsData : ${JSON.stringify([...pinnedWindowsData.values()])}`);
    }
};
