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

const FILE_PROGRESS_INSTANCE = 'file_progress';

// "privamive" global state that needs to be passed by reference.
const alignWindowsState = { value: 0 };

const state = {
    alignmentEdgeRatios: new Map(),
    sharedEdgeChains: [],
};

export const MR_DBUS_IFACE = `
<node>
    <interface name="io.github.blueray453.GnomeUtils.Windows">
        <method name="AlignWindowsOfFocusedWindowWMClass">
        </method>
        <method name="CloseOtherWindowsCurrentWorkspaceOfFocusedWindowWMClass">
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
        <method name="ToggleWindowsCurrentWorkspace">
        </method>
        <method name="GetWindowsExcludingGivenWMClass">
            <arg type="as" direction="in" name="wm_classes" />
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
        <method name="WindowUnminimizeGivenWinID">
            <arg type="u" direction="in" name="win_id" />
        </method>
    </interface>
</node>`;

// ---------------------------------------------------------------------------
// SharedEdgeChain.
//
// Genuine stateful object with per-instance lifecycle: multiple chains can
// be alive at once (one per aligned row), each owning its own signal
// handlers keyed on `this` as the connectObject context. This is the "OOP
// strictly needed" case.
// ---------------------------------------------------------------------------

class SharedEdgeChain {
    constructor(windows, areaLeft, areaRight, minWidth = 150, onEdgeChanged = null) {
        this.windows = windows;
        this._areaLeft = areaLeft;
        this._areaRight = areaRight;
        this._minWidth = minWidth;
        this._onEdgeChanged = onEdgeChanged;
        this._destroyed = false;
        this._processing = false;
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

            win.connectObject('size-changed', onChanged, this);
            win.connectObject('position-changed', onChanged, this);
            win.connectObject('unmanaging', onBreak, this);
            win.connectObject('notify::maximized-horizontally', onBreak, this);
            win.connectObject('notify::maximized-vertically', onBreak, this);
            win.connectObject('notify::minimized', onBreak, this);
        });
    }

    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;
        this.windows.forEach(win => {
            try { win.disconnectObject(this); } catch (e) { /* already gone */ }
        });
    }

    _rectsEqual(r1, r2) {
        return r1 && r2 && r1.x === r2.x && r1.y === r2.y &&
            r1.width === r2.width && r1.height === r2.height;
    }

    _near(a, b) {
        return Math.abs(a - b) <= this._tolerance;
    }

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
}

// ---------------------------------------------------------------------------
// Pure helpers.
// ---------------------------------------------------------------------------

export function getPropertiesBriefGivenAppId(app_id) {
    let shell_apps = AppSystem.lookup_app(app_id);
    let desktop_apps = shell_apps.get_app_info();

    let windows_array = [];
    shell_apps.get_windows().forEach(w => windows_array.push(w.get_id()));

    if (!app_id)
        throw new Error('Not found');

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
}

export function getPropertiesBriefGivenMetaWindow(win, show_is_covered = false) {
    let workspace_id = win.get_workspace().index();

    let obj = {
        id: win.get_id(),
        type: win.get_window_type(),
        title: win.get_title(),
        pid: win.get_pid(),
        wm_class: win.get_wm_class(),
        wm_class_instance: win.get_wm_class_instance(),
        workspace_id,
        workspace_name: Meta.prefs_get_workspace_name(workspace_id),
        monitor: win.get_monitor(),
    };

    if (show_is_covered)
        obj.is_covered = isCoveredFully(win);

    return obj;
}

/*
   Difference between getNormalWindow* and getNormalWindows*:
   find returns first match, filter returns all.
*/
function getNormalWindows() {
    return Display.list_all_windows()
        .filter(win =>
            win.get_window_type() === Meta.WindowType.NORMAL ||
            win.get_window_type() === Meta.WindowType.DIALOG
        )
        .sort((a, b) => a.get_stable_sequence() - b.get_stable_sequence());
}

function getNormalWindowsCurrentWorkspace() {
    let current_workspace = WorkspaceManager.get_active_workspace();
    return getNormalWindows().filter(win =>
        win.is_on_all_workspaces() || win.get_workspace() === current_workspace
    );
}

function getNormalWindowsCurrentWorkspaceCurrentMonitor() {
    let current_monitor = Display.get_current_monitor();
    return getNormalWindowsCurrentWorkspace().filter(w => w.get_monitor() === current_monitor);
}

function getNormalWindowsCurrentWorkspaceOfFocusedWindowWmClass() {
    let win = Display.get_focus_window();
    return getNormalWindowsCurrentWorkspaceGivenWmClass(win.get_wm_class());
}

function getNormalWindowsCurrentWorkspaceGivenWmClass(wm_class) {
    return getNormalWindowsCurrentWorkspace().filter(w => w.get_wm_class() == wm_class);
}

function getNormalWindowsExcludingGivenWmClasses(wm_classes) {
    return getNormalWindows().filter(w => !wm_classes.includes(w.get_wm_class()));
}

function getNormalWindowGivenWindowId(win_id) {
    let win = getNormalWindows().find(w => w?.get_id() == win_id);
    return win ?? null;
}

function getNormalWindowsGivenWmClass(wm_class) {
    return getNormalWindows().filter(w => w.get_wm_class() == wm_class);
}

export function getOtherNormalWindowsCurrentWorkspaceOfFocusedWindowWmClass() {
    let win = Display.get_focus_window();
    return getNormalWindowsCurrentWorkspaceGivenWmClass(win.get_wm_class()).filter(w => win != w);
}

function isCoveredFully(window) {
    if (window.minimized) return false;

    let windows = Display.sort_windows_by_stacking(getNormalWindowsCurrentWorkspace());

    let targetIndex = windows.indexOf(window);
    if (targetIndex === -1) return false;

    let targetRect = window.get_frame_rect();
    let monitor = window.get_monitor();
    let workArea = WorkspaceManager.get_active_workspace().get_work_area_for_monitor(monitor);

    let clippedTarget = {
        x: Math.max(targetRect.x, workArea.x),
        y: Math.max(targetRect.y, workArea.y),
        width: 0,
        height: 0,
    };
    let targetRight = Math.min(targetRect.x + targetRect.width, workArea.x + workArea.width);
    let targetBottom = Math.min(targetRect.y + targetRect.height, workArea.y + workArea.height);
    clippedTarget.width = targetRight - clippedTarget.x;
    clippedTarget.height = targetBottom - clippedTarget.y;

    if (clippedTarget.width <= 0 || clippedTarget.height <= 0) return false;

    let unionRect = null;

    for (let i = targetIndex + 1; i < windows.length; i++) {
        let topWin = windows[i];
        if (topWin.minimized) continue;

        let topRect = topWin.get_frame_rect();

        let clippedTop = {
            x: Math.max(topRect.x, workArea.x),
            y: Math.max(topRect.y, workArea.y),
            width: 0,
            height: 0,
        };
        let topRight = Math.min(topRect.x + topRect.width, workArea.x + workArea.width);
        let topBottom = Math.min(topRect.y + topRect.height, workArea.y + workArea.height);
        clippedTop.width = topRight - clippedTop.x;
        clippedTop.height = topBottom - clippedTop.y;

        if (clippedTop.width <= 0 || clippedTop.height <= 0) continue;

        if (unionRect === null) {
            unionRect = { ...clippedTop };
        } else {
            let x1 = Math.min(unionRect.x, clippedTop.x);
            let y1 = Math.min(unionRect.y, clippedTop.y);
            let x2 = Math.max(unionRect.x + unionRect.width, clippedTop.x + clippedTop.width);
            let y2 = Math.max(unionRect.y + unionRect.height, clippedTop.y + clippedTop.height);
            unionRect = { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
        }

        if (unionRect.x <= clippedTarget.x &&
            unionRect.y <= clippedTarget.y &&
            unionRect.x + unionRect.width >= clippedTarget.x + clippedTarget.width &&
            unionRect.y + unionRect.height >= clippedTarget.y + clippedTarget.height) {
            return true;
        }
    }

    return false;
}

function isCoveredFullyOrPartially(window) {
    if (window.minimized) return false;

    let windows = Display.sort_windows_by_stacking(getNormalWindowsCurrentWorkspace());

    let targetIndex = windows.indexOf(window);
    if (targetIndex === -1) return false;

    let targetRect = window.get_frame_rect();
    let monitor = window.get_monitor();
    let workArea = WorkspaceManager.get_active_workspace().get_work_area_for_monitor(monitor);

    let clippedTarget = {
        x: Math.max(targetRect.x, workArea.x),
        y: Math.max(targetRect.y, workArea.y),
        width: 0,
        height: 0,
    };
    let targetRight = Math.min(targetRect.x + targetRect.width, workArea.x + workArea.width);
    let targetBottom = Math.min(targetRect.y + targetRect.height, workArea.y + workArea.height);
    clippedTarget.width = targetRight - clippedTarget.x;
    clippedTarget.height = targetBottom - clippedTarget.y;

    if (clippedTarget.width <= 0 || clippedTarget.height <= 0) return false;

    for (let i = targetIndex + 1; i < windows.length; i++) {
        let topWin = windows[i];
        if (topWin.minimized) continue;

        let topRect = topWin.get_frame_rect();

        let clippedTop = {
            x: Math.max(topRect.x, workArea.x),
            y: Math.max(topRect.y, workArea.y),
            width: 0,
            height: 0,
        };
        let topRight = Math.min(topRect.x + topRect.width, workArea.x + workArea.width);
        let topBottom = Math.min(topRect.y + topRect.height, workArea.y + workArea.height);
        clippedTop.width = topRight - clippedTop.x;
        clippedTop.height = topBottom - clippedTop.y;

        if (clippedTop.width <= 0 || clippedTop.height <= 0) continue;

        if (clippedTarget.x < clippedTop.x + clippedTop.width &&
            clippedTarget.x + clippedTarget.width > clippedTop.x &&
            clippedTarget.y < clippedTop.y + clippedTop.height &&
            clippedTarget.y + clippedTarget.height > clippedTop.y) {
            return true;
        }
    }

    return false;
}

function isFileProgressWindow(win) {
    return win.get_wm_class_instance() === FILE_PROGRESS_INSTANCE;
}

function excludeFileProgressWindows(wins) {
    return wins.filter(w => !isFileProgressWindow(w));
}

function moveResizeWindow(meta_window, x_coordinate, y_coordinate, width, height, onComplete = null) {
    const maxState = meta_window.get_maximized();
    if (maxState & Meta.MaximizeFlags.BOTH)
        meta_window.unmaximize(Meta.MaximizeFlags.BOTH);

    let windowReadyId = 0;

    windowReadyId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
        meta_window.move_resize_frame(1, x_coordinate, y_coordinate, width, height);
        journal(`Alhamdulillah, moved meta_window`);
        windowReadyId = 0;
        if (onComplete)
            onComplete();
        return GLib.SOURCE_REMOVE;
    });

    meta_window.connect('unmanaging', () => {
        if (windowReadyId)
            GLib.Source.remove(windowReadyId);
    });
}

function edgeRatioKey(winA, winB) {
    return `${winA.get_id()}:${winB.get_id()}`;
}

function enableSharedEdgeChain(windows, areaLeft, areaRight, onEdgeChanged = null) {
    if (windows.length < 2) return;

    let windowSet = new Set(windows);
    state.sharedEdgeChains = state.sharedEdgeChains.filter(chain => {
        let overlaps = chain.windows.some(w => windowSet.has(w));
        if (overlaps) chain.destroy();
        return !overlaps;
    });

    let chain = new SharedEdgeChain(windows, areaLeft, areaRight, 150, onEdgeChanged);
    chain.enable();
    state.sharedEdgeChains.push(chain);
}

function enableAlignmentSharedEdges(group, work_area_width) {
    let windows = group.filter(w => w);
    if (windows.length < 2) return;

    enableSharedEdgeChain(windows, 0, work_area_width, (idx, newEdgeX) => {
        let key = edgeRatioKey(windows[idx], windows[idx + 1]);
        state.alignmentEdgeRatios.set(key, newEdgeX / work_area_width);
    });
}

function alignWindows(windows_array, windows_per_container, global_object) {
    let number_of_windows = windows_array.length;
    let number_of_states = Math.ceil(number_of_windows / windows_per_container);

    let current_state = global_object.value;
    if (current_state >= number_of_states)
        current_state = 0;

    let current_workspace = WorkspaceManager.get_active_workspace();
    let work_area = current_workspace.get_work_area_all_monitors();
    let work_area_width = work_area.width;
    let window_height = work_area.height;

    windows_array.forEach(win => win?.minimize());

    let group = [];
    for (let i = current_state * windows_per_container;
        i < windows_array.length && group.length < windows_per_container;
        i++) {
        group.push(windows_array[i]);
    }

    let n = group.length;
    if (n === 0) {
        global_object.value = current_state + 1;
        return;
    }

    const minWidth = 150;
    let equalWidth = work_area_width / n;

    let edges = [];
    for (let j = 0; j < n - 1; j++)
        edges.push((j + 1) * equalWidth);

    for (let j = 0; j < n - 1; j++) {
        let winA = group[j], winB = group[j + 1];
        if (!winA || !winB) continue;
        let key = edgeRatioKey(winA, winB);
        if (state.alignmentEdgeRatios.has(key))
            edges[j] = state.alignmentEdgeRatios.get(key) * work_area_width;
    }

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

        moveResizeWindow(win, x, 0, right - x, window_height, () => {
            readyCount.value++;
            if (readyCount.value === n)
                enableAlignmentSharedEdges(group, work_area_width);
        });

        win.activate(0);
    }

    global_object.value = current_state + 1;
}

function moveWindowsSideBySide(win_id_1, win_id_2) {
    let win1 = getNormalWindowGivenWindowId(win_id_1);
    let win2 = getNormalWindowGivenWindowId(win_id_2);
    if (win1 === null || win2 === null) return;

    let work_area = win1.get_work_area_current_monitor();
    let work_area_width = work_area.width;
    let window_height = work_area.height;
    let window_width = work_area_width / 2;

    let readyCount = { value: 0 };
    const onTileComplete = () => {
        readyCount.value++;
        if (readyCount.value === 2)
            enableSharedEdgeChain([win1, win2], 0, work_area_width);
    };

    moveResizeWindow(win1, 0, 0, window_width, window_height, onTileComplete);
    moveResizeWindow(win2, window_width, 0, window_width, window_height, onTileComplete);
}

function moveWindowsToGivenWorkspaceGivenWmClass(wm_class, workspace_num) {
    let wins = getNormalWindowsGivenWmClass(wm_class);

    wins.forEach(win => {
        const currentIndex = win.get_workspace().index?.() ?? workspace_num;
        if (currentIndex !== workspace_num)
            win.change_workspace_by_index(workspace_num, false);
    });
}

// ---------------------------------------------------------------------------
// DBus methods.
// ---------------------------------------------------------------------------

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.AlignWindowsOfFocusedWindowWMClass | jq .

function AlignWindowsOfFocusedWindowWMClass() {
    let windows_array = getNormalWindowsCurrentWorkspaceOfFocusedWindowWmClass();

    if (windows_array.length === 0)
        windows_array = getNormalWindowsCurrentWorkspaceGivenWmClass(NEMO);

    alignWindows(windows_array, 2, alignWindowsState);
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.CloseOtherWindowsCurrentWorkspaceOfFocusedWindowWMClass

function CloseOtherWindowsCurrentWorkspaceOfFocusedWindowWMClass() {
    let wins = getOtherNormalWindowsCurrentWorkspaceOfFocusedWindowWmClass();
    excludeFileProgressWindows(wins).forEach(w => w.delete(0));
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetAppFocusedWindow | jq .

function GetAppFocusedWindow() {
    let app = WindowTracker.get_focus_app();
    return JSON.stringify(getPropertiesBriefGivenAppId(app.get_id()));
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetAppGivenAppID string:"io.github.cboxdoerfer.FSearch.desktop" | jq .

function GetAppGivenAppID(app_id) {
    return JSON.stringify(getPropertiesBriefGivenAppId(app_id));
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetAppGivenPID uint32:3931313482 | jq .

function GetAppGivenPID(pid) {
    let app = WindowTracker.get_app_from_pid(pid);
    return JSON.stringify(getPropertiesBriefGivenAppId(app.get_id()));
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetAppGivenWindowID uint32:44129093 | jq .

function GetAppGivenWindowID(win_id) {
    let win = getNormalWindowGivenWindowId(win_id);
    let app = WindowTracker.get_window_app(win);
    return JSON.stringify(getPropertiesBriefGivenAppId(app.get_id()));
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetAppGivenWMClass string:"firefox-esr" | jq

function GetAppGivenWMClass(wmclass) {
    let app = AppSystem.lookup_desktop_wmclass(wmclass);
    return JSON.stringify(getPropertiesBriefGivenAppId(app.get_id()));
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetAppsRunning | jq .

function GetAppsRunning() {
    let apps = AppSystem.get_running();
    let results = [];

    apps.forEach(app => {
        let app_id = app.get_id();
        try {
            results.push(getPropertiesBriefGivenAppId(app_id));
        } catch (err) {
            results.push({ app_id, error: err.message });
        }
    });

    return JSON.stringify(results);
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetAppsRunningGivenWMClass string:"firefox-esr" | xargs

function GetAppsRunningGivenWMClass(wm_class) {
    let wins = getNormalWindowsGivenWmClass(wm_class);
    return JSON.stringify(wins.length > 0);
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetWindowFocused | jq -r '.[].id'

function GetWindowFocused() {
    let win = Display.get_focus_window();
    return JSON.stringify(getPropertiesBriefGivenMetaWindow(win));
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetWindowGivenWindowID uint32:44129093

function GetWindowGivenWindowID(win_id) {
    let win = getNormalWindowGivenWindowId(win_id);
    return JSON.stringify(getPropertiesBriefGivenMetaWindow(win, true));
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetWindows | jq .

function GetWindows() {
    let wins = getNormalWindows();
    return JSON.stringify(wins.map(win => getPropertiesBriefGivenMetaWindow(win)));
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetWindowCountCurrentWorkspace

function GetWindowCountCurrentWorkspace() {
    return JSON.stringify(getNormalWindowsCurrentWorkspace().length);
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetWindowsCurrentWorkspace | jq .

function GetWindowsCurrentWorkspace() {
    let wins = getNormalWindowsCurrentWorkspace();
    return JSON.stringify(wins.map(win => getPropertiesBriefGivenMetaWindow(win, true)));
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetWindowsCurrentWorkspaceCurrentMonitor | jq .

function GetWindowsCurrentWorkspaceCurrentMonitor() {
    let wins = getNormalWindowsCurrentWorkspaceCurrentMonitor();
    return JSON.stringify(wins.map(win => getPropertiesBriefGivenMetaWindow(win, true)));
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetWindowsCurrentWorkspaceOfFocusedWindowWMClass | jq -r '.[].id'

function GetWindowsCurrentWorkspaceOfFocusedWindowWMClass() {
    let wins = getNormalWindowsCurrentWorkspaceOfFocusedWindowWmClass();
    return JSON.stringify(wins.map(win => getPropertiesBriefGivenMetaWindow(win)));
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.ToggleWindowsCurrentWorkspace

function ToggleWindowsCurrentWorkspace() {
    let windows = getNormalWindowsCurrentWorkspace();
    if (windows.length !== 2) return false;

    let minimizedWindow = windows.find(w => w.minimized);
    if (minimizedWindow) {
        minimizedWindow.unminimize();

        let workspace = minimizedWindow.get_workspace();
        minimizedWindow.maximize(3);
        workspace.activate_with_focus(minimizedWindow, 0);

        return true;
    }

    let covered = windows.find(w => isCoveredFullyOrPartially(w));
    if (!covered) return false;

    let workspace = covered.get_workspace();
    workspace.activate_with_focus(covered, 0);

    return true;
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetWindowsExcludingGivenWMClass array:string:"Io.github.cboxdoerfer.FSearch","VSCodium","firefox-esr","Nemo","Alacritty" | jq .

function GetWindowsExcludingGivenWMClass(wm_classes) {
    let wins = getNormalWindowsExcludingGivenWmClasses(wm_classes);
    return JSON.stringify(wins.map(win => getPropertiesBriefGivenMetaWindow(win)));
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.GetWindowsGivenWMClass string:"firefox-esr" | jq -r '.[].id'

function GetWindowsGivenWMClass(wm_class) {
    let wins = getNormalWindowsGivenWmClass(wm_class);
    return JSON.stringify(wins.map(win => getPropertiesBriefGivenMetaWindow(win)));
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.ToggleLookingGlass

function ToggleLookingGlass() {
    if (Main.lookingGlass === null)
        Main.createLookingGlass();
    Main.lookingGlass.toggle();
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.MinimizeOtherWindowsOfFocusedWindowWMClass

function MinimizeOtherWindowsOfFocusedWindowWMClass() {
    getOtherNormalWindowsCurrentWorkspaceOfFocusedWindowWmClass().map(w => w.minimize());
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowActivateGivenWinID uint32:44129093

function WindowActivateGivenWinID(win_id) {
    let win = getNormalWindowGivenWindowId(win_id);
    if (win === null) return;
    win.get_workspace().activate_with_focus(win, 0);
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowCloseGivenWinID uint32:44129093

function WindowCloseGivenWinID(win_id) {
    let win = getNormalWindowGivenWindowId(win_id);
    if (win !== null) win.delete(0);
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowFullScreenGivenWinID uint32:44129093

function WindowFullScreenGivenWinID(win_id) {
    let win = getNormalWindowGivenWindowId(win_id);
    if (win === null) return;
    let win_workspace = win.get_workspace();
    win.maximize(3);
    win_workspace.activate_with_focus(win, 0);
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowMaximizeGivenWinID uint32:3931313482

function WindowMaximizeGivenWinID(win_id) {
    let win = getNormalWindowGivenWindowId(win_id);
    if (win === null) return;
    if (win.minimized) win.unminimize();
    win.maximize(3);
    win.activate(0);
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowMinimizeGivenWinID uint32:3931313482

function WindowMinimizeGivenWinID(win_id) {
    let win = getNormalWindowGivenWindowId(win_id);
    if (win !== null) win.minimize();
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowMoveGivenWinID uint32:44129093 uint32:100 uint32:200

function WindowMoveGivenWinID(win_id, x, y) {
    let win = getNormalWindowGivenWindowId(win_id);
    const rect = win.get_frame_rect();
    moveResizeWindow(win, x, y, rect.width, rect.height);
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowMoveResizeGivenWinID uint32:44129093 uint32:0 uint32:0 uint32:0 uint32:0

function WindowMoveResizeGivenWinID(win_id, x, y, width, height) {
    let win = getNormalWindowGivenWindowId(win_id);
    if (win === null) return;
    moveResizeWindow(win, x, y, width, height);
    win.activate(0);
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowMoveToCurrentWorkspace uint32:44129093

function WindowMoveToCurrentWorkspace(win_id) {
    let win = getNormalWindowGivenWindowId(win_id);
    if (win === null) return;
    win.change_workspace(WorkspaceManager.get_active_workspace());
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowMoveToExcludingGivenWMClasses array:string:"Io.github.cboxdoerfer.FSearch","VSCodium","firefox-esr","Nemo","Alacritty" uint32:7

function WindowMoveToExcludingGivenWMClasses(wm_classes, workspace_num) {
    let wins = getNormalWindowsExcludingGivenWmClasses(wm_classes);
    wins.forEach(win => {
        if (win !== null)
            win.change_workspace_by_index(workspace_num, false);
    });
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowMoveToGivenWorkspaceGivenWinID uint32:44129093 uint32:0

function WindowMoveToGivenWorkspaceGivenWinID(win_id, workspace_num) {
    let win = getNormalWindowGivenWindowId(win_id);
    if (win !== null)
        win.change_workspace_by_index(workspace_num, false);
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowRaiseGivenWinID uint32:44129093

function WindowRaiseGivenWinID(win_id) {
    let win = getNormalWindowGivenWindowId(win_id);
    if (win !== null) {
        win.raise();
        win.raise_and_make_recent();
    }
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowResizeGivenWinID uint32:44129093 uint32:800 uint32:600

function WindowResizeGivenWinID(win_id, width, height) {
    let win = getNormalWindowGivenWindowId(win_id);
    if (win === null) return;
    moveResizeWindow(win, win.get_x(), win.get_y(), width, height);
    win.activate(0);
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowsActivateGivenWMClass string:"firefox-esr"

function WindowsActivateGivenWMClass(wm_class) {
    let wins = getNormalWindowsGivenWmClass(wm_class);
    wins.forEach(win => {
        win.get_workspace().activate_with_focus(win, 0);
    });
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowsCloseDuplicateNemo

function WindowsCloseDuplicateNemo() {
    let wins = excludeFileProgressWindows(
        getNormalWindowsCurrentWorkspaceGivenWmClass(NEMO)
    );

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

function WindowsMoveSideBySide(win_id_1, win_id_2) {
    moveWindowsSideBySide(win_id_1, win_id_2);
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowsMoveToGivenWorkspaceGivenWMClass string:"firefox-esr" uint32:0

function WindowsMoveToGivenWorkspaceGivenWMClass(wm_class, workspace_num) {
    moveWindowsToGivenWorkspaceGivenWmClass(wm_class, workspace_num);
}

// dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/Windows io.github.blueray453.GnomeUtils.Windows.WindowUnminimizeGivenWinID uint32:44129093

function WindowUnminimizeGivenWinID(win_id) {
    let win = getNormalWindowGivenWindowId(win_id);
    if (win !== null && win.minimized)
        win.unminimize();
}

// ---------------------------------------------------------------------------
// Exports.
// ---------------------------------------------------------------------------

export const dbusObject = {
    AlignWindowsOfFocusedWindowWMClass,
    CloseOtherWindowsCurrentWorkspaceOfFocusedWindowWMClass,
    GetAppFocusedWindow,
    GetAppGivenAppID,
    GetAppGivenPID,
    GetAppGivenWindowID,
    GetAppGivenWMClass,
    GetAppsRunning,
    GetAppsRunningGivenWMClass,
    GetWindowFocused,
    GetWindowGivenWindowID,
    GetWindows,
    GetWindowCountCurrentWorkspace,
    GetWindowsCurrentWorkspace,
    GetWindowsCurrentWorkspaceCurrentMonitor,
    GetWindowsCurrentWorkspaceOfFocusedWindowWMClass,
    ToggleWindowsCurrentWorkspace,
    GetWindowsExcludingGivenWMClass,
    GetWindowsGivenWMClass,
    ToggleLookingGlass,
    MinimizeOtherWindowsOfFocusedWindowWMClass,
    WindowActivateGivenWinID,
    WindowCloseGivenWinID,
    WindowFullScreenGivenWinID,
    WindowMaximizeGivenWinID,
    WindowMinimizeGivenWinID,
    WindowMoveGivenWinID,
    WindowMoveResizeGivenWinID,
    WindowMoveToCurrentWorkspace,
    WindowMoveToExcludingGivenWMClasses,
    WindowMoveToGivenWorkspaceGivenWinID,
    WindowRaiseGivenWinID,
    WindowResizeGivenWinID,
    WindowsActivateGivenWMClass,
    WindowsCloseDuplicateNemo,
    WindowsMoveSideBySide,
    WindowsMoveToGivenWorkspaceGivenWMClass,
    WindowUnminimizeGivenWinID,
};

export function init() {
    state.alignmentEdgeRatios = new Map();
    state.sharedEdgeChains = [];
}

export function destroy() {
    state.sharedEdgeChains.forEach(chain => chain.destroy());
    state.sharedEdgeChains = [];
}