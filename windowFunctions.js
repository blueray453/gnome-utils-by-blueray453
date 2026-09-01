import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { createLogger } from './logger.js';

const journal = createLogger(import.meta.url);

const AppSystem = global.get_app_system();
const Display = global.get_display();
const WindowTracker = global.get_window_tracker();
const WorkspaceManager = global.get_workspace_manager();

const FSEARCH = "Io.github.cboxdoerfer.FSearch";
const VSCODIUM = "VSCodium";
const FIREFOX = "firefox-esr";
const NEMO = "Nemo";
const ALACRITTY = "Alacritty";

// privamive global variables can not be passed by reference that is why using objects. Array also work.

let align_windows_state_all_windows = { value: 0 };

// distinguish which functions just return window id and which return details. We can extract id from details. so specific id is not needed

// those functions which have output will output as json error

export const MR_DBUS_IFACE = `
<node>
    <interface name="io.github.blueray453.GnomeUtils.Windows">
        <method name="AlignWindowsOfFocusedWindowWMClass">
        </method>
        <method name="CloseOtherWindowsCurrentWorkspaceOfFocusedWindowWMClass">
        </method>
        <method name="FocusFullscreenWindowOnCurrentWorkspace">
        </method>
        <method name="GetAppFocusedWindow">
            <arg type="s" direction="out" name="app" />
        </method>
        <method name="GetAppGivenAppID">
            <arg type="s" direction="in" name="app_id" />
            <arg type="s" direction="out" name="app" />
        </method>
        <method name="GetAppGivenPID">
            <arg type="u" direction="in" name="pid" />
            <arg type="s" direction="out" name="app" />
        </method>
        <method name="GetAppGivenWindowID">
            <arg type="u" direction="in" name="win_id" />
            <arg type="s" direction="out" name="icon" />
        </method>
        <method name="GetAppGivenWMClass">
            <arg type="s" direction="in" name="wm_class" />
            <arg type="s" direction="out" name="windows" />
        </method>
        <method name="GetAppsRunning">
            <arg type="s" direction="out" name="app" />
        </method>
        <method name="GetAppsRunningGivenWMClass">
            <arg type="s" direction="in" name="wm_class" />
            <arg type="s" direction="out" name="is_running" />
        </method>
        <method name="GetWindowFocused">
            <arg type="s" direction="out" name="win" />
        </method>
        <method name="GetWindowGivenWindowID">
            <arg type="u" direction="in" name="win_id" />
            <arg type="s" direction="out" name="win" />
        </method>
        <method name="GetWindows">
            <arg type="s" direction="out" name="win" />
        </method>
        <method name="GetWindowCountCurrentWorkspace">
            <arg type="s" direction="out" name="count" />
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
        <method name="MaximizeWindowIfSingleOnCurrentWorkspace">
        </method>
        <method name="ToggleWindowsCurrentWorkspace">
        </method>
        <method name="GetWindowsExcludingGivenWMClass">
            <arg type="as" direction="in" name="wm_classes" />
            <arg type="s" direction="out" name="win" />
        </method>
        <method name="GetWindowsForRofi">
            <arg type="s" direction="out" name="win" />
        </method>
        <method name="GetWindowsGivenWMClass">
            <arg type="s" direction="in" name="wm_class" />
            <arg type="s" direction="out" name="wins" />
        </method>
        <method name="ToggleLookingGlass">
        </method>
        <method name="MinimizeOtherWindowsOfFocusedWindowWMClass">
        </method>
        <method name="WindowActivateGivenWinID">
            <arg type="u" direction="in" name="win_id" />
        </method>
        <method name="WindowCloseGivenWinID">
            <arg type="u" direction="in" name="win_id" />
        </method>
        <method name="WindowFullScreenGivenWinID">
            <arg type="u" direction="in" name="win_id" />
        </method>
        <method name="WindowMaximizeGivenWinID">
            <arg type="u" direction="in" name="win_id" />
        </method>
        <method name="WindowMinimizeGivenWinID">
            <arg type="u" direction="in" name="win_id" />
        </method>
        <method name="WindowMoveGivenWinID">
            <arg type="u" direction="in" name="win_id" />
            <arg type="u" direction="in" name="x" />
            <arg type="u" direction="in" name="y" />
        </method>
        <method name="WindowMoveResizeGivenWinID">
            <arg type="u" direction="in" name="win_id" />
            <arg type="u" direction="in" name="x" />
            <arg type="u" direction="in" name="y" />
            <arg type="u" direction="in" name="width" />
            <arg type="u" direction="in" name="height" />
        </method>
        <method name="WindowMoveToCurrentWorkspace">
            <arg type="u" direction="in" name="win_id" />
        </method>
        <method name="WindowMoveToExcludingGivenWMClasses">
            <arg type="as" direction="in" name="wm_classes" />
            <arg type="u" direction="in" name="workspace_num" />
        </method>
        <method name="WindowMoveToGivenWorkspaceGivenWinID">
            <arg type="u" direction="in" name="win_id" />
            <arg type="u" direction="in" name="workspace_num" />
        </method>
        <method name="WindowRaiseGivenWinID">
            <arg type="u" direction="in" name="win_id" />
        </method>
        <method name="WindowResizeGivenWinID">
            <arg type="u" direction="in" name="win_id" />
            <arg type="u" direction="in" name="width" />
            <arg type="u" direction="in" name="height" />
        </method>
        <method name="WindowsActivateGivenWMClass">
            <arg type="s" direction="in" name="wm_class" />
        </method>
        <method name="WindowsCloseDuplicateNemo">
        </method>
        <method name="WindowsMoveSideBySide">
            <arg type="u" direction="in" name="win_id_1" />
            <arg type="u" direction="in" name="win_id_2" />
        </method>
        <method name="WindowsMoveToGivenWorkspaceGivenWMClass">
            <arg type="s" direction="in" name="wm_class" />
            <arg type="u" direction="in" name="workspace_num" />
        </method>
        <method name="WindowUnmaximizeGivenWinID">
            <arg type="u" direction="in" name="win_id" />
        </method>
        <method name="WindowUnminimizeGivenWinID">
            <arg type="u" direction="in" name="win_id" />
        </method>
    </interface>
</node>`;

/**
 * Manages a shared-edge relationship between two or more side-by-side
 * tiled Meta.Windows. Resizing the boundary between any two adjacent
 * windows in the chain automatically resizes the neighbor across that
 * boundary, keeping the whole row filled.
 *
 * A chain owns every window passed to it exclusively - each window is
 * registered with exactly one chain at a time, so a synthetic resize
 * can never be misread as a user action by an unrelated tracker.
 */
class SharedEdgeChain {
    constructor(windows, areaLeft, areaRight, minWidth = 150, onEdgeChanged = null) {
        this.windows = windows; // ordered array, length >= 2
        this._areaLeft = areaLeft;
        this._areaRight = areaRight;
        this._minWidth = minWidth;
        this._onEdgeChanged = onEdgeChanged; // (boundaryIdx, newEdgeX) => void
        this._destroyed = false;
        this._processing = false;
        this._signals = [];
        this._expected = new Array(windows.length).fill(null);
        this._tolerance = 2;

        let rect0 = windows[0].get_frame_rect();
        this._workAreaY = rect0.y;
        this._workAreaHeight = rect0.height;

        this._edges = [];
        for (let i = 0; i < windows.length - 1; i++) {
            let r = windows[i].get_frame_rect();
            this._edges.push(r.x + r.width);
        }
    }

    enable() {
        if (this._destroyed) return;

        this.windows.forEach((win, idx) => {
            const onChanged = () => this._onGeometryChanged(idx);
            const onBreak = () => this.destroy();

            this._signals.push([win, win.connect('size-changed', onChanged)]);
            this._signals.push([win, win.connect('position-changed', onChanged)]);
            this._signals.push([win, win.connect('unmanaging', onBreak)]);
            this._signals.push([win, win.connect('notify::maximized-horizontally', onBreak)]);
            this._signals.push([win, win.connect('notify::maximized-vertically', onBreak)]);
            this._signals.push([win, win.connect('notify::minimized', onBreak)]);
        });
    }

    _rectsEqual(r1, r2) {
        return r1 && r2 && r1.x === r2.x && r1.y === r2.y &&
            r1.width === r2.width && r1.height === r2.height;
    }

    _near(a, b) {
        return Math.abs(a - b) <= this._tolerance;
    }

    // A chain is only "shared-edge live" while: no window is maximized
    // or minimized, the outer left/right edges of the whole row are
    // still pinned to the tiled area, and every window keeps its
    // original vertical span. (Deliberately no "still touching" check
    // between adjacent windows - that is momentarily false during
    // every legitimate resize and gets restored by the resize itself.)
    _stillValid() {
        for (const win of this.windows) {
            if (win.maximized_horizontally || win.maximized_vertically || win.minimized)
                return false;
        }

        let n = this.windows.length;
        let firstRect = this.windows[0].get_frame_rect();
        let lastRect = this.windows[n - 1].get_frame_rect();

        if (!this._near(firstRect.x, this._areaLeft)) return false;
        if (!this._near(lastRect.x + lastRect.width, this._areaRight)) return false;

        for (const win of this.windows) {
            let r = win.get_frame_rect();
            if (!this._near(r.y, this._workAreaY)) return false;
            if (!this._near(r.height, this._workAreaHeight)) return false;
        }

        return true;
    }

    _onGeometryChanged(idx) {
        if (this._destroyed || this._processing) return;

        let rect = this.windows[idx].get_frame_rect();

        // Ignore our own synthetic change to this window.
        if (this._rectsEqual(rect, this._expected[idx])) return;

        if (!this._stillValid()) {
            journal(`SharedEdgeChain: chain no longer tiled, stopping shared-edge tracking`);
            this.destroy();
            return;
        }

        let n = this.windows.length;
        let leftEdgePrev = idx === 0 ? this._areaLeft : this._edges[idx - 1];
        let rightEdgePrev = idx === n - 1 ? this._areaRight : this._edges[idx];

        let newLeft = rect.x;
        let newRight = rect.x + rect.width;

        this._processing = true;
        try {
            // This window's left boundary moved -> resize its left neighbor.
            if (idx > 0 && !this._near(newLeft, leftEdgePrev)) {
                let lowerBound = (idx - 1 === 0 ? this._areaLeft : this._edges[idx - 2]) + this._minWidth;
                let clamped = Math.max(lowerBound, Math.min(rightEdgePrev - this._minWidth, newLeft));
                this._edges[idx - 1] = clamped;

                let leftWin = this.windows[idx - 1];
                let leftRect = leftWin.get_frame_rect();
                let newLeftWinRect = {
                    x: leftRect.x, y: leftRect.y,
                    width: clamped - leftRect.x, height: leftRect.height,
                };
                this._expected[idx - 1] = newLeftWinRect;
                leftWin.move_resize_frame(1, newLeftWinRect.x, newLeftWinRect.y, newLeftWinRect.width, newLeftWinRect.height);

                if (clamped !== newLeft) {
                    let selfRect = { x: clamped, y: rect.y, width: rightEdgePrev - clamped, height: rect.height };
                    this._expected[idx] = selfRect;
                    this.windows[idx].move_resize_frame(1, selfRect.x, selfRect.y, selfRect.width, selfRect.height);
                }

                if (this._onEdgeChanged) this._onEdgeChanged(idx - 1, clamped);
            }

            // This window's right boundary moved -> resize its right neighbor.
            if (idx < n - 1 && !this._near(newRight, rightEdgePrev)) {
                let upperBound = (idx + 1 === n - 1 ? this._areaRight : this._edges[idx + 1]) - this._minWidth;
                let clamped = Math.max(leftEdgePrev + this._minWidth, Math.min(upperBound, newRight));
                this._edges[idx] = clamped;

                let rightWin = this.windows[idx + 1];
                let rightRect = rightWin.get_frame_rect();
                let newRightWinRect = {
                    x: clamped, y: rightRect.y,
                    width: (rightRect.x + rightRect.width) - clamped, height: rightRect.height,
                };
                this._expected[idx + 1] = newRightWinRect;
                rightWin.move_resize_frame(1, newRightWinRect.x, newRightWinRect.y, newRightWinRect.width, newRightWinRect.height);

                if (clamped !== newRight) {
                    let selfRect = { x: rect.x, y: rect.y, width: clamped - rect.x, height: rect.height };
                    this._expected[idx] = selfRect;
                    this.windows[idx].move_resize_frame(1, selfRect.x, selfRect.y, selfRect.width, selfRect.height);
                }

                if (this._onEdgeChanged) this._onEdgeChanged(idx, clamped);
            }
        } finally {
            this._processing = false;
        }
    }

    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;
        this._signals.forEach(([win, id]) => {
            try { win.disconnect(id); } catch (e) { /* already gone */ }
        });
        this._signals = [];
    }
}

export class WindowFunctions {

    /* Get Properties */

    _get_properties_brief_given_app_id(app_id) {
        let shell_apps = AppSystem.lookup_app(app_id);
        let desktop_apps = shell_apps.get_app_info();

        // NOTE: GioUnix.DesktopAppInfo inherited Gio.AppInfo
        // get_display_name is a function of AppInfo which is DesktopAppInfo inherited

        let windows_array = [];

        shell_apps.get_windows().forEach(function (w) {
            windows_array.push(w.get_id());
        })

        if (app_id) {
            return {
                app_name: desktop_apps.get_name(),
                app_file_name: desktop_apps.get_filename(),
                app_display_name: desktop_apps.get_display_name(),
                app_id: desktop_apps.get_id(),
                wm_class: desktop_apps.get_startup_wm_class(),
                app_pids: shell_apps.get_pids(),
                app_icon: shell_apps.get_icon()?.to_string(),
                app_windows_number: shell_apps.get_n_windows(),
                app_windows: windows_array,
                state: shell_apps.get_state(),
                description: shell_apps.get_description(),
                commandline: desktop_apps.get_commandline(),
                executable: desktop_apps.get_executable(),
            };
        } else {
            throw new Error('Not found');
        }
    }

    _get_properties_brief_given_meta_window(win, show_is_covered = false) {
        let workspace_id = win.get_workspace().index();

        let obj = {
            id: win.get_id(),
            type: win.get_window_type(),
            title: win.get_title(),
            pid: win.get_pid(),
            wm_class: win.get_wm_class(),
            wm_class_instance: win.get_wm_class_instance(),
            workspace_id: workspace_id,
            workspace_name: Meta.prefs_get_workspace_name(workspace_id),
            monitor: win.get_monitor()
        };

        if (show_is_covered) {
            obj.is_covered = this._is_covered(win);
        }

        return obj;
    }

    /* Get Normal Windows */

    /*
       There is a difference between _get_normal_window and _get_normal_windows

       _get_normal_window use find
       _get_normal_windows use filter

       find returns first element of the array that satisfies the condition specified in the callback function.
       filter returns all the elements of the array that satisfy the condition specified in the callback function.
    */

    _get_normal_windows() {
        let wins = Display.list_all_windows()
            .filter(win =>
                win.get_window_type() === Meta.WindowType.NORMAL ||
                win.get_window_type() === Meta.WindowType.DIALOG
            )
            .sort((a, b) => a.get_stable_sequence() - b.get_stable_sequence()); // ascending order

        return wins;
    }

    _get_normal_windows_current_workspace() {
        let current_workspace = WorkspaceManager.get_active_workspace();

        let wins = this._get_normal_windows().filter(win =>
            win.is_on_all_workspaces() || win.get_workspace() === current_workspace
        );

        return wins;
    }

    _get_normal_windows_current_workspace_current_monitor() {
        // Get the current monitor (in focus)
        let current_monitor = Display.get_current_monitor();

        // Filter windows based on both workspace and monitor
        let wins = this._get_normal_windows_current_workspace().filter(w => w.get_monitor() === current_monitor);

        return wins;
    }

    _get_normal_windows_current_workspace_of_focused_window_wm_class() {
        let win = Display.get_focus_window();
        let win_wm_class = win.get_wm_class();

        return this._get_normal_windows_current_workspace_given_wm_class(win_wm_class);
    }

    _get_normal_windows_current_workspace_given_wm_class(wm_class) {
        return this._get_normal_windows_current_workspace().filter(w => w.get_wm_class() == wm_class);
    }

    _get_normal_windows_excluding_given_wm_classes(wm_classes) {
        return this._get_normal_windows().filter(w => !wm_classes.includes(w.get_wm_class()))
    }

    _get_normal_window_given_window_id(win_id) {
        // find does not need filtered window. As it return one result. However keeping it for readability
        let win = this._get_normal_windows().find(w => w?.get_id() == win_id);
        return win ?? null;
    }

    _get_normal_windows_given_wm_class(wm_class) {
        return this._get_normal_windows().filter(w => w.get_wm_class() == wm_class);
    }

    _get_other_normal_windows_current_workspace_of_focused_window_wm_class() {
        let win = Display.get_focus_window();
        return this._get_normal_windows_current_workspace_given_wm_class(win.get_wm_class()).filter(w => win != w);
    }

    /* Utility Functions */

    _align_windows(windows_array, windows_per_container, global_object) {
        let number_of_windows = windows_array.length;
        let number_of_states = Math.ceil(number_of_windows / windows_per_container);

        let state = global_object.value;

        if (state >= number_of_states) {
            state = 0;
        }

        let current_workspace = WorkspaceManager.get_active_workspace();
        let work_area = current_workspace.get_work_area_all_monitors();
        let work_area_width = work_area.width;
        let window_height = work_area.height;

        // minimize all the windows
        windows_array.forEach(win => win?.minimize());

        let group = [];
        for (let i = state * windows_per_container; i < windows_array.length && group.length < windows_per_container; i++) {
            group.push(windows_array[i]);
        }

        let n = group.length;
        if (n === 0) {
            global_object.value = state + 1;
            return;
        }

        if (this._alignmentEdgeRatios === undefined) {
            this._alignmentEdgeRatios = new Map();
        }

        const minWidth = 150;
        let equalWidth = work_area_width / n;

        // n-1 internal boundaries; default to equal split, then
        // substitute any remembered ratio for that specific window pair.
        let edges = [];
        for (let j = 0; j < n - 1; j++) {
            edges.push((j + 1) * equalWidth);
        }
        for (let j = 0; j < n - 1; j++) {
            let winA = group[j], winB = group[j + 1];
            if (!winA || !winB) continue;
            let key = this._edge_ratio_key(winA, winB);
            if (this._alignmentEdgeRatios.has(key)) {
                edges[j] = this._alignmentEdgeRatios.get(key) * work_area_width;
            }
        }

        // Clamp so every window keeps at least minWidth, preserving order.
        for (let j = 0; j < edges.length; j++) {
            let lower = (j === 0 ? 0 : edges[j - 1]) + minWidth;
            edges[j] = Math.max(edges[j], lower);
        }
        for (let j = edges.length - 1; j >= 0; j--) {
            let upper = (j === edges.length - 1 ? work_area_width : edges[j + 1]) - minWidth;
            edges[j] = Math.min(edges[j], upper);
        }

        let readyCount = { value: 0 };

        for (let j = 0; j < n; j++) {
            let win = group[j];
            if (!win) continue;

            let x = j === 0 ? 0 : edges[j - 1];
            let right = j === n - 1 ? work_area_width : edges[j];

            this._move_resize_window(win, x, 0, right - x, window_height, () => {
                readyCount.value++;
                if (readyCount.value === n) {
                    // All windows in this page finished their async
                    // placement - safe to start shared-edge tracking now.
                    this._enable_alignment_shared_edges(group, work_area_width);
                }
            });

            win.activate(0);
        }

        global_object.value = state + 1;
    }

    _window_matches(window, predicate) {
        if (window.minimized)
            return false;

        let windows = Display.sort_windows_by_stacking(
            this._get_normal_windows_current_workspace()
        );

        let targetIndex = windows.indexOf(window);
        if (targetIndex === -1)
            return false;

        let targetRect = window.get_frame_rect();

        // Check only windows above the target
        for (let i = targetIndex + 1; i < windows.length; i++) {
            let topWin = windows[i];

            if (topWin.minimized)
                continue;

            let topRect = topWin.get_frame_rect();

            if (predicate(targetRect, topRect))
                return true;
        }

        return false;
    }

    _is_covered(window) {
        return this._window_matches(window, (target, top) =>
            top.x <= target.x &&
            top.y <= target.y &&
            top.x + top.width >= target.x + target.width &&
            top.y + top.height >= target.y + target.height
        );
    }

    _is_covered_partially(window) {
        return this._window_matches(window, (target, top) =>
            target.x < top.x + top.width &&
            target.x + target.width > top.x &&
            target.y < top.y + top.height &&
            target.y + target.height > top.y
        );
    }

    _get_app_given_meta_window(win) {
        let app = WindowTracker.get_window_app(win);
        return app;
    }

    _make_window_movable_and_resizable(window) {
        // w.get_maximized() === Meta.MaximizeFlags.BOTH, checks if window is fullscreen

        const maxState = window.get_maximized();

        if (maxState & Meta.MaximizeFlags.BOTH) {
            window.unmaximize(Meta.MaximizeFlags.BOTH);
        }

        if (maxState & Meta.MaximizeFlags.HORIZONTAL) {
            window.unmaximize(Meta.MaximizeFlags.HORIZONTAL);
        }

        if (maxState & Meta.MaximizeFlags.VERTICAL) {
            window.unmaximize(Meta.MaximizeFlags.VERTICAL);
        }
    }

    _move_resize_window(meta_window, x_coordinate, y_coordinate, width, height, onComplete = null) {
        this._make_window_movable_and_resizable(meta_window);

        let windowReadyId = 0;

        windowReadyId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            meta_window.move_resize_frame(1, x_coordinate, y_coordinate, width, height);
            journal(`Alhamdulillah, moved meta_window`);
            windowReadyId = 0;
            if (onComplete) {
                onComplete();
            }
            return GLib.SOURCE_REMOVE;
        });

        meta_window.connect('unmanaging', () => {
            if (windowReadyId)
                GLib.Source.remove(windowReadyId);
        });
    }

    _move_windows_side_by_side(win_id_1, win_id_2) {
        let win1 = this._get_normal_window_given_window_id(win_id_1);
        let win2 = this._get_normal_window_given_window_id(win_id_2);

        if (win1 !== null && win2 !== null) {
            let work_area = win1.get_work_area_current_monitor();

            let work_area_width = work_area.width;
            let work_area_height = work_area.height;

            let window_height = work_area_height;
            let window_width = work_area_width / 2;

            let readyCount = { value: 0 };
            const onTileComplete = () => {
                readyCount.value++;
                if (readyCount.value === 2) {
                    // Both windows finished their async idle_add resize -
                    // safe to start tracking shared-edge resizes now.
                    this._enable_shared_edge_chain([win1, win2], 0, work_area_width);
                }
            };

            this._move_resize_window(win1, 0, 0, window_width, window_height, onTileComplete);
            this._move_resize_window(win2, window_width, 0, window_width, window_height, onTileComplete);
        }
    }

    _move_windows_to_given_workspace_given_wm_class(wm_class, workspace_num) {
        let wins = this._get_normal_windows_given_wm_class(wm_class);

        wins.forEach(win => {
            const currentIndex = win.get_workspace().index?.() ?? workspace_num;
            if (currentIndex !== workspace_num) {
                win.change_workspace_by_index(workspace_num, false);
            }
        });
    }

    /* Shared-edge tiling */

    _edge_ratio_key(winA, winB) {
        return `${winA.get_id()}:${winB.get_id()}`;
    }

    _enable_shared_edge_chain(windows, areaLeft, areaRight, onEdgeChanged = null) {
        if (windows.length < 2) return;
        if (this._sharedEdgeChains === undefined) this._sharedEdgeChains = [];

        // A window can only belong to one chain at a time - destroy
        // any existing chain that overlaps with these windows first.
        let windowSet = new Set(windows);
        this._sharedEdgeChains = this._sharedEdgeChains.filter(chain => {
            let overlaps = chain.windows.some(w => windowSet.has(w));
            if (overlaps) chain.destroy();
            return !overlaps;
        });

        let chain = new SharedEdgeChain(windows, areaLeft, areaRight, 150, onEdgeChanged);
        chain.enable();
        this._sharedEdgeChains.push(chain);
    }

    _enable_alignment_shared_edges(group, work_area_width) {
        let windows = group.filter(w => w);
        if (windows.length < 2) return;

        if (this._alignmentEdgeRatios === undefined) this._alignmentEdgeRatios = new Map();

        this._enable_shared_edge_chain(windows, 0, work_area_width, (idx, newEdgeX) => {
            let key = this._edge_ratio_key(windows[idx], windows[idx + 1]);
            this._alignmentEdgeRatios.set(key, newEdgeX / work_area_width);
        });
    }

    destroy() {
        if (this._sharedEdgeChains) {
            this._sharedEdgeChains.forEach(chain => chain.destroy());
            this._sharedEdgeChains = [];
        }
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.AlignWindowsOfFocusedWindowWMClass | jq .

    AlignWindowsOfFocusedWindowWMClass() {
        let windows_array = this._get_normal_windows_current_workspace_of_focused_window_wm_class();

        if (windows_array.length === 0) {
            windows_array = this._get_normal_windows_current_workspace_given_wm_class(NEMO);
        }

        let windows_per_container = 2;

        this._align_windows(windows_array, windows_per_container, align_windows_state_all_windows);
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.CloseOtherWindowsCurrentWorkspaceOfFocusedWindowWMClass

    CloseOtherWindowsCurrentWorkspaceOfFocusedWindowWMClass() {
        let wins = this._get_other_normal_windows_current_workspace_of_focused_window_wm_class();

        wins.forEach(function (w) {
            if (w.get_wm_class_instance() == 'file_progress') {
                return; // Skip this window if it's a 'file_progress' instance
            }

            w.delete(0);
        })
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.FocusFullscreenWindowOnCurrentWorkspace

    FocusFullscreenWindowOnCurrentWorkspace() {
        let wins = this._get_normal_windows_current_workspace();
        let win = wins.find(w =>
            (w.get_maximized() === Meta.MaximizeFlags.BOTH) &&
            !w.minimized &&
            !this._is_covered(w)
        );
        if (!win) {
            journal(`FocusFullscreenWindowOnCurrentWorkspace: no uncovered fullscreen window found`);
            return;
        }
        journal(`FocusFullscreenWindowOnCurrentWorkspace: found an uncovered fullscreen window`);
        let workspace = win.get_workspace();   // ✅ use 'win'
        workspace.activate_with_focus(win, 0); // ✅ use 'win'
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetAppFocusedWindow | jq .

    GetAppFocusedWindow() {
        let app = WindowTracker.get_focus_app();
        return JSON.stringify(this._get_properties_brief_given_app_id(app.get_id()));
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetAppGivenAppID string:"io.github.cboxdoerfer.FSearch.desktop" | jq .

    GetAppGivenAppID(app_id) {
        return JSON.stringify(this._get_properties_brief_given_app_id(app_id));
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetAppGivenPID uint32:3931313482 | jq .

    GetAppGivenPID(pid) {
        let app = WindowTracker.get_app_from_pid(pid);
        return JSON.stringify(this._get_properties_brief_given_app_id(app.get_id()));
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetAppGivenWindowID uint32:44129093 | jq .

    GetAppGivenWindowID(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);
        let app = WindowTracker.get_window_app(win.meta_window);
        return JSON.stringify(this._get_properties_brief_given_app_id(app.get_id()));
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetAppGivenWMClass string:"firefox-esr" | jq

    GetAppGivenWMClass(wmclass) {
        let app = AppSystem.lookup_desktop_wmclass(wmclass);
        return JSON.stringify(this._get_properties_brief_given_app_id(app.get_id()));
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetAppsRunning | jq .

    GetAppsRunning() {
        let apps = AppSystem.get_running();
        let results = [];

        apps.forEach(app => {
            let app_id = app.get_id();
            try {
                let info = this._get_properties_brief_given_app_id(app_id);
                results.push(info);
            } catch (err) {
                results.push({ app_id, error: err.message });
            }
        });

        return JSON.stringify(results);
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetAppsRunningGivenWMClass string:"firefox-esr" | xargs

    GetAppsRunningGivenWMClass(wm_class) {
        let wins = this._get_normal_windows_given_wm_class(wm_class);
        return JSON.stringify(wins.length > 0);
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetWindowFocused | jq -r '.[].id'

    GetWindowFocused() {
        let win = Display.get_focus_window();
        let winPropertiesArr = this._get_properties_brief_given_meta_window(win);

        return JSON.stringify(winPropertiesArr);
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetWindowGivenWindowID uint32:44129093

    GetWindowGivenWindowID(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);

        return JSON.stringify(this._get_properties_brief_given_meta_window(win, true));
    }

    //  dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetWindows | jq .

    GetWindows() {
        let wins = this._get_normal_windows();

        let winPropertiesArr = wins.map(win => this._get_properties_brief_given_meta_window(win));

        return JSON.stringify(winPropertiesArr);
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetWindowCountCurrentWorkspace

    GetWindowCountCurrentWorkspace() {
        return JSON.stringify(this._get_normal_windows_current_workspace().length);
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetWindowsCurrentWorkspace | jq .

    GetWindowsCurrentWorkspace() {
        let wins = this._get_normal_windows_current_workspace();

        let winPropertiesArr = wins.map(win => this._get_properties_brief_given_meta_window(win, true));

        return JSON.stringify(winPropertiesArr);
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetWindowsCurrentWorkspaceCurrentMonitor | jq .

    GetWindowsCurrentWorkspaceCurrentMonitor() {
        let wins = this._get_normal_windows_current_workspace_current_monitor();

        let winPropertiesArr = wins.map(win => this._get_properties_brief_given_meta_window(win, true));

        return JSON.stringify(winPropertiesArr);
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetWindowsCurrentWorkspaceOfFocusedWindowWMClass | jq -r '.[].id'

    GetWindowsCurrentWorkspaceOfFocusedWindowWMClass() {
        let wins = this._get_normal_windows_current_workspace_of_focused_window_wm_class();

        let winPropertiesArr = wins.map(win => this._get_properties_brief_given_meta_window(win));

        return JSON.stringify(winPropertiesArr);
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.MaximizeWindowIfSingleOnCurrentWorkspace

    MaximizeWindowIfSingleOnCurrentWorkspace() {
        let windows = this._get_normal_windows_current_workspace();

        if (windows.length !== 1)
            return false;

        let minimizedWindow = windows.find(w => w.minimized);

        if (minimizedWindow) {
            minimizedWindow.unminimize();

            let workspace = minimizedWindow.get_workspace();

            minimizedWindow.maximize(3);

            workspace.activate_with_focus(minimizedWindow, 0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.ToggleWindowsCurrentWorkspace

    ToggleWindowsCurrentWorkspace() {
        let windows =
            this._get_normal_windows_current_workspace();

        if (windows.length !== 2)
            return false;

        let minimizedWindow = windows.find(w => w.minimized);

        if (minimizedWindow) {
            minimizedWindow.unminimize();

            let workspace = minimizedWindow.get_workspace();

            minimizedWindow.maximize(3);
            workspace.activate_with_focus(minimizedWindow, 0);

            return true;
        }

        let covered = windows.find(w => this._is_covered_partially(w));

        if (!covered)
            return false;

        let workspace = covered.get_workspace();

        workspace.activate_with_focus(covered, 0);

        return true;
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetWindowsExcludingGivenWMClass array:string:"Io.github.cboxdoerfer.FSearch","VSCodium","firefox-esr","Nemo","Alacritty" | jq .

    GetWindowsExcludingGivenWMClass(wm_classes) {
        let wins = this._get_normal_windows_excluding_given_wm_classes(wm_classes);

        let winPropertiesArr = wins.map(win => this._get_properties_brief_given_meta_window(win));

        return JSON.stringify(winPropertiesArr);
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetWindowsForRofi | jq .

    GetWindowsForRofi() {
        let wins = this._get_normal_windows();

        const classOrder = {
            [FSEARCH]: 1,
            [VSCODIUM]: 2,
            [FIREFOX]: 3,
            [NEMO]: 4,
            [ALACRITTY]: 5,
        };

        wins.sort((winA, winB) => {
            let orderA = classOrder[winA.wm_class] || Number.MAX_SAFE_INTEGER;
            let orderB = classOrder[winB.wm_class] || Number.MAX_SAFE_INTEGER;

            if (orderA === orderB) {
                let userTimeA = winA.get_stable_sequence();
                let userTimeB = winB.get_stable_sequence();
                return userTimeB - userTimeA;
            }

            return orderA - orderB;
        });

        let winPropertiesArr = wins.map(win => this._get_properties_brief_given_meta_window(win));

        return JSON.stringify(winPropertiesArr);
    }

    //  dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetWindowsGivenWMClass string:"firefox-esr" | jq -r '.[].id'

    GetWindowsGivenWMClass(wm_class) {
        let wins = this._get_normal_windows_given_wm_class(wm_class);

        let winPropertiesArr = wins.map(win => this._get_properties_brief_given_meta_window(win));

        return JSON.stringify(winPropertiesArr);
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.ToggleLookingGlass

    ToggleLookingGlass() {
        if (Main.lookingGlass === null) {
            Main.createLookingGlass();
        }
        Main.lookingGlass.toggle();
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.MinimizeOtherWindowsOfFocusedWindowWMClass

    MinimizeOtherWindowsOfFocusedWindowWMClass() {
        let wins = this._get_other_normal_windows_current_workspace_of_focused_window_wm_class();
        wins.map(w => w.minimize());
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowActivateGivenWinID uint32:44129093

    WindowActivateGivenWinID(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);
        if (win !== null) {
            let win_workspace = win.get_workspace();
            win_workspace.activate_with_focus(win, 0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowCloseGivenWinID uint32:44129093

    WindowCloseGivenWinID(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);

        if (win !== null) {
            win.delete(0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowFullScreenGivenWinID uint32:44129093

    WindowFullScreenGivenWinID(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);

        if (win !== null) {
            let win_workspace = win.get_workspace();
            win.maximize(3);
            win_workspace.activate_with_focus(win, 0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowMaximizeGivenWinID uint32:3931313482

    WindowMaximizeGivenWinID(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);

        if (win !== null) {
            if (win.minimized) {
                win.unminimize();
            }

            win.maximize(3);
            win.activate(0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowMinimizeGivenWinID uint32:3931313482

    WindowMinimizeGivenWinID(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);
        if (win !== null) {
            win.minimize();
        }
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowMoveGivenWinID uint32:44129093 uint32:100 uint32:200

    WindowMoveGivenWinID(win_id, x, y) {
        let win = this._get_normal_window_given_window_id(win_id);
        if (win !== null) {
            this._make_window_movable_and_resizable(win);
            win.move_frame(1, x, y);
            win.activate(0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowMoveResizeGivenWinID uint32:44129093 uint32:0 uint32:0 uint32:0 uint32:0

    WindowMoveResizeGivenWinID(win_id, x, y, width, height) {
        let win = this._get_normal_window_given_window_id(win_id);

        if (win !== null) {
            this._move_resize_window(win, x, y, width, height);

            win.activate(0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowMoveToCurrentWorkspace uint32:44129093

    WindowMoveToCurrentWorkspace(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);

        if (win !== null) {
            let current_workspace = WorkspaceManager.get_active_workspace();
            win.change_workspace(current_workspace);
        }
    }

    //  dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowMoveToExcludingGivenWMClasses array:string:"Io.github.cboxdoerfer.FSearch","VSCodium","firefox-esr","Nemo","Alacritty" uint32:7

    WindowMoveToExcludingGivenWMClasses(wm_classes, workspace_num) {
        let wins = this._get_normal_windows_excluding_given_wm_classes(wm_classes);
        wins.forEach(win => {
            if (win !== null) {
                win.change_workspace_by_index(workspace_num, false);
            }
        });
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowMoveToGivenWorkspaceGivenWinID uint32:44129093 uint32:0

    WindowMoveToGivenWorkspaceGivenWinID(win_id, workspace_num) {
        let win = this._get_normal_window_given_window_id(win_id);

        if (win !== null) {
            win.change_workspace_by_index(workspace_num, false);
        }
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowRaiseGivenWinID uint32:44129093

    WindowRaiseGivenWinID(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);
        if (win !== null) {
            win.raise();
            win.raise_and_make_recent();
        }
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowResizeGivenWinID uint32:44129093 uint32:800 uint32:600

    WindowResizeGivenWinID(win_id, width, height) {
        let win = this._get_normal_window_given_window_id(win_id);
        if (win !== null) {
            this._move_resize_window(win, win.get_x(), win.get_y(), width, height);
            win.activate(0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowsActivateGivenWMClass string:"firefox-esr"

    WindowsActivateGivenWMClass(wm_class) {
        let wins = this._get_normal_windows_given_wm_class(wm_class);

        wins.forEach(win => {
            let win_workspace = win.get_workspace();
            win_workspace.activate_with_focus(win, 0);
        });
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowsCloseDuplicateNemo

    WindowsCloseDuplicateNemo() {
        let wins = this._get_normal_windows_current_workspace_given_wm_class(NEMO);

        wins.forEach(function (w) {
            if (w.get_wm_class_instance() == 'file_progress') {
                return; // Skip this window if it's a 'file_progress' instance
            }

            w.delete(0);
        })

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

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowsMoveSideBySide uint32:win_id_1 uint32:win_id_2

    WindowsMoveSideBySide(win_id_1, win_id_2) {
        this._move_windows_side_by_side(win_id_1, win_id_2);
    }

    //  dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowsMoveToGivenWorkspaceGivenWMClass string:"firefox-esr" uint32:0

    WindowsMoveToGivenWorkspaceGivenWMClass(wm_class, workspace_num) {
        this._move_windows_to_given_workspace_given_wm_class(wm_class, workspace_num);
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowUnmaximizeGivenWinID uint32:44129093

    WindowUnmaximizeGivenWinID(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);

        if (win !== null) {
            this._make_window_movable_and_resizable(win);
            win.unmaximize(3);
            win.activate(0);
        }
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowUnminimizeGivenWinID uint32:44129093

    WindowUnminimizeGivenWinID(win_id) {
        let win = this._get_normal_window_given_window_id(win_id);
        if (win !== null) {
            if (win.minimized) {
                win.unminimize();
            }
        }
    }
}