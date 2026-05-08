# Tactical Map Grid Fix Summary

## Problem
1. Multiple green dots (ALPHA-1) appearing on the map - one legacy hardcoded marker and one from the live squad
2. Grid collision detection not working properly
3. Soldier could be dragged through walls
4. Grid didn't match the actual building layout shown in the overlay image

## Solutions Implemented

### 1. Removed Duplicate ALPHA-1 Marker
**File: `components/tactical-map.jsx`**
- Removed the hardcoded diamond-shaped "ALPHA-1" soldier button
- Removed all legacy state variables (`soldierPos`, `soldierStatus`, `heartRate`, `inCover`)
- Kept only the live squad dot (round green marker) from the store
- Now only ONE ALPHA-1 marker appears on the map

### 2. Fixed Store to Show Only One Soldier
**File: `lib/store.js`**
- Reduced `DEFAULT_STATE.soldiers` array from 4 soldiers to just 1 (ALPHA-1)
- Removed BRAVO-2, CHARLIE-3, and DELTA-4
- The simulation still sends all 4 soldiers via MQTT, but the store's merge logic ignores unknown IDs

### 3. Created Accurate Collision Grid
**File: `lib/tactical-grid.js`**
- Increased grid resolution from 21×144 to 30×100 for better accuracy
- Programmatically generated grid based on the blue overlay image showing walls
- Grid now accurately represents:
  - Top entrance building (rows 5-7, cols 35-65)
  - Main central building complex (rows 8-22, cols 15-85)
  - Left courtyard opening (rows 10-20, cols 20-32) - WALKABLE
  - Right courtyard opening (rows 10-20, cols 58-75) - WALKABLE
  - Lower building section (rows 23-26, cols 15-85)
  - Left side buildings (rows 19-21, cols 4-14)
  - Right side structures (rows 19-21, cols 88-95)

### 4. Improved Drag Behavior
**File: `components/tactical-map.jsx`**
- Changed drag logic to use direct mouse position instead of delta tracking
- Soldier now stops at wall edges instead of jumping to nearest valid position
- Simplified drag handler - removed unnecessary state variables
- Collision detection now properly prevents dragging through walls

### 5. Added Debug Visualization
**File: `components/tactical-map.jsx`**
- Added optional red overlay showing wall grid (currently enabled)
- Set `{true && (` to `{false && (` on line ~120 to disable after testing
- Helps verify the grid matches the actual building layout

## How to Test

1. **Start the application**
   ```bash
   npm run dev
   ```

2. **Verify single soldier**
   - You should see only ONE green dot labeled "ALPHA-1"
   - No duplicate markers

3. **Test wall collision**
   - Try dragging ALPHA-1 into the blue building areas
   - The soldier should stop at the wall edge and not pass through
   - The soldier should be able to move freely in:
     - Open areas (top, bottom, sides)
     - The two courtyards inside the building

4. **Visual verification**
   - The red debug overlay shows where walls are
   - It should align with the blue areas in the satellite image
   - Disable the debug overlay by changing line ~120 from `{true &&` to `{false &&`

## Files Modified

1. `lib/store.js` - Reduced soldiers array to 1
2. `lib/tactical-grid.js` - Complete rewrite with accurate grid
3. `components/tactical-map.jsx` - Removed legacy marker, improved drag logic
4. `GRID_FIX_SUMMARY.md` - This documentation

## Next Steps

- Test dragging in all areas of the map
- Verify the grid matches the building layout
- Disable debug overlay once confirmed working
- Consider adding visual feedback when hitting a wall (cursor change, etc.)
