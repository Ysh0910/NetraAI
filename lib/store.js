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
 * broker or simulation is offline.
 */
export const DEFAULT_STATE = {
  hasLiveTelemetry: false,
  brokerStatus: "disconnected",
  soldiers: [
    { id: "alpha",   callsign: "ALPHA-1",   status: "nominal", heartRate: 78, battery: 92, position: { x: 18, y: 30 }, lat: null, lng: null },
    { id: "charlie", callsign: "CHARLIE-3", status: "nominal", heartRate: 80, battery: 95, position: { x: 32, y: 35 }, lat: null, lng: null },
  ],
  enemy: {
    callsign: "HOSTILE",
    distance: null,
    position: { x: 70, y: 60 },
  },
  hostage: {
    callsign: "HOSTAGE",
    position: { x: 55, y: 45 },
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
 * letting `undefined` overwrite an existing value.
 */
function mergeSoldier(existing, incoming) {
  if (!incoming) return existing;
  const next = { ...existing };

  if (typeof incoming.callsign  === "string") next.callsign  = incoming.callsign;
  if (typeof incoming.heartRate === "number") next.heartRate = incoming.heartRate;
  if (typeof incoming.battery   === "number") next.battery   = incoming.battery;
  if (typeof incoming.lat       === "number") next.lat       = incoming.lat;
  if (typeof incoming.lng       === "number") next.lng       = incoming.lng;

  // GPS → screen percentage
  if (typeof incoming.lat === "number" && typeof incoming.lng === "number") {
    next.position = gpsToPercent(incoming.lat, incoming.lng);
  }

  // status must be one of the UI enum values
  if (typeof incoming.status === "string") {
    if (["nominal", "warning", "critical", "offline"].includes(incoming.status)) {
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
   * Only handles the simulation shape:
   *   { timestamp, tick, squad: [{ id, callsign, lat, lng, heartRate, battery, status }],
   *     enemy: { callsign, lat, lng }, hostage: { callsign, lat, lng } }
   */
  updateTacticalData: (incoming) => {
    if (!incoming || typeof incoming !== "object") return;

    set((state) => {
      const next = { hasLiveTelemetry: true };

      // Squad array
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
        }
        next.soldiers = Array.from(byId.values());
      }

      // Enemy — store callsign + GPS position
      if (incoming.enemy && typeof incoming.enemy === "object") {
        const en = incoming.enemy;
        const enemyNext = { ...state.enemy };
        if (typeof en.callsign === "string") enemyNext.callsign = en.callsign;
        if (typeof en.lat === "number" && typeof en.lng === "number") {
          enemyNext.position = gpsToPercent(en.lat, en.lng);
        }
        next.enemy = enemyNext;
      }

      // Hostage — store callsign + GPS position
      if (incoming.hostage && typeof incoming.hostage === "object") {
        const h = incoming.hostage;
        const hostageNext = { ...state.hostage };
        if (typeof h.callsign === "string") hostageNext.callsign = h.callsign;
        if (typeof h.lat === "number" && typeof h.lng === "number") {
          hostageNext.position = gpsToPercent(h.lat, h.lng);
        }
        next.hostage = hostageNext;
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

  /**
   * Store AI audio response from netra-comms.
   * Contains: { url, text, filename, timestamp }
   */
  lastAiAudio: null,
  setLastAiAudio: (data) => {
    if (!data) return;
    set({
      lastAiAudio: {
        url: data.audioUrl || data.url,
        text: data.decision || data.text,
        filename: data.audioUrl?.split('/').pop() || data.filename,
        timestamp: data.timestamp || Date.now(),
      }
    });
  },
}));
