"use client";

import { create } from "zustand";

/**
 * GPS bounds shared with the simulation engine (Vidhana Soudha).
 * Used to project lat/lng -> screen percentage for the tactical map.
 */
export const MAP_BOUNDS = {
  north: 12.9800,
  south: 12.9790,
  west: 77.5915,
  east: 77.5935,
};

/**
 * Project a (lat, lng) pair into the map's percentage coordinate space.
 * Falls back to the dashboard centre when inputs are missing.
 */
export function gpsToPercent(lat, lng) {
  if (typeof lat !== "number" || typeof lng !== "number") {
    return { x: 50, y: 50 };
  }
  const xRaw = ((lng - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west)) * 100;
  const yRaw = ((MAP_BOUNDS.north - lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south)) * 100;
  return {
    x: Math.max(2, Math.min(98, xRaw)),
    y: Math.max(2, Math.min(98, yRaw)),
  };
}

/**
 * Translate the simulation's coarse status enum into the dashboard's
 * UI status vocabulary (nominal / warning / critical / offline).
 */
function mapSimStatusToUi(simStatus, heartRate, battery) {
  if (simStatus === "CASUALTY") return "critical";
  if (simStatus === "SENSOR_JAMMED") return "warning";
  if (typeof heartRate === "number" && heartRate > 120) return "critical";
  if (typeof heartRate === "number" && heartRate > 100) return "warning";
  if (typeof battery === "number" && battery < 20) return "warning";
  return "nominal";
}

/**
 * The DEFAULT_STATE is the contract the UI relies on. Every field the
 * dashboard reads MUST exist here so the page renders even when the
 * broker, the simulation, or any backend feature is offline.
 */
export const DEFAULT_STATE = {
  hasLiveTelemetry: false,
  brokerStatus: "disconnected", // 'disconnected' | 'connecting' | 'connected' | 'error'
  soldiers: [
    {
      id: "alpha",
      callsign: "ALPHA-1",
      status: "nominal",
      heartRate: 78,
      battery: 92,
      position: { x: 18, y: 8 },
      heading: 45,
      lat: null,
      lng: null,
      trustScore: 1.0,
      equipment: [
        { name: "NVG", status: "active" },
        { name: "COMM", status: "active" },
      ],
    },
  ],
  // Hostile / hostage placeholders — no backend yet, kept so the UI
  // can keep rendering decorative markers without crashing.
  enemy: {
    callsign: "HOSTILE",
    distance: null,
    bearing: null,
    position: { x: 70, y: 60 },
  },
  hostage: {
    callsign: "HOSTAGE",
    status: "unknown",
    position: { x: 50, y: 50 },
  },
  logs: [
    {
      id: "boot-1",
      type: "info",
      source: "NETRA-CORE",
      message: "SYSTEM INITIALIZED... LISTENING FOR TELEMETRY",
      timestamp: "--:--:--",
    },
  ],
};

/**
 * Merge an incoming simulation payload into a soldier without ever
 * letting `undefined` overwrite an existing value. This is the heart
 * of the resilient-merge contract.
 */
function mergeSoldier(existing, incoming) {
  if (!incoming) return existing;
  const next = { ...existing };

  if (typeof incoming.callsign === "string") next.callsign = incoming.callsign;
  if (typeof incoming.heartRate === "number") next.heartRate = incoming.heartRate;
  if (typeof incoming.battery === "number") next.battery = incoming.battery;
  if (typeof incoming.trustScore === "number") next.trustScore = incoming.trustScore;
  if (typeof incoming.heading === "number") next.heading = incoming.heading;

  if (typeof incoming.lat === "number") next.lat = incoming.lat;
  if (typeof incoming.lng === "number") next.lng = incoming.lng;

  if (typeof incoming.lat === "number" && typeof incoming.lng === "number") {
    next.position = gpsToPercent(incoming.lat, incoming.lng);
  } else if (
    incoming.position &&
    typeof incoming.position.x === "number" &&
    typeof incoming.position.y === "number"
  ) {
    next.position = { ...next.position, ...incoming.position };
  }

  if (Array.isArray(incoming.equipment) && incoming.equipment.length > 0) {
    next.equipment = incoming.equipment;
  }

  // status is derived if simulation only sends raw status string
  if (typeof incoming.status === "string") {
    if (
      ["nominal", "warning", "critical", "offline"].includes(incoming.status)
    ) {
      next.status = incoming.status;
    } else {
      next.status = mapSimStatusToUi(incoming.status, next.heartRate, next.battery);
    }
  }

  return next;
}

const nowTimestamp = () =>
  new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export const useTacticalStore = create((set, get) => ({
  ...DEFAULT_STATE,

  setBrokerStatus: (brokerStatus) => set({ brokerStatus }),

  /**
   * Resilient ingestion of a parsed telemetry payload from MQTT.
   * Performs a per-soldier shallow merge so partial updates never
   * blank existing fields like callsign or equipment.
   *
   * Supports two payload shapes:
   *
   * 1. Raspberry Pi shape (pixel coords, snake_case):
   *    { timestamp, soldier: { x, y, heart_rate }, enemy: { x, y, distance }, hostage: { x, y } }
   *    Pixel space is assumed to be 0–500 → normalised to 0–100%.
   *
   * 2. Simulation shape (squad array, camelCase):
   *    { timestamp, tick, squad: [{ id, lat, lng, heartRate, battery, status }] }
   */
  updateTacticalData: (incoming) => {
    if (!incoming || typeof incoming !== "object") return;

    // ── Normalise Raspberry Pi payload ──────────────────────────────
    // Detected by the presence of `soldier.heart_rate` (snake_case)
    // or pixel-range x/y values (> 1, not a percentage).
    const isPiPayload =
      incoming.soldier &&
      (typeof incoming.soldier.heart_rate === "number" ||
        (typeof incoming.soldier.x === "number" && incoming.soldier.x > 1));

    if (isPiPayload) {
      // Pi uses an arbitrary pixel canvas — normalise to 0-100%
      // Adjust PI_CANVAS_W / PI_CANVAS_H to match your Pi's resolution
      const PI_CANVAS_W = 500;
      const PI_CANVAS_H = 500;

      const toPercent = (val, max) =>
        Math.max(0, Math.min(100, (val / max) * 100));

      const s = incoming.soldier;
      incoming = {
        ...incoming,
        soldier: {
          id: "alpha",
          position: {
            x: typeof s.x === "number" ? toPercent(s.x, PI_CANVAS_W) : undefined,
            y: typeof s.y === "number" ? toPercent(s.y, PI_CANVAS_H) : undefined,
          },
          // snake_case → camelCase
          heartRate: s.heart_rate ?? s.heartRate,
          battery:   s.battery,
          status:    s.status,
        },
      };

      // Normalise enemy pixel coords
      if (incoming.enemy && typeof incoming.enemy === "object") {
        const en = incoming.enemy;
        incoming = {
          ...incoming,
          enemy: {
            position: {
              x: typeof en.x === "number" ? toPercent(en.x, PI_CANVAS_W) : undefined,
              y: typeof en.y === "number" ? toPercent(en.y, PI_CANVAS_H) : undefined,
            },
            distance: en.distance,
          },
        };
      }

      // Normalise hostage pixel coords
      if (incoming.hostage && typeof incoming.hostage === "object") {
        const h = incoming.hostage;
        incoming = {
          ...incoming,
          hostage: {
            position: {
              x: typeof h.x === "number" ? toPercent(h.x, PI_CANVAS_W) : undefined,
              y: typeof h.y === "number" ? toPercent(h.y, PI_CANVAS_H) : undefined,
            },
          },
        };
      }
    }
    // ── End Pi normalisation ─────────────────────────────────────────

    set((state) => {
      const next = { hasLiveTelemetry: true };

      // Squad-array shape (matches simulate.js)
      if (Array.isArray(incoming.squad)) {
        const byId = new Map(state.soldiers.map((s) => [s.id, s]));
        for (const incomingSoldier of incoming.squad) {
          if (!incomingSoldier || typeof incomingSoldier !== "object") continue;
          const id = String(incomingSoldier.id || "").toLowerCase();
          if (!id) continue;
          const existing = byId.get(id);
          if (existing) {
            byId.set(id, mergeSoldier(existing, incomingSoldier));
          }
          // Unknown ids are ignored to keep the UI stable.
        }
        next.soldiers = Array.from(byId.values());
      }

      // Flat single-soldier shape — Pi payload lands here after normalisation
      if (incoming.soldier && typeof incoming.soldier === "object") {
        const id = String(incoming.soldier.id || "alpha").toLowerCase();
        next.soldiers = (next.soldiers || state.soldiers).map((s) =>
          s.id === id ? mergeSoldier(s, incoming.soldier) : s,
        );
      }

      if (incoming.enemy && typeof incoming.enemy === "object") {
        next.enemy = { ...state.enemy, ...incoming.enemy };
      }

      if (incoming.hostage && typeof incoming.hostage === "object") {
        next.hostage = { ...state.hostage, ...incoming.hostage };
      }

      // Logic gate: proximity alert
      const nextEnemy = next.enemy || state.enemy;
      const distance = nextEnemy?.distance;
      if (
        typeof distance === "number" &&
        distance < 50 &&
        // de-dupe — only push if the most recent log isn't the same alert
        !(state.logs[state.logs.length - 1]?.message?.includes("PROXIMITY ALERT"))
      ) {
        next.logs = [
          ...state.logs,
          {
            id: `prox-${Date.now()}`,
            type: "alert",
            source: "NETRA-INTEL",
            message: `CRITICAL: PROXIMITY ALERT — hostile at ${distance}m`,
            timestamp: nowTimestamp(),
            data: { distance },
          },
        ];
      }

      return next;
    });
  },

  /**
   * Append a log entry. Used by both the MQTT hook and the existing
   * god-mode simulation panel.
   */
  addLog: (entry) => {
    if (!entry || typeof entry !== "object") return;
    set((state) => ({
      logs: [
        ...state.logs,
        {
          id: entry.id || `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: entry.type || "info",
          source: entry.source || "NETRA",
          message: entry.message || "",
          timestamp: entry.timestamp || nowTimestamp(),
          data: entry.data,
        },
      ],
    }));
  },

  /**
   * Imperative single-soldier update used by the existing simulation
   * panel (god mode). Accepts a partial patch and merges it.
   */
  patchSoldier: (id, patch) => {
    set((state) => ({
      soldiers: state.soldiers.map((s) =>
        s.id === id ? mergeSoldier(s, patch) : s,
      ),
    }));
  },

  /**
   * Bulk replace — used by the local fluctuation simulator in page.jsx
   * so the existing useState-driven loop can flow through the store.
   */
  setSoldiers: (updater) => {
    set((state) => ({
      soldiers:
        typeof updater === "function" ? updater(state.soldiers) : updater,
    }));
  },
}));
