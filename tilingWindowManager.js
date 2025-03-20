/* tilingWindowManager.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

const { Meta } = imports.gi;

// Store tiled window pairs to maintain their connection when resizing
// Format: { windowId: { pairedWith: otherWindowId, position: 'left' | 'right' } }
var tiledWindows = {};

// Function to calculate tiling geometries for left and right halves of the workspace
function calculateTilingGeometry(win) {
    // Get the work area for the monitor where the window is located
    let monitor = win.get_monitor();
    let workspace = win.get_workspace();
    let workArea = workspace.get_work_area_for_monitor(monitor);

    // Calculate left and right halves
    let leftGeometry = {
        x: workArea.x,
        y: workArea.y,
        width: Math.floor(workArea.width / 2),
        height: workArea.height
    };

    let rightGeometry = {
        x: workArea.x + Math.floor(workArea.width / 2),
        y: workArea.y,
        width: Math.floor(workArea.width / 2),
        height: workArea.height
    };

    return { leftGeometry, rightGeometry };
}

// Tile a window to the left or right
function tileWindow(win, position) {
    if (!win) return;

    // Calculate tiling geometries
    let { leftGeometry, rightGeometry } = calculateTilingGeometry(win);
    let targetGeometry = position === 'left' ? leftGeometry : rightGeometry;

    // Apply the geometry to the window
    win.unmaximize(Meta.MaximizeFlags.BOTH);
    win.move_resize_frame(true,
        targetGeometry.x,
        targetGeometry.y,
        targetGeometry.width,
        targetGeometry.height
    );

    return targetGeometry;
}

// Function to find a suitable window to pair with
function findPairWindow(winId, position, windowFunctions) {
    // Get all windows in the current workspace
    let focusedWin = windowFunctions._get_normal_window_given_window_id(winId);
    if (!focusedWin) return null;

    let monitor = focusedWin.get_monitor();
    let workspace = focusedWin.get_workspace();

    // Get all windows in the same workspace and monitor
    let allWindows = windowFunctions._get_normal_windows().filter(w =>
        w.get_workspace() === workspace &&
        w.get_monitor() === monitor &&
        w.get_id() !== winId &&
        !w.minimized
    );

    // If no suitable window is found, return null
    if (allWindows.length === 0) return null;

    // Find the most recently used window
    allWindows.sort((a, b) => b.get_user_time() - a.get_user_time());
    return allWindows[0];
}

// Pair two windows and set up tiling
function setupWindowPair(win1, win2, position, windowFunctions) {
    if (!win1 || !win2) return;

    const win1Id = win1.get_id();
    const win2Id = win2.get_id();

    // Ensure windows are not maximized or minimized
    windowFunctions._make_window_movable_and_resizable(win1);
    windowFunctions._make_window_movable_and_resizable(win2);

    // Tile windows
    if (position === 'left') {
        tileWindow(win1, 'left');
        tileWindow(win2, 'right');

        // Register the pairing
        tiledWindows[win1Id] = { pairedWith: win2Id, position: 'left' };
        tiledWindows[win2Id] = { pairedWith: win1Id, position: 'right' };
    } else {
        tileWindow(win1, 'right');
        tileWindow(win2, 'left');

        // Register the pairing
        tiledWindows[win1Id] = { pairedWith: win2Id, position: 'right' };
        tiledWindows[win2Id] = { pairedWith: win1Id, position: 'left' };
    }

    // Activate the window we're working with
    win1.activate(global.get_current_time());
}

// Set up signal handlers to maintain tiling when windows are resized
function setupResizeHandlers(win, windowFunctions) {
    // This would be where we'd connect to the window's 'size-changed' signal
    // However, this requires more complex implementation with signal handlers
    // which might be beyond the scope of this simple implementation

    // For a real implementation, we would:
    // 1. Connect to the window's size-changed signal
    // 2. When one window resizes, adjust its paired window accordingly
    // 3. Clean up signals when windows are unpaired
}

// Export functions to be used by windowFunctions.js
var TilingManager = {
    tileWindowLeft: function (winId, windowFunctions) {
        const win = windowFunctions._get_normal_window_given_window_id(winId);
        if (!win) return;

        // If window was already tiled, untile it
        if (tiledWindows[winId]) {
            // Remove the pairing
            const pairedId = tiledWindows[winId].pairedWith;
            delete tiledWindows[winId];
            if (pairedId && tiledWindows[pairedId]) {
                delete tiledWindows[pairedId];
            }
        }

        // Tile the window to the left
        tileWindow(win, 'left');

        // Find a window to pair with
        const pairWin = findPairWindow(winId, 'left', windowFunctions);
        if (pairWin) {
            setupWindowPair(win, pairWin, 'left', windowFunctions);
        }
    },

    tileWindowRight: function (winId, windowFunctions) {
        const win = windowFunctions._get_normal_window_given_window_id(winId);
        if (!win) return;

        // If window was already tiled, untile it
        if (tiledWindows[winId]) {
            // Remove the pairing
            const pairedId = tiledWindows[winId].pairedWith;
            delete tiledWindows[winId];
            if (pairedId && tiledWindows[pairedId]) {
                delete tiledWindows[pairedId];
            }
        }

        // Tile the window to the right
        tileWindow(win, 'right');

        // Find a window to pair with
        const pairWin = findPairWindow(winId, 'right', windowFunctions);
        if (pairWin) {
            setupWindowPair(win, pairWin, 'right', windowFunctions);
        }
    },

    isPaired: function (winId) {
        return tiledWindows.hasOwnProperty(winId);
    },

    getPairedWindowId: function (winId) {
        return tiledWindows[winId]?.pairedWith || null;
    }
};