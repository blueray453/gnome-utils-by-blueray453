const { Meta, St } = imports.gi;

const Display = global.get_display();
const WorkspaceManager = global.workspace_manager;
const WindowManager = global.window_manager;
const WindowGroup = global.window_group;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const { WindowFunctions } = Me.imports.windowFunctions;

let markedWindowsData = new Map();

var MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsMarkedWindows">
      <method name="CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass">
      </method>
      <method name="GetMarkedWindows">
        <arg type="s" direction="out" name="win" />
      </method>
      <method name="ToggleMarksFocusedWindow">
      </method>
   </interface>
</node>`;

var MarkedWindowFunctions = class MarkedWindowFunctions {

    constructor() {
        this.windowFunctionsInstance = new WindowFunctions();
        this._workspaceChangedId = WorkspaceManager.connect('active-workspace-changed', () => this._update_borders());
        this._minimizeId = WindowManager.connect('minimize', (wm, actor) => this._remove_border(actor));
        this._unminimizeId = WindowManager.connect('unminimize', (wm, actor) => {
            if (markedWindowsData.has(actor)) {
                this._add_border(actor);
            }
        });
        this._sizeChangedId = WindowManager.connect('size-changed', (wm, actor) => this._redraw_border(actor));
        this._restackedId = Display.connect('restacked', (display) => {
            markedWindowsData.forEach((data, actor) => {
                let wg = Meta.get_window_group_for_display(display);
                wg.set_child_above_sibling(data.get('border'), actor);
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
        if (this._sizeChangedId) {
            WindowManager.disconnect(this._sizeChangedId);
            this._sizeChangedId = null;
        }
        if (this._restackedId) {
            Display.disconnect(this._restackedId);
            this._restackedId = null;
        }
    }

    _set_marked_window_data(actor, key, value) {
        if (!markedWindowsData.has(actor)) {
            markedWindowsData.set(actor, new Map());
        }
        markedWindowsData.get(actor).set(key, value);
    }

    _get_marked_window_data(actor, key) {
        if (markedWindowsData.has(actor)) {
            return markedWindowsData.get(actor).get(key);
        }
        return null;
    }

    _remove_marked_window_data(actor, key) {
        if (markedWindowsData.has(actor)) {
            markedWindowsData.get(actor).delete(key);
            if (markedWindowsData.get(actor).size === 0) {
                markedWindowsData.delete(actor);
            }
        }
    }

    _redraw_border(actor) {
        if (markedWindowsData.get(actor).get('border')){
            this._remove_border(actor);
        }
        this._add_border(actor);
    }

    _remove_border(actor) {
        let actor_parent = actor.get_parent();

        actor_parent.remove_child(this._get_marked_window_data(actor, 'border'));
        this._remove_marked_window_data(actor, 'border');
        log(`border after _remove_border: ${this._get_marked_window_data(actor, 'border')}`);

        if (this._get_marked_window_data(actor, 'border')) {
            log(`This will not do anything as border is undefined`);
        }
    }

    _add_border(actor) {
        let win = actor.get_meta_window();
        let actor_parent = actor.get_parent();
        let rect = win.get_frame_rect();

        let border = new St.Bin({
            style_class: 'border'
        });

        actor_parent.add_child(border);
        border.set_position(rect.x, rect.y);
        border.set_size(rect.width, rect.height);

        this._set_marked_window_data(actor, 'border', border);

        log(`border after _add_border: ${this._get_marked_window_data(actor, 'border')}`);
    }

    _add_window_signals(actor) {
        let win = actor.get_meta_window();

        let positionChangedId = win.connect('position-changed', () => {
            let actor = win.get_compositor_private();
            if (markedWindowsData.has(actor)) {
                this._redraw_border(actor);
            }
        });

        let unmanagedId = win.connect('unmanaging', () => {
            this._unmark_window(actor);
        });

        this._set_marked_window_data(actor, 'positionChangedId', positionChangedId);
        this._set_marked_window_data(actor, 'unmanagedId', unmanagedId);
    }

    _remove_window_signals(actor) {
        let win = actor.get_meta_window();

        win.disconnect(this._get_marked_window_data(actor, 'positionChangedId'));
        win.disconnect(this._get_marked_window_data(actor, 'unmanagedId'));
    }

    _update_borders() {
        let currentWorkspace = WorkspaceManager.get_active_workspace();
        markedWindowsData.forEach((_, actor) => {
            let win = actor.get_meta_window();
            if (win.get_workspace() !== currentWorkspace) {
                if (this._get_marked_window_data(actor, 'border')) {
                    this._remove_border(actor);
                }
            } else {
                if (!this._get_marked_window_data(actor, 'border')) {
                    this._add_border(actor);
                }
            }
        });
    }

    _mark_window(actor) {
        this._add_border(actor);
        this._add_window_signals(actor);
    }

    /*
    By marking window, i mean markedWindowsData.has(actor). it normally has signals attached to it.
    We generally only remove the signals when we unmark.

    However, Whether it has border or not is irrelevant.
    A marked window may not have border attached to it.

    The only one way to unmark a marked window is _unmark_window
    */

    /* Please note that _unmark_window and _remove_border is not same.

    This is important because when minimizing window, we _remove_border
    but we have to get the border back when we unminimize.

    This is also true for _update_borders. We have to add border to the window again.

    This is also true for _redraw_border. We have to add border to the window again.
    */
    _unmark_window(actor) {
        this._remove_border(actor);
        this._remove_window_signals(actor);
        markedWindowsData.delete(actor);
    }

    _unmark_windows() {
        markedWindowsData.forEach((_, actor) => {
            this._unmark_window(actor);
        });
    }

    _toggle_mark(actor) {
        if (markedWindowsData.has(actor)) {
            this._unmark_window(actor);
        } else {
            this._mark_window(actor);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsMarkedWindows org.gnome.Shell.Extensions.GnomeUtilsMarkedWindows.CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass

    CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass() {
        let wins = this.windowFunctionsInstance._get_other_normal_windows_current_workspace_of_focused_window_wm_class();

        wins.forEach((w) => {
            if (w.get_wm_class_instance() === 'file_progress') {
                return; // Skip this window if it's a 'file_progress' instance
            }

            let actor = w.get_compositor_private();
            if (markedWindowsData.has(actor)) {
                return; // Skip this window if it's marked
            }
            w.delete(0);
        });

        this._unmark_windows();
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsMarkedWindows org.gnome.Shell.Extensions.GnomeUtilsMarkedWindows.GetMarkedWindows

    GetMarkedWindows() {
        let markedWindows =  Array.from(markedWindowsData.keys()).map(actor =>
            actor.get_meta_window().get_id()
        );

        return JSON.stringify(markedWindows);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsMarkedWindows org.gnome.Shell.Extensions.GnomeUtilsMarkedWindows.ToggleMarksFocusedWindow

    ToggleMarksFocusedWindow() {
        let win = Display.get_focus_window();
        let actor = win.get_compositor_private();
        this._toggle_mark(actor);

        // log(`markedWindowsData : ${[...markedWindowsData.entries()]}`);
        // log(`markedWindowsData : ${JSON.stringify([...markedWindowsData.entries()])}`);
        // // [[{},{}],[{},{}]]
        // log(`markedWindowsData : ${[...markedWindowsData.keys()]}`);
        // log(`markedWindowsData : ${JSON.stringify([...markedWindowsData.keys()])}`);
        // log(`markedWindowsData : ${[...markedWindowsData.values()]}`);
        // log(`markedWindowsData : ${JSON.stringify([...markedWindowsData.values()])}`);
    }
};
