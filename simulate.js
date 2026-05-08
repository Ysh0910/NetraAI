
'use strict';

const mqtt = require('mqtt');

// ─────────────────────────────────────────────────────────────
//  SECTION 1 — MAP BOUNDS & TACTICAL GRID
// ─────────────────────────────────────────────────────────────

// GPS boundary of the battlefield (Vidhana Soudha area, Bangalore)
// These must match the Leaflet map corners on the frontend exactly.
const MAP_BOUNDS = {
  north: 12.9800,
  south: 12.9790,
  west:  77.5915,
  east:  77.5935,
};

// Tactical collision matrix — 0 = walkable, 1 = wall/building
// Generated from the Vidhana Soudha satellite extraction.
const VIDHANA_GRID = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const GRID_ROWS = VIDHANA_GRID.length;
const GRID_COLS = VIDHANA_GRID[0].length;

// ─────────────────────────────────────────────────────────────
//  SECTION 2 — UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────

// Box-Muller transform — Gaussian (bell-curve) noise for realistic movement
function gaussianNoise(scale = 1) {
  let u1;
  do { u1 = Math.random(); } while (u1 === 0);
  const u2 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z * scale;
}

// Snaps a value back to [min, max] if it exceeds the boundary
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Converts a GPS coordinate to a grid cell and checks if it's a wall (1)
// Returns true if the position is blocked or out of bounds
function isPathBlocked(lat, lng) {
  // Latitude decreases going south (down the rows), so invert it
  const latPct = (MAP_BOUNDS.north - lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south);
  const lngPct = (lng - MAP_BOUNDS.west)  / (MAP_BOUNDS.east  - MAP_BOUNDS.west);

  const row = Math.floor(latPct * GRID_ROWS);
  const col = Math.floor(lngPct * GRID_COLS);

  // Out of bounds → treat as wall
  if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return true;

  return VIDHANA_GRID[row][col] === 1;
}

// Approximate distance in meters between two GPS points (flat-earth, valid < 1km)
function distanceMeters(lat1, lng1, lat2, lng2) {
  const metersPerDegLat = 111000;
  const metersPerDegLng = 111000 * Math.cos((lat1 * Math.PI) / 180);
  const dLat = (lat2 - lat1) * metersPerDegLat;
  const dLng = (lng2 - lng1) * metersPerDegLng;
  return Math.round(Math.sqrt(dLat * dLat + dLng * dLng));
}

// ─────────────────────────────────────────────────────────────
//  SECTION 3 — SOLDIER CLASS (DIGITAL TWIN ENTITY)
// ─────────────────────────────────────────────────────────────

class Soldier {
  constructor(id, lat, lng) {
    this.id        = id;
    this.lat       = lat;
    this.lng       = lng;
    this.heartRate = 72 + Math.floor(Math.random() * 10); // 72–82 bpm baseline
    this.battery   = 95 + Math.floor(Math.random() * 6);  // 95–100%
    this.trustScore = 1.0;

    // Sensor drift state — activated by jam_sensor command
    this._jammed   = false;
    this._driftLat = 0;
    this._driftLng = 0;

    // Casualty flag — freezes all updates when true
    this._casualty = false;
  }

  // Called once per second — advances position, HR, battery, and drift
  tick() {
    if (this._casualty) return;

    // Gaussian random walk — scale ≈ 5.5 meters per step
    const nextLat = this.lat + gaussianNoise(0.00005);
    const nextLng = this.lng + gaussianNoise(0.00005);

    // Only commit the move if the new cell is walkable (collision check)
    // If blocked, the soldier stays in place this tick (wall bounce)
    if (!isPathBlocked(nextLat, nextLng)) {
      this.lat = nextLat;
      this.lng = nextLng;
    }

    // Heart rate fluctuation ±2 bpm, clamped to physiological range
    this.heartRate += Math.round(gaussianNoise(2));
    this.heartRate = clamp(this.heartRate, 55, 130);

    // Battery drains ~0.01% per second → full drain in ~2.7 hours
    this.battery = Math.max(0, parseFloat((this.battery - 0.01).toFixed(2)));

    // Accumulate GPS drift if sensor is jammed (≈3m/s drift)
    if (this._jammed) {
      this._driftLat += gaussianNoise(0.00003);
      this._driftLng += gaussianNoise(0.00003);
    }
  }

  // Returns the serializable state — reported GPS includes drift if jammed
  toJSON() {
    return {
      id:         this.id,
      lat:        parseFloat((this.lat + this._driftLat).toFixed(6)),
      lng:        parseFloat((this.lng + this._driftLng).toFixed(6)),
      heartRate:  this._casualty ? 0 : this.heartRate,
      battery:    this.battery,
      trustScore: parseFloat(this.trustScore.toFixed(2)),
      status:     this._casualty ? 'CASUALTY' : this._jammed ? 'SENSOR_JAMMED' : 'ACTIVE',
    };
  }

  // ── Command Handlers ──────────────────────────────────────

  cmdCasualty() {
    console.log(`[CMD] ${this.id} marked as CASUALTY.`);
    this._casualty = true;
    this.heartRate = 0;
    this.trustScore = 0.0;
  }

  // Sensor jam: GPS starts drifting slowly, trust score drops
  cmdJamSensor() {
    console.log(`[CMD] ${this.id} sensor JAMMED. Initiating drift.`);
    this._jammed = true;
    this.trustScore = 0.2;
  }
}

// ─────────────────────────────────────────────────────────────
//  SECTION 4 — SQUAD INITIALIZATION
// ─────────────────────────────────────────────────────────────

// All four soldiers spawn inside MAP_BOUNDS in walkable (0) cells
const squad = {
  Alpha:   new Soldier('Alpha',   12.9795, 77.5925),
  Bravo:   new Soldier('Bravo',   12.9796, 77.5924),
  Charlie: new Soldier('Charlie', 12.9794, 77.5926),
  Delta:   new Soldier('Delta',   12.9795, 77.5923),
};

// ─────────────────────────────────────────────────────────────
//  SECTION 5 — MQTT CLIENT & RESILIENCE
// ─────────────────────────────────────────────────────────────

// Change this to the broker machine's IP if running across devices
const BROKER_URL = 'mqtt://localhost:1883';

const client = mqtt.connect(BROKER_URL, {
  clientId:        'NETRA_SimulationEngine_v2',
  reconnectPeriod: 3000,   // auto-retry every 3s on disconnect
  connectTimeout:  10000,  // abandon attempt after 10s, then retry
  keepalive:       30,     // PINGREQ every 30s to keep TCP alive
  clean:           true,
  will: {
    // Last Will — broker publishes this automatically if we crash
    topic:   'tactical/system/status',
    payload: JSON.stringify({ source: 'SimulationEngine', status: 'OFFLINE', ts: Date.now() }),
    qos:     1,
    retain:  true,
  },
});

// ─────────────────────────────────────────────────────────────
//  SECTION 6 — MQTT EVENT HANDLERS
// ─────────────────────────────────────────────────────────────

let simulationInterval = null;

client.on('connect', () => {
  console.log('[NETRA] ✓ Connected to MQTT Broker at', BROKER_URL);
  console.log(`[NETRA] ✓ Tactical grid loaded: ${GRID_ROWS} rows × ${GRID_COLS} cols`);

  client.publish(
    'tactical/system/status',
    JSON.stringify({ source: 'SimulationEngine', status: 'ONLINE', ts: Date.now() }),
    { qos: 1, retain: true }
  );

  client.subscribe('tactical/commands', { qos: 1 }, (err) => {
    if (err) {
      console.error('[NETRA] Failed to subscribe to tactical/commands:', err.message);
    } else {
      console.log('[NETRA] ✓ Subscribed to tactical/commands');
    }
  });

  // Guard against duplicate intervals on reconnect
  if (!simulationInterval) {
    simulationInterval = setInterval(simulationTick, 1000);
    console.log('[NETRA] ✓ Simulation loop started at 1 Hz');
  }
});

client.on('reconnect', () => {
  console.log('[NETRA] ↻ Attempting to reconnect to broker...');
});

client.on('offline', () => {
  // Simulation keeps running locally — publishes resume on reconnect
  console.warn('[NETRA] ✗ Client offline. Simulation continues locally.');
});

client.on('error', (err) => {
  console.error('[NETRA] MQTT Error:', err.message);
});

client.on('close', () => {
  console.warn('[NETRA] Connection closed.');
});

// ─────────────────────────────────────────────────────────────
//  SECTION 7 — COMMAND HANDLER (SUBSCRIBER)
// ─────────────────────────────────────────────────────────────

// Expected command format on topic 'tactical/commands':
//   { "command": "casualty",   "target": "Charlie" }
//   { "command": "jam_sensor", "target": "Bravo" }
client.on('message', (topic, messageBuffer) => {
  if (topic !== 'tactical/commands') return;

  let cmd;
  try {
    cmd = JSON.parse(messageBuffer.toString());
  } catch (e) {
    console.error('[CMD] Malformed payload — not valid JSON:', messageBuffer.toString());
    return;
  }

  const { command, target } = cmd;

  if (!target || !squad[target]) {
    console.warn(`[CMD] Unknown target: "${target}". Valid: ${Object.keys(squad).join(', ')}`);
    return;
  }

  const soldier = squad[target];

  switch (command) {
    case 'casualty':   soldier.cmdCasualty();  break;
    case 'jam_sensor': soldier.cmdJamSensor(); break;
    default:
      console.warn(`[CMD] Unknown command: "${command}"`);
  }
});

// ─────────────────────────────────────────────────────────────
//  SECTION 8 — THE SIMULATION TICK (1 Hz GAME LOOP)
// ─────────────────────────────────────────────────────────────

function simulationTick() {
  // 1. Advance all soldiers
  for (const soldier of Object.values(squad)) {
    soldier.tick();
  }

  // 2. Build payload
  const payload = {
    timestamp: Date.now(),
    tick:      ++simulationTick._count,
    squad:     Object.values(squad).map(s => s.toJSON()),
  };

  // 3. Publish — QoS 0 (fire-and-forget) is correct for high-frequency telemetry
  if (client.connected) {
    client.publish(
      'tactical/squad/telemetry',
      JSON.stringify(payload),
      { qos: 0 }
    );
  }

  // 4. Console summary
  const a = squad.Alpha.toJSON();
  const c = squad.Charlie.toJSON();
  process.stdout.write(
    `\r[TICK ${String(payload.tick).padStart(4, '0')}]` +
    ` Alpha HR:${a.heartRate} Bat:${a.battery}%` +
    ` | Charlie HR:${c.heartRate} Status:${c.status}` +
    ` | Broker:${client.connected ? 'OK' : 'OFFLINE'}   `
  );
}

simulationTick._count = 0;

// ─────────────────────────────────────────────────────────────
//  SECTION 9 — GRACEFUL SHUTDOWN
// ─────────────────────────────────────────────────────────────

// Ctrl+C → stop loop → publish SHUTDOWN → clean disconnect
process.on('SIGINT', () => {
  console.log('\n[NETRA] Shutdown signal received. Cleaning up...');

  if (simulationInterval) clearInterval(simulationInterval);

  client.publish(
    'tactical/system/status',
    JSON.stringify({ source: 'SimulationEngine', status: 'SHUTDOWN', ts: Date.now() }),
    { qos: 1, retain: true },
    () => {
      client.end(false, {}, () => {
        console.log('[NETRA] Disconnected cleanly. Goodbye.');
        process.exit(0);
      });
    }
  );
});
