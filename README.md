# GNOME Utils by blueray453

A GNOME Shell extension that provides D-Bus interfaces for scripting and automation purposes, with support for window management, workspace control, keyboard simulation, and tagged window operations in Wayland environments.

## Features

- **Window Management**: Get and manipulate windows list, move windows between workspaces, and retrieve window properties
- **Keyboard Simulation**: Simulate keyboard events programmatically
- **Workspace Management**: Control and manage GNOME workspaces
- **Tagged Windows**: Support for tagged window operations and management
- **D-Bus Interface**: Exposes all functionality through D-Bus for remote scripting and integration
- **Wayland Support**: Optimized for modern Wayland display server

## Compatibility

- **GNOME Shell 48 and 49**
- Built with modern GNOME extension API (GJS)
- Supports GNOME Shell 44+ with compatibility notes for breaking changes in versions 45 and 48

## Installation

1. Clone this repository to your GNOME extensions directory:
```bash
git clone https://github.com/blueray453/gnome-utils-by-blueray453.git ~/.local/share/gnome-shell/extensions/gnome-utils-by-blueray453@github.com
```

2. Enable the extension in GNOME Settings or using:
```bash
gnome-extensions enable gnome-utils-by-blueray453
```

## Architecture

### Core Modules

- **extension.js**: Main extension class that handles D-Bus registration and lifecycle management
- **windowFunctions.js**: Window manipulation and retrieval functions
- **workspaceFunctions.js**: Workspace management and control
- **keyboardSimulatorFunctions.js**: Keyboard event simulation
- **taggedWindowFunctions.js**: Tagged window operations
- **utils.js**: Utility functions and logging
- **stylesheet.css**: Extension styling

### D-Bus Interfaces

The extension exposes four main D-Bus services:

1. **KeyboardSimulatorFunctions**
   - Path: `/org/gnome/Shell/Extensions/GnomeUtilsKeyboardSimulator`
   - Simulates keyboard input events

2. **TaggedWindowFunctions**
   - Path: `/org/gnome/Shell/Extensions/GnomeUtilsTaggedWindows`
   - Manages window tagging and tagged window operations

3. **WindowFunctions**
   - Path: `/org/gnome/Shell/Extensions/GnomeUtilsWindows`
   - Core window management operations (list, move, properties, etc.)

4. **WorkspaceFunctions**
   - Path: `/org/gnome/Shell/Extensions/GnomeUtilsWorkspaces`
   - Workspace navigation and management

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

## Development

### Requirements

- GNOME Shell 48+
- GJS (GNOME JavaScript)
- D-Bus development libraries

### Building/Testing

1. Reload the extension after making changes:
```bash
gnome-extensions disable gnome-utils-by-blueray453
gnome-extensions enable gnome-utils-by-blueray453
```

2. Monitor logs during development:
```bash
journalctl -f -o cat SYSLOG_IDENTIFIER=gnome-utils-by-blueray453
```

### GNOME Shell Compatibility

- **GNOME 44-47**: Reference implementation available (see notes in code)
- **GNOME 45**: Breaking changes - API updates required
- **GNOME 48**: Breaking changes - API updates required  
- **GNOME 49**: Current target version

For migration guides, see:
- [GNOME Shell 44 Upgrade Guide](https://gjs.guide/extensions/upgrading/gnome-shell-44.html)
- [GNOME Shell 45 Upgrade Guide](https://gjs.guide/extensions/upgrading/gnome-shell-45.html)
- [GNOME Shell 46 Upgrade Guide](https://gjs.guide/extensions/upgrading/gnome-shell-46.html)
- [GNOME Shell 47 Upgrade Guide](https://gjs.guide/extensions/upgrading/gnome-shell-47.html)
- [GNOME Shell 48 Upgrade Guide](https://gjs.guide/extensions/upgrading/gnome-shell-48.html)

## Project Status

⚠️ **Educational Project**: This repository is primarily for educational purposes and learning. While functional, please be aware that it may be deleted in the future. Exercise caution when forking this repository, as deleting a public repository breaks public forks.

## License

This project is licensed under the GNU General Public License v2.0 or later (GPL-2.0-or-later). See the source files for details.

## Contributing

This is an educational project. Contributions are welcome for:
- Bug fixes
- Documentation improvements
- Compatibility updates for new GNOME Shell versions

## Related Projects

- **Original Project**: [window-calls](https://github.com/ickyicky/window-calls)
- This is a fork with additional features and improvements

## Disclaimer

This extension modifies GNOME Shell behavior through D-Bus. Use with caution and ensure you understand what methods you're calling, especially when using keyboard simulation or window manipulation functions.

## Support

For issues, questions, or suggestions, please use the GitHub Issues page for this repository.
