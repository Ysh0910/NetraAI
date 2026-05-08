/**
 * Shared tactical grid for Vidhana Soudha area.
 * 0 = walkable/free space, 1 = wall/building/obstacle
 * Used by both simulation (pathfinding) and frontend (collision detection).
 * 
 * Grid dimensions: 30 rows × 100 columns (higher resolution for better accuracy)
 * Maps to GPS bounds: 
 *   north: 12.9800, south: 12.9790
 *   west:  77.5915, east:  77.5935
 * 
 * Based on the blue overlay image:
 * - Top section: open area (rows 0-4)
 * - Upper building section with top entrance (rows 5-7)
 * - Main building complex (rows 8-22)
 *   - Left courtyard opening (cols 18-30)
 *   - Right courtyard opening (cols 55-75)
 * - Lower building section (rows 23-26)
 * - Bottom open area (rows 27-29)
 * - Left side buildings (cols 4-14, rows 19-21)
 */

export const MAP_BOUNDS = {
  north: 12.9800,
  south: 12.9790,
  west: 77.5915,
  east: 77.5935,
};

// Create grid programmatically for accuracy
function createGrid() {
  const rows = 30;
  const cols = 100;
  const grid = Array(rows).fill(0).map(() => Array(cols).fill(0));
  
  // Helper to fill rectangular regions with walls (1)
  const fillRect = (r1, r2, c1, c2) => {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
          grid[r][c] = 1;
        }
      }
    }
  };
  
  // Top entrance building section
  fillRect(5, 7, 35, 65);
  
  // Main central building complex (large blue area)
  // Top section
  fillRect(8, 22, 15, 85);
  
  // Cut out left courtyard (garden area)
  fillRect(10, 20, 20, 32);
  for (let r = 10; r <= 20; r++) {
    for (let c = 20; c <= 32; c++) {
      grid[r][c] = 0;
    }
  }
  
  // Cut out right courtyard (garden area with fountain)
  fillRect(10, 20, 58, 75);
  for (let r = 10; r <= 20; r++) {
    for (let c = 58; c <= 75; c++) {
      grid[r][c] = 0;
    }
  }
  
  // Lower building section
  fillRect(23, 26, 15, 85);
  
  // Left side buildings
  fillRect(19, 21, 4, 14);
  
  // Right side area (mostly open, small structures)
  fillRect(19, 21, 88, 95);
  
  return grid;
}

export const VIDHANA_GRID = createGrid();

export const GRID_ROWS = VIDHANA_GRID.length;
export const GRID_COLS = VIDHANA_GRID[0].length;

/**
 * Check if a percentage position (x: 0-100, y: 0-100) collides with a wall.
 * Returns true if the position is blocked (wall or out of bounds).
 */
export function isPositionBlocked(x, y) {
  if (x < 0 || x > 100 || y < 0 || y > 100) return true;
  
  // Convert percentage to grid coordinates
  // x = 0 is west (left), x = 100 is east (right) → maps to columns
  // y = 0 is north (top), y = 100 is south (bottom) → maps to rows
  const col = Math.floor((x / 100) * GRID_COLS);
  const row = Math.floor((y / 100) * GRID_ROWS);
  
  // Clamp to valid range
  const safeRow = Math.max(0, Math.min(GRID_ROWS - 1, row));
  const safeCol = Math.max(0, Math.min(GRID_COLS - 1, col));
  
  return VIDHANA_GRID[safeRow][safeCol] === 1;
}

/**
 * Find the nearest valid (non-wall) position from a given point.
 * Uses a spiral search to find the closest walkable cell.
 */
export function findNearestValidPosition(x, y, maxSearchRadius = 15) {
  if (!isPositionBlocked(x, y)) return { x, y };
  
  // Convert to grid coords
  const startCol = Math.floor((x / 100) * GRID_COLS);
  const startRow = Math.floor((y / 100) * GRID_ROWS);
  
  // Spiral search - check all cells at each radius
  for (let radius = 1; radius <= maxSearchRadius; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        // Only check cells on the perimeter of current radius
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
        
        const col = startCol + dx;
        const row = startRow + dy;
        
        if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) continue;
        
        if (VIDHANA_GRID[row][col] === 0) {
          // Convert back to percentage
          return {
            x: Math.max(0, Math.min(100, (col / GRID_COLS) * 100)),
            y: Math.max(0, Math.min(100, (row / GRID_ROWS) * 100))
          };
        }
      }
    }
  }
  
  // Fallback: return clamped position at map edge
  return { 
    x: Math.max(5, Math.min(95, x)), 
    y: Math.max(5, Math.min(95, y)) 
  };
}
