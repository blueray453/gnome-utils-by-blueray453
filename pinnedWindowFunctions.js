const { Meta, St } = imports.gi;

const Display = global.get_display();
const WorkspaceManager = global.workspace_manager;
const WindowManager = global.window_manager;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const { WindowFunctions } = Me.imports.windowFunctions;

let pinnedWindowsData = new Map();

const BORDER_FOR_PINNED_WINDOW_ACTOR = 'border_for_pinned_window_actor';
/*
    Every border has it's own
    new St.Bin({
      style_class: 'pinned-border'
    });
    This is why we are using BORDER_FOR_PINNED_WINDOW_ACTOR. This is the key in which we store the St.Bin Object for each actor.
*/

var MR_DBUS_IFACE = `
<node>
   <interface name="org.gnome.Shell.Extensions.GnomeUtilsPinnedWindows">
      <method name="ActivatePinnedWindows">
        <arg type="s" direction="out" name="win" />
      </method>
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
                    win.change_workspace(currentWorkspace);
                    win.get_workspace().activate_with_focus(win, 0);
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
            pinnedWindowsData.forEach((_, actor) => {
                if (this._get_border_for_actor(actor)) {
                    let wg = Meta.get_window_group_for_display(display);
                    wg.set_child_above_sibling(this._get_border_for_actor(actor), actor);
                }
            }); this._get_border_for_actor(actor);
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
            pinnedWindowsData.set(actor, {});
        }
        let info = pinnedWindowsData.get(actor);
        info[key] = value;
    }

    _get_marked_window_data(actor, key) {
        if (pinnedWindowsData.has(actor)) {
            const info = pinnedWindowsData.get(actor);
            return info[key];
        }
        return null;
    }

    _get_border_for_actor(actor) {
        if (pinnedWindowsData.has(actor)) {
            const border_for_pinned_window_actor = pinnedWindowsData.get(actor)[BORDER_FOR_PINNED_WINDOW_ACTOR];
            log(`Actor's Border: ${border_for_pinned_window_actor}`);
            return border_for_pinned_window_actor;
        }
        return null;
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
            this._unmark_window(actor);
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

        if (this._get_border_for_actor(actor)) {
            border = this._get_border_for_actor(actor);
        } else {
            border = new St.Bin({
                style_class: 'pinned-border'
            });
            this._set_marked_window_data(actor, BORDER_FOR_PINNED_WINDOW_ACTOR, border);
        }

        actor_parent.add_child(border);

        border.set_position(rect.x, rect.y);
        border.set_size(rect.width, rect.height);
    }

    _remove_border(actor) {
        if (this._get_border_for_actor(actor)) {
            let actor_parent = actor.get_parent();

            actor_parent.remove_child(this._get_border_for_actor(actor));

            if (pinnedWindowsData.has(actor)) {
                let info = pinnedWindowsData.get(actor);
                delete info[BORDER_FOR_PINNED_WINDOW_ACTOR];
            }
        }
    }

    // Windows Mark

    /*
    By marking window, i mean pinnedWindowsData.has(actor). it normally has signals attached to it.
    We generally only remove the signals when we unmark.

    However, Whether it has border or not is irrelevant.
    A marked window may not have border attached to it.

    The only one way to unmark a marked window is _unmark_window
    */

    /* Please note that _unmark_window and _remove_border is not same.

    This is important because when minimizing window, we _remove_border
    but we have to get the border back when we unminimize.

    This is also true for _update_borders. We have to add border to the window again.

    This is also true for _add_border. We have to add border to the window again.
    */

    _mark_window(actor) {
        this._add_border(actor);
        this._add_window_signals(actor);
    }

    _unmark_window(actor) {
        this._remove_border(actor);
        this._remove_window_signals(actor);
        pinnedWindowsData.delete(actor);
    }

    _unmark_windows() {
        pinnedWindowsData.forEach((_, actor) => {
            this._unmark_window(actor);
        });
    }

    _toggle_mark(actor) {
        if (pinnedWindowsData.has(actor)) {
            this._unmark_window(actor);
        } else {
            this._mark_window(actor);
        }
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsPinnedWindows org.gnome.Shell.Extensions.GnomeUtilsPinnedWindows.ActivatePinnedWindows

    ActivatePinnedWindows() {
        Array.from(pinnedWindowsData.keys()).map(actor => {
            let win = actor.get_meta_window();
            let win_workspace = win.get_workspace();
            win_workspace.activate_with_focus(win, 0);
        });
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsPinnedWindows org.gnome.Shell.Extensions.GnomeUtilsPinnedWindows.GetPinnedWindows

    GetPinnedWindows() {
        let markedWindows = Array.from(pinnedWindowsData.keys()).map(actor =>
            actor.get_meta_window().get_id()
        );

        return JSON.stringify(markedWindows);
    }

    // dbus-send --print-reply=literal --session --dest=org.gnome.Shell /org/gnome/Shell/Extensions/GnomeUtilsPinnedWindows org.gnome.Shell.Extensions.GnomeUtilsPinnedWindows.TogglePinsFocusedWindow

    TogglePinsFocusedWindow() {
        let win = Display.get_focus_window();
        let actor = win.get_compositor_private();
        this._toggle_mark(actor);

        // pinnedWindowsData.forEach((innerMap, actor) => {
        //     const win = actor.get_meta_window();                // nicer key info
        //     log(`Window ID: ${win.get_id()}`);

        //     if (innerMap instanceof Map) {
        //         innerMap.forEach((v, k) => {
        //             log(`   ├─ ${k} → ${JSON.stringify(v)}`);
        //         });
        //     } else {
        //         log(`   └─ ${JSON.stringify(innerMap, null, 2)}`);
        //     }
        // });

        pinnedWindowsData.forEach((data, actor) => {
            const win = actor.get_meta_window();          // human‑readable window
            const windowId = win.get_id();

            ;
            log(`Window ID: ${windowId}`);
            log(`Window ID: ${actor[BORDER_FOR_PINNED_WINDOW_ACTOR]}`);
            // this._get_border_for_actor(actor);
        });
    }
};
