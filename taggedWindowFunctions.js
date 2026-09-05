import GObject from 'gi://GObject';
import St from 'gi://St';
import Meta from 'gi://Meta';

import * as windowFunctions from './windowFunctions.js';

import { createLogger } from './logger.js';

const journal = createLogger(import.meta.url);

const Display = global.get_display();
const WindowManager = global.get_window_manager();
const WindowTracker = global.get_window_tracker();
const WorkspaceManager = global.get_workspace_manager();

// -----------------------------------------------------------------------------
// Window state
// -----------------------------------------------------------------------------
// Bit flags make adding more state cheap:
//   1  = marked
//   2  = pinned
//
// The CSS class for the single border is built from every active flag.
const MARKED = 1;
const PINNED = 2;

const FLAG_TO_CLASS = new Map([
    [MARKED, 'marked'],
    [PINNED, 'pinned'],
]);

const ALL_STATE_FLAGS = [...FLAG_TO_CLASS.keys()]
    .reduce((flags, flag) => flags | flag, 0);

// -----------------------------------------------------------------------------
// WindowData
// -----------------------------------------------------------------------------
// WindowData is both the model for one MetaWindow and the registry of all
// WindowData instances, so TaggedWindowFunctions doesn't need lookup/creation
// helpers, state helpers, border helpers, or lifecycle plumbing of its own.
// -----------------------------------------------------------------------------
const WindowData = GObject.registerClass({
    GTypeName: 'GnomeUtilsTaggedWindowData',

    Properties: {
        'state': GObject.ParamSpec.uint(
            'state',
            'State',
            'Window state bitmask',
            GObject.ParamFlags.READWRITE,
            0,
            ALL_STATE_FLAGS,
            0,
        ),
    },
}, class WindowData extends GObject.Object {
    static _instances = new Map();

    // -------------------------------------------------------------------------
    // Registry
    // -------------------------------------------------------------------------

    static get(actor) {
        return actor ? WindowData._instances.get(actor) : undefined;
    }

    static getOrCreate(actor) {
        if (!actor)
            return null;

        return WindowData.get(actor) ?? new WindowData(actor);
    }

    static getMarked() {
        return [...WindowData._instances.values()].filter(data => data.is_marked);
    }

    static getPinned() {
        return [...WindowData._instances.values()].filter(data => data.is_pinned);
    }

    static unmarkAll() {
        for (const data of WindowData.getMarked())
            data.unmark();
    }

    static activatePinned() {
        for (const data of WindowData.getPinned())
            data.activate();
    }

    static toggleFocusedPin(display) {
        const win = display.get_focus_window();

        if (win?.get_window_type() !== Meta.WindowType.NORMAL)
            return;

        WindowData.getOrCreate(win.get_compositor_private())?.toggle_pin();
    }

    static toggleFocusedMark(display) {
        const win = display.get_focus_window();

        if (win?.get_window_type() !== Meta.WindowType.NORMAL)
            return;

        WindowData.getOrCreate(win.get_compositor_private())?.toggle_mark();
    }

    // -------------------------------------------------------------------------
    // Global Shell lifecycle
    // -------------------------------------------------------------------------

    static initialize() {
        if (WindowData._initialized)
            return;

        WindowData._initialized = true;

        WindowData._workspaceChangedId = WorkspaceManager.connect(
            'active-workspace-changed',
            () => WindowData._instances.forEach(data => data.syncWorkspace())
        );

        WindowData._minimizeId = WindowManager.connect(
            'minimize',
            (wm, actor) => WindowData.get(actor)?.removeBorder()
        );

        WindowData._unminimizeId = WindowManager.connect(
            'unminimize',
            (wm, actor) => WindowData.get(actor)?.syncWorkspace()
        );

        WindowData._restackedId = Display.connect('restacked', () => {
            const group = global.get_window_group();
            WindowData._instances.forEach(data => data.raiseBorder(group));
        });
    }

    static shutdown() {
        if (!WindowData._initialized)
            return;

        WindowData._initialized = false;

        for (const [object, id] of [
            [WorkspaceManager, WindowData._workspaceChangedId],
            [WindowManager, WindowData._minimizeId],
            [WindowManager, WindowData._unminimizeId],
            [Display, WindowData._restackedId],
        ]) {
            if (id)
                object.disconnect(id);
        }

        WindowData._workspaceChangedId = null;
        WindowData._minimizeId = null;
        WindowData._unminimizeId = null;
        WindowData._restackedId = null;

        for (const data of [...WindowData._instances.values()])
            data.destroy();

        WindowData._instances.clear();
    }

    // -------------------------------------------------------------------------
    // Instance
    // -------------------------------------------------------------------------

    constructor(actor) {
        super();

        this.actor = actor;
        this.win = actor.get_meta_window();
        this._border = null;
        this._destroyed = false;

        WindowData._instances.set(actor, this);

        // A state change is the single source of truth for border updates.
        // When state becomes empty, the object destroys and removes itself.
        this.connect('notify::state', () => {
            if (this.state === 0) {
                this.destroy();
                return;
            }

            this.syncBorder();
        });

        this._positionChangedId = this.win.connect('position-changed', () => this.syncBorder());
        this._sizeChangedId = this.win.connect('size-changed', () => this.syncBorder());
        this._workspaceChangedId = this.win.connect('workspace-changed', () => this.syncWorkspace());
        this._unmanagedId = this.win.connect('unmanaging', () => this.destroy());
    }

    // -------------------------------------------------------------------------
    // State property
    // -------------------------------------------------------------------------
    // Custom accessors so that no-op writes (e.g. unmark() on an already
    // unmarked window) don't emit notify::state and trigger a needless
    // syncBorder() pass. See:
    // https://gjs.guide/guides/gobject/subclassing.html#property-change-notification
    // -------------------------------------------------------------------------

    get state() {
        return this._state ?? 0;
    }

    set state(value) {
        if (this._state === value)
            return;

        this._state = value;
        this.notify('state');
    }

    // -------------------------------------------------------------------------
    // Derived state
    // -------------------------------------------------------------------------

    get is_marked() {
        return !!(this.state & MARKED);
    }

    get is_pinned() {
        return !!(this.state & PINNED);
    }

    get is_tagged() {
        return this.state !== 0;
    }

    // -------------------------------------------------------------------------
    // State transitions
    // -------------------------------------------------------------------------

    mark() {
        this.state |= MARKED;
    }

    unmark() {
        this.state &= ~MARKED;
    }

    toggle_mark() {
        this.state ^= MARKED;
    }

    pin() {
        this.state |= PINNED;
    }

    unpin() {
        this.state &= ~PINNED;
    }

    toggle_pin() {
        this.state ^= PINNED;
    }

    // -------------------------------------------------------------------------
    // Window actions
    // -------------------------------------------------------------------------

    activate() {
        if (this.win)
            this.win.get_workspace().activate_with_focus(this.win, 0);
    }

    keepOnCurrentWorkspace() {
        if (!this.win)
            return;

        const currentWorkspace = WorkspaceManager.get_active_workspace();

        if (this.win.get_workspace() !== currentWorkspace) {
            this.win.change_workspace(currentWorkspace);
            this.activate();
        }
    }

    syncWorkspace() {
        if (!this.win)
            return;

        const currentWorkspace = WorkspaceManager.get_active_workspace();

        if (this.is_pinned) {
            this.keepOnCurrentWorkspace();
            return;
        }

        if (this.is_marked && this.win.get_workspace() !== currentWorkspace) {
            this.removeBorder();
            return;
        }

        this.syncBorder();
    }

    // -------------------------------------------------------------------------
    // Single dynamic border
    // -------------------------------------------------------------------------

    get border() {
        if (this.state === 0)
            return null;

        const styleClass = [...FLAG_TO_CLASS.entries()]
            .filter(([flag]) => this.state & flag)
            .map(([, className]) => `${className}-border`)
            .join(' ');

        if (!this._border)
            this._border = new St.Bin({ style_class: styleClass });
        else if (this._border.style_class !== styleClass)
            this._border.style_class = styleClass;

        return this._border;
    }

    syncBorder() {
        if (!this.actor || !this.win || this.state === 0 || this.win.minimized) {
            this.removeBorder();
            return;
        }

        const parent = this.actor.get_parent();
        const border = this.border;

        if (!parent || !border)
            return;

        if (border.get_parent() !== parent) {
            if (border.get_parent())
                border.get_parent().remove_child(border);

            parent.add_child(border);
        }

        const rect = this.win.get_frame_rect();
        border.set_position(rect.x, rect.y);
        border.set_size(rect.width, rect.height);
    }

    removeBorder() {
        if (this._border?.get_parent())
            this._border.get_parent().remove_child(this._border);
    }

    raiseBorder(group) {
        if (this._border?.get_parent())
            group.set_child_above_sibling(this._border, this.actor);
    }

    // -------------------------------------------------------------------------
    // Cleanup
    // -------------------------------------------------------------------------

    destroy() {
        if (this._destroyed)
            return;

        this._destroyed = true;

        for (const [object, id] of [
            [this.win, this._positionChangedId],
            [this.win, this._sizeChangedId],
            [this.win, this._workspaceChangedId],
            [this.win, this._unmanagedId],
        ]) {
            if (object && id)
                object.disconnect(id);
        }

        this.removeBorder();

        if (this._border) {
            this._border.destroy();
            this._border = null;
        }

        if (this.actor && WindowData._instances.get(this.actor) === this)
            WindowData._instances.delete(this.actor);

        this.actor = null;
        this.win = null;
    }
});

// -----------------------------------------------------------------------------
// D-Bus interface
// -----------------------------------------------------------------------------
export const MR_DBUS_IFACE = `
<node>
   <interface name="io.github.blueray453.GnomeUtils.TaggedWindows">
      <method name="ActivatePinnedWindows">
      </method>
      <method name="GetAppDetailsMarkedWindows">
        <arg type="s" direction="out" name="app" />
       </method>
      <method name="GetPinnedWindows">
        <arg type="s" direction="out" name="win" />
      </method>
      <method name="TogglePinsFocusedWindow">
      </method>
      <method name="CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass">
      </method>
      <method name="GetMarkedWindows">
        <arg type="s" direction="out" name="win" />
      </method>
      <method name="ToggleMarksFocusedWindow">
      </method>
   </interface>
</node>`;

// -----------------------------------------------------------------------------
// D-Bus façade
// -----------------------------------------------------------------------------
// Everything window-specific belongs to WindowData. These are intentionally
// little more than the methods exposed by MR_DBUS_IFACE.
// -----------------------------------------------------------------------------
export class TaggedWindowFunctions {
    constructor() {
        WindowData.initialize();
        this.windowFunctions = new windowFunctions.WindowFunctions();
    }

    destroy() {
        WindowData.shutdown();
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/TaggedWindows io.github.blueray453.GnomeUtils.TaggedWindows.ActivatePinnedWindows

    ActivatePinnedWindows() {
        WindowData.activatePinned();
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/TaggedWindows io.github.blueray453.GnomeUtils.TaggedWindows.GetAppDetailsMarkedWindows

    GetAppDetailsMarkedWindows() {
        const result = WindowData.getMarked().map(data => {
            const app = WindowTracker.get_window_app(data.win);
            return this.windowFunctions._get_properties_brief_given_app_id(app.get_id());
        });

        WindowData.unmarkAll();
        return JSON.stringify(result);
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/TaggedWindows io.github.blueray453.GnomeUtils.TaggedWindows.GetPinnedWindows | jq .

    GetPinnedWindows() {
        const pinned = WindowData.getPinned();
        const result = pinned.map(data =>
            this.windowFunctions._get_properties_brief_given_meta_window(data.win));

        for (const data of pinned)
            data.unpin();

        return JSON.stringify(result);
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/TaggedWindows io.github.blueray453.GnomeUtils.TaggedWindows.TogglePinsFocusedWindow

    TogglePinsFocusedWindow() {
        WindowData.toggleFocusedPin(Display);
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/TaggedWindows io.github.blueray453.GnomeUtils.TaggedWindows.CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass

    CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass() {
        const wins = this.windowFunctions
            ._get_other_normal_windows_current_workspace_of_focused_window_wm_class();

        for (const win of wins) {
            if (win.get_wm_class_instance() === 'file_progress')
                continue;

            if (WindowData.get(win.get_compositor_private())?.is_tagged)
                continue;

            win.delete(0);
        }

        WindowData.unmarkAll();
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/TaggedWindows io.github.blueray453.GnomeUtils.TaggedWindows.GetMarkedWindows | jq .

    GetMarkedWindows() {
        const marked = WindowData.getMarked();
        const result = marked.map(data =>
            this.windowFunctions._get_properties_brief_given_meta_window(data.win));

        for (const data of marked)
            data.unmark();

        return JSON.stringify(result);
    }

    // dbus-send --print-reply=literal --session --dest=io.github.blueray453.GnomeUtils /io/github/blueray453/GnomeUtils/TaggedWindows io.github.blueray453.GnomeUtils.TaggedWindows.ToggleMarksFocusedWindow

    ToggleMarksFocusedWindow() {
        WindowData.toggleFocusedMark(Display);
    }
}