const { Meta, St } = imports.gi;

const Display = global.get_display();
const WorkspaceManager = global.workspace_manager;
const WindowManager = global.window_manager;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const { WindowFunctions } = Me.imports.windowFunctions;

let pinnedWindowsData = new Map();
const pinnedWindowsDataKey = 'border';

var MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsPinnedWindows">
      <method name="GetPinnedWindows">
        <arg type="s" direction="out" name="win" />
      </method>
      <method name="TogglePinsFocusedWindow">
      </method>
   </interface>
</node>`;

var PinnedWindowFunctions = class PinnedWindowFunctions {

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
                if (data.get(pinnedWindowsDataKey)) {
                    let wg = Meta.get_window_group_for_display(display);
                    wg.set_child_above_sibling(data.get(pinnedWindowsDataKey), actor);
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

    _set_pinned_window_data(actor, key, value) {
        if (!pinnedWindowsData.has(actor)) {
            pinnedWindowsData.set(actor, new Map());
        }
        pinnedWindowsData.get(actor).set(key, value);
    }

    _get_pinned_window_data(actor, key) {
        if (pinnedWindowsData.has(actor)) {
            return pinnedWindowsData.get(actor).get(key);
        }
        return null;
    }

    _remove_pinned_window_data(actor, key) {
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

        this._set_pinned_window_data(actor, 'positionChangedId', positionChangedId);
        this._set_pinned_window_data(actor, 'sizeChangedId', sizeChangedId);
        this._set_pinned_window_data(actor, 'unmanagedId', unmanagedId);
        this._set_pinned_window_data(actor, 'workspaceChangedId', workspaceChangedId);
    }

    _remove_window_signals(actor) {
        let win = actor.get_meta_window();

        win.disconnect(this._get_pinned_window_data(actor, 'positionChangedId'));
        win.disconnect(this._get_pinned_window_data(actor, 'sizeChangedId'));
        win.disconnect(this._get_pinned_window_data(actor, 'unmanagedId'));
        win.disconnect(this._get_pinned_window_data(actor, 'workspaceChangedId'));
    }

    // Window Borders

    _add_border(actor) {
        let actor_parent = actor.get_parent();
        let win = actor.get_meta_window();
        let rect = win.get_frame_rect();

        let border;

        if (this._get_pinned_window_data(actor, pinnedWindowsDataKey)) {
            border = this._get_pinned_window_data(actor, pinnedWindowsDataKey);
        } else {
            border = new St.Bin({
                style_class: 'pinned-border'
            });
            this._set_pinned_window_data(actor, pinnedWindowsDataKey, border);
        }

        actor_parent.add_child(border);

        border.set_position(rect.x, rect.y);
        border.set_size(rect.width, rect.height);
    }

    _remove_border(actor) {
        if (this._get_pinned_window_data(actor, pinnedWindowsDataKey)) {
            let actor_parent = actor.get_parent();

            actor_parent.remove_child(this._get_pinned_window_data(actor, pinnedWindowsDataKey));
            this._remove_pinned_window_data(actor, pinnedWindowsDataKey);
        }
    }

    _pin_window(actor) {
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
            this._pin_window(actor);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsPinnedWindows org.gnome.Shell.Extensions.GnomeUtilsPinnedWindows.GetPinnedWindows

    GetPinnedWindows() {
        let pinnedWindows =  Array.from(pinnedWindowsData.keys()).map(actor =>
            actor.get_meta_window().get_id()
        );

        return JSON.stringify(pinnedWindows);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsPinnedWindows org.gnome.Shell.Extensions.GnomeUtilsPinnedWindows.TogglePinsFocusedWindow

    TogglePinsFocusedWindow() {
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
