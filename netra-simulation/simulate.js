
'use strict';

const mqtt = require('mqtt');
const express = require('express');

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

// Maps soldier id → display callsign
const CALLSIGNS = {
  alpha:   'ALPHA-1',
  charlie: 'CHARLIE-3',
};

class Soldier {
  constructor(id, lat, lng) {
    this.id        = id.toLowerCase();
    this.lat       = lat;
    this.lng       = lng;
    this.heartRate = 72 + Math.floor(Math.random() * 10); // 72–82 bpm baseline
    this.battery   = 95 + Math.floor(Math.random() * 6);  // 95–100%

    // Casualty flag — freezes all updates when true
    this._casualty = false;

    // God-mode override patch — applied on top of tick values
    // Set by patch_soldier command, cleared on connectionRestored
    this._patch = null;
  }

  // Called every 30s — advances HR and battery
  tick() {
    if (this._casualty) return;

    // Heart rate fluctuation ±2 bpm, clamped to physiological range
    this.heartRate += Math.round(gaussianNoise(2));
    this.heartRate = clamp(this.heartRate, 55, 130);

    // Battery drains ~0.3% per 30s tick → full drain in ~8.3 hours
    this.battery = Math.max(0, parseFloat((this.battery - 0.3).toFixed(2)));
  }

  // Apply a god-mode patch from the dashboard immediately
  applyPatch(patch) {
    if (typeof patch.heartRate === 'number') this.heartRate = patch.heartRate;
    if (typeof patch.battery   === 'number') this.battery   = patch.battery;
    if (patch.status === 'offline') {
      this._casualty = true;
      this.heartRate = 0;
    }
    if (patch.status === 'nominal') {
      // connectionRestored — reset casualty flag and restore values
      this._casualty = false;
      if (typeof patch.heartRate === 'number') this.heartRate = patch.heartRate;
      if (typeof patch.battery   === 'number') this.battery   = patch.battery;
    }
    console.log(`[CMD] patch applied to ${this.id}:`, patch);
  }

  // Derive UI status from internal state
  _uiStatus() {
    if (this._casualty)              return 'critical';
    if (this.heartRate > 120)        return 'critical';
    if (this.heartRate > 100)        return 'warning';
    if (this.battery < 20)           return 'warning';
    return 'nominal';
  }

  // Returns the serializable state
  toJSON() {
    return {
      id:        this.id,
      callsign:  CALLSIGNS[this.id] || this.id.toUpperCase(),
      lat:       parseFloat(this.lat.toFixed(6)),
      lng:       parseFloat(this.lng.toFixed(6)),
      heartRate: this._casualty ? 0 : this.heartRate,
      battery:   this.battery,
      status:    this._uiStatus(),
    };
  }
}

// ─────────────────────────────────────────────────────────────
//  SECTION 4 — SQUAD & STATIC MARKERS INITIALIZATION
// ─────────────────────────────────────────────────────────────

// Two soldiers — alpha and charlie
const squad = {
  alpha:   new Soldier('alpha',   12.9795, 77.5925),
  charlie: new Soldier('charlie', 12.9794, 77.5926),
};

// Static markers — no movement logic, positions are fixed
// These are returned in every payload so the frontend always knows where they are
const ENEMY = {
  callsign: 'HOSTILE',
  lat: 12.9797,
  lng: 77.5930,
};

const HOSTAGE = {
  callsign: 'HOSTAGE',
  lat: 12.9793,
  lng: 77.5920,
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
  
  // Subscribe to Pi's AI responses to log them
  client.subscribe('battlefield/ai-response', { qos: 1 }, (err) => {
    if (err) {
      console.error('[NETRA] Failed to subscribe to Pi responses:', err.message);
    } else {
      console.log('[NETRA] ✓ Subscribed to Pi AI responses (battlefield/ai-response)');
    }
  });

  // Guard against duplicate intervals on reconnect
  if (!simulationInterval) {
    simulationInterval = setInterval(simulationTick, 30000);
    console.log('[NETRA] ✓ Simulation loop started at 0.033 Hz (30s interval)');
    // Fire one tick immediately so the dashboard gets data right away
    simulationTick();
  }

  // ── HTTP SERVER for frontend dashboard commands ─────────────────────
  startHttpServer();
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

// Listen for Pi's AI responses
client.on('message', (topic, message) => {
  if (topic === 'battlefield/ai-response') {
    try {
      const response = JSON.parse(message.toString());
      console.log('\n[📥 RECEIVED FROM PI] battlefield/ai-response');
      console.log('  Decision:', response.decision);
      console.log('  Risk Score:', response.context?.risk_score);
      console.log('  Threat Level:', response.context?.threat_level);
      console.log('  Latency:', response.context?.latency_ms + 'ms');
      if (response.context?.replying_to_unit) {
        console.log('  Replying to:', response.context.replying_to_unit);
        console.log('  Original msg:', response.context.replying_to_message);
      }
      console.log('[📥] Response received from Raspberry Pi\n');
    } catch (e) {
      console.log('[📥 RECEIVED FROM PI] Raw:', message.toString());
    }
  }
});

client.on('close', () => {
  console.warn('[NETRA] Connection closed.');
});

// ─────────────────────────────────────────────────────────────
//  SECTION 7 — COMMAND HANDLER (SUBSCRIBER)
// ─────────────────────────────────────────────────────────────

// Expected command format on topic 'tactical/commands':
//   { "command": "patch_soldier", "targetId": "alpha", "patch": { "heartRate": 140, "status": "critical" }, "timestamp": 1234 }
client.on('message', (topic, messageBuffer) => {
  if (topic !== 'tactical/commands') return;

  let cmd;
  try {
    cmd = JSON.parse(messageBuffer.toString());
  } catch (e) {
    console.error('[CMD] Malformed payload — not valid JSON:', messageBuffer.toString());
    return;
  }

  const { command, targetId, patch } = cmd;

  if (command !== 'patch_soldier') {
    console.warn(`[CMD] Unknown command: "${command}"`);
    return;
  }

  const id = String(targetId || '').toLowerCase();
  const soldier = squad[id];

  if (!soldier) {
    console.warn(`[CMD] Unknown targetId: "${targetId}". Valid: ${Object.keys(squad).join(', ')}`);
    return;
  }

  soldier.applyPatch(patch || {});

  // Publish an immediate tick so the dashboard reflects the change right away
  // without waiting for the next 30s interval
  simulationTick();
});

// ─────────────────────────────────────────────────────────────
//  SECTION 8 — THE SIMULATION TICK (30s GAME LOOP)
// ─────────────────────────────────────────────────────────────

// Global voice message buffer - set by HTTP endpoint, cleared after publish
let pendingVoiceMessage = null;

function simulationTick() {
  // 1. Advance all soldiers
  for (const soldier of Object.values(squad)) {
    soldier.tick();
  }

  // 2. Build payload — enemy and hostage are static positions, no movement logic
  const payload = {
    timestamp: Date.now(),
    tick:      ++simulationTick._count,
    squad:     Object.values(squad).map(s => s.toJSON()),
    enemy: {
      callsign: ENEMY.callsign,
      lat:      ENEMY.lat,
      lng:      ENEMY.lng,
    },
    hostage: {
      callsign: HOSTAGE.callsign,
      lat:      HOSTAGE.lat,
      lng:      HOSTAGE.lng,
    },
    // Include voice message if present (from dashboard STT)
    voiceMessage: pendingVoiceMessage,
  };

  // 3. Publish — QoS 0 (fire-and-forget) is correct for telemetry
  // Note: Pi expects 'battlefield/sensor' per netra-raspberry/NETRA.ai/edge_ai/config.py
  if (client.connected) {
    const payloadStr = JSON.stringify(payload);
    client.publish(
      'battlefield/sensor',
      payloadStr,
      { qos: 0 }
    );
    
    // Log what we're sending to the Pi
    console.log('\n[📤 SENDING TO PI] battlefield/sensor');
    console.log(JSON.stringify(payload, null, 2));
    if (pendingVoiceMessage) {
      console.log(`[🎤 VOICE INCLUDED] From ${pendingVoiceMessage.unit}: "${pendingVoiceMessage.message}"`);
    }
    console.log('[📤] Payload sent to Raspberry Pi\n');
  }

  // 4. Console summary
  const a = squad.alpha.toJSON();
  const c = squad.charlie.toJSON();
  console.log(
    `[TICK ${String(payload.tick).padStart(4, '0')}]` +
    ` ${a.callsign} HR:${a.heartRate} Bat:${a.battery}% Status:${a.status}` +
    ` | ${c.callsign} HR:${c.heartRate} Status:${c.status}` +
    ` | Broker:${client.connected ? 'OK' : 'OFFLINE'}`
  );
}

simulationTick._count = 0;

// ─────────────────────────────────────────────────────────────
//  SECTION 9 — HTTP SERVER (Dashboard → Simulation Commands)
// ─────────────────────────────────────────────────────────────

let httpServer = null;

function startHttpServer() {
  if (httpServer) return; // Already running

  const app = express();
  app.use(express.json());

  // CORS for browser requests
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', broker: client.connected ? 'connected' : 'disconnected' });
  });

  // HTTP endpoint for patch commands from frontend
  app.post('/command', (req, res) => {
    const { command, targetId, patch } = req.body;

    if (command !== 'patch_soldier') {
      return res.status(400).json({ error: 'Unknown command', valid: ['patch_soldier'] });
    }

    const id = String(targetId || '').toLowerCase();
    const soldier = squad[id];

    if (!soldier) {
      return res.status(404).json({ error: 'Soldier not found', valid: Object.keys(squad) });
    }

    soldier.applyPatch(patch || {});

    // Publish an immediate tick so the dashboard reflects the change right away
    simulationTick();

    res.json({ success: true, soldier: soldier.toJSON() });
  });

  // HTTP endpoint for voice commands from frontend (STT → Pi)
  app.post('/voice', (req, res) => {
    const { unit, message, timestamp } = req.body;

    if (!unit || !message) {
      return res.status(400).json({ error: 'Missing unit or message' });
    }

    // Store voice message for next telemetry publish
    pendingVoiceMessage = {
      unit: unit,
      message: message,
      timestamp: timestamp || Date.now(),
      source: 'dashboard',
    };

    console.log(`[VOICE] Command from ${unit}: "${message}"`);

    // Publish immediately with voice message
    simulationTick();

    // Clear after publish
    pendingVoiceMessage = null;

    res.json({ success: true, queued: true });
  });

  httpServer = app.listen(3001, () => {
    console.log('[NETRA] ✓ HTTP command server on port 3001');
  });
}

// ─────────────────────────────────────────────────────────────
//  SECTION 10 — GRACEFUL SHUTDOWN
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
