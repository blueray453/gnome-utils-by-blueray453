# GNOME Utils by blueray453

A GNOME Shell extension that provides D-Bus interfaces for scripting and automation purposes, with support for window management, workspace control, keyboard simulation, and tagged window operations in Wayland environments.

## Features

- **Window Management**: Get and manipulate windows list, move windows between workspaces, and retrieve window properties
- **Keyboard Simulation**: Simulate keyboard events programmatically
- **Workspace Management**: Control and manage GNOME workspaces
- **Tagged Windows**: Support for tagged window operations and management
- **D-Bus Interface**: Exposes all functionality through D-Bus for remote scripting and integration
- **Wayland Support**: Optimized for modern Wayland display server

## Usage

### Via D-Bus (Command Line)

List all D-Bus methods:
```bash
gdbus introspect --session --dest org.gnome.Shell.Extensions.GnomeUtilsWindows --object-path /org/gnome/Shell/Extensions/GnomeUtilsWindows
```

Call a method example (replace with actual method names):
```bash
gdbus call --session --dest org.gnome.Shell.Extensions.GnomeUtilsWindows \
  --object-path /org/gnome/Shell/Extensions/GnomeUtilsWindows \
  --method org.gnome.Shell.Extensions.GnomeUtilsWindows.MethodName
```

### Via D-Bus (Python/Other Languages)

The extension provides standard D-Bus interfaces accessible from any language with D-Bus bindings.

## Logging

View extension logs in real-time:
```bash
journalctl -f -o cat SYSLOG_IDENTIFIER=gnome-utils-by-blueray453
```

## Contributing

This is an educational project. Contributions are welcome for:
- Bug fixes
- Documentation improvements
- Compatibility updates for new GNOME Shell versions

## Related Projects

- **Original Project**: [window-calls](https://github.com/ickyicky/window-calls)
- This is a fork with additional features and improvements

## Project Status

⚠️ **Educational Project**: This repository is primarily for educational purposes and learning. While functional, please be aware that it may be deleted in the future. Exercise caution when forking this repository, as deleting a public repository breaks public forks.

## Disclaimer

This extension modifies GNOME Shell behavior through D-Bus. Use with caution and ensure you understand what methods you're calling, especially when using keyboard simulation or window manipulation functions.

## CLI Helper: `gnomeutils-call`

The extension includes a command‑line client `gnomeutils-call` that lets you call any D‑Bus method from its four interfaces (Windows, Workspaces, TaggedWindows, KeyboardSimulator) **without** type prefixes – it automatically converts your arguments based on the method’s D‑Bus signature.

### Installation

Rather than copying the script, symlink it into your `$PATH` so pulling future updates automatically updates the command:

```bash
mkdir -p ~/.local/bin
chmod +x "$HOME/.local/share/gnome-shell/extensions/gnome-utils-by-blueray453/cli/gnomeutils-call"
ln -sf "$HOME/.local/share/gnome-shell/extensions/gnome-utils-by-blueray453/cli/gnomeutils-call" ~/.local/bin/gnomeutils-call
```

Make sure `~/.local/bin` is on your `$PATH` (add it to your shell’s startup file if needed).

### Usage

```bash
gnomeutils-call -i INTERFACE METHOD [PARAMETERS...]
```

- `-i, --interface` – choose one of: `windows`, `workspaces`, `tagged`, `keyboard` (**required**).
- `METHOD` – the D‑Bus method name (e.g. `GetWindows`, `PressFromString`).
- `PARAMETERS` – plain values; the script automatically infers the correct D‑Bus type:
- `123` → `uint32` (or `int32` if negative)
- `true` / `false` → `boolean`
- `firefox-esr` → `string`
- `firefox,alacritty,nemo` → `array:string` (comma‑separated)
- `"Hello, world"` → `string` (including the comma)

Void methods produce no output – success is silent.

### Examples by Interface

#### 1. Windows interface (`-i windows`)

```bash
# Get all windows (JSON)
gnomeutils-call -i windows GetWindows | jq .

# Windows of a specific WM class (JSON)
gnomeutils-call -i windows GetWindowsGivenWMClass firefox-esr | jq .

# Focused window (JSON)
gnomeutils-call -i windows GetWindowFocused | jq .

# Activate a window by ID (void)
gnomeutils-call -i windows WindowActivateGivenWinID 123456

# Move window to (x,y) (void)
gnomeutils-call -i windows WindowMoveGivenWinID 123456 100 200

# Resize window (void)
gnomeutils-call -i windows WindowResizeGivenWinID 123456 800 600

# Exclude multiple classes (array)
gnomeutils-call -i windows GetWindowsExcludingGivenWMClass firefox-esr,Alacritty,Nemo | jq .

# Move all windows except given classes to workspace 7 (void)
gnomeutils-call -i windows WindowMoveToExcludingGivenWMClasses firefox-esr,Alacritty 7

# Toggle Looking Glass (void)
gnomeutils-call -i windows ToggleLookingGlass
```

#### 2. Workspaces interface (`-i workspaces`)

```bash
# List workspaces with windows (JSON)
gnomeutils-call -i workspaces GetWorkspaces | jq .

# Get workspace index by name (JSON)
gnomeutils-call -i workspaces GetWorkspaceIndexByName Codium

# Go to workspace 4 (void)
gnomeutils-call -i workspaces GoToGivenWorkspace 4

# Move focused window to workspace 2 (void)
gnomeutils-call -i workspaces MoveFocusedWindowToGivenWorkspace 2

# Move specific window to workspace 0 (void)
gnomeutils-call -i workspaces MoveWindowToWorkspace 123456 0

# Toggle last workspace (void)
gnomeutils-call -i workspaces ToggleWorkspaces
```

#### 3. TaggedWindows interface (`-i tagged`)

```bash
# Get pinned windows and clear pins (JSON)
gnomeutils-call -i tagged GetPinnedWindows | jq .

# Get marked windows and clear marks (JSON)
gnomeutils-call -i tagged GetMarkedWindows | jq .

# Activate all pinned windows (void)
gnomeutils-call -i tagged ActivatePinnedWindows

# Toggle pin on focused window (void)
gnomeutils-call -i tagged TogglePinsFocusedWindow

# Toggle mark on focused window (void)
gnomeutils-call -i tagged ToggleMarksFocusedWindow

# Close unmarked windows on current workspace (void)
gnomeutils-call -i tagged CloseOtherNotMarkedWindowsCurrentWorkspaceOfFocusedWindowWMClass
```

#### 4. KeyboardSimulator interface (`-i keyboard`)

```bash
# Press a key combination (string with commas – stays one string)
gnomeutils-call -i keyboard PressFromString Control_L,Shift_L,Alt_L,Super_L,o

# Select all text in FSearch (void, uses AT‑SPI)
gnomeutils-call -i keyboard SelectAllFsearchText

# Test typing a string (void)
gnomeutils-call -i keyboard TestTypeString
```

## Support

For issues, questions, or suggestions, please use the GitHub Issues page for this repository.
