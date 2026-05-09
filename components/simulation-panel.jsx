"use client";

import { useState } from "react";
import { publishMessage } from "@/hooks/use-mqtt-integration";

// Sends a patch_soldier command to the simulation server via MQTT.
// The sim applies the patch and immediately publishes a fresh telemetry payload.
function sendPatch(targetId, patch) {
  return publishMessage("tactical/commands", {
    command:   "patch_soldier",
    targetId,
    patch,
    timestamp: Date.now(),
  });
}

export function SimulationPanel({ soldiers, onTriggerEvent }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedTarget, setSelectedTarget] = useState("");

  const eventTypes = [
    {
      id: "heartRateSpike",
      label: "HR Spike",
      color: "text-destructive",
      description: "Simulate heart rate increase",
    },
    {
      id: "heartRateDrop",
      label: "HR Drop",
      color: "text-accent",
      description: "Simulate heart rate decrease",
    },
    {
      id: "batteryDrain",
      label: "Battery Drain",
      color: "text-accent",
      description: "Rapid battery depletion",
    },
    {
      id: "connectionLost",
      label: "Conn Lost",
      color: "text-muted-foreground",
      description: "Mark unit offline",
    },
    {
      id: "connectionRestored",
      label: "Conn Restore",
      color: "text-success",
      description: "Restore unit connection",
    },
    {
      id: "casualty",
      label: "Casualty",
      color: "text-destructive",
      description: "Simulate casualty event",
    },
  ];

  const handleTrigger = (eventType) => {
    if (!selectedTarget) return;

    const target = soldiers.find((s) => s.id === selectedTarget);
    if (!target) return;

    let patch = {};

    switch (eventType) {
      case "heartRateSpike":
        patch = { heartRate: Math.min(150, (target.heartRate ?? 80) + 40), status: "critical" };
        break;
      case "heartRateDrop":
        patch = { heartRate: Math.max(50, (target.heartRate ?? 80) - 20), status: "warning" };
        break;
      case "batteryDrain":
        patch = { battery: Math.max(5, (target.battery ?? 100) - 30), status: "warning" };
        break;
      case "connectionLost":
        patch = { status: "offline" };
        break;
      case "connectionRestored":
        patch = { status: "nominal", heartRate: 75 + Math.floor(Math.random() * 10), battery: 80 + Math.floor(Math.random() * 15) };
        break;
      case "casualty":
        patch = { heartRate: 42, status: "critical" };
        break;
      default:
        return;
    }

    const sent = sendPatch(selectedTarget, patch);
    if (!sent) {
      // Broker not connected — fall back to local god-mode so the UI still responds
      onTriggerEvent({ type: eventType, targetId: selectedTarget, timestamp: new Date().toISOString() });
    }
  };

  return (
    <div className="bg-card border border-border rounded overflow-hidden">
      {/* Header - Collapsible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 border-b border-border bg-destructive/10 flex items-center justify-between hover:bg-destructive/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-destructive"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span className="text-xs uppercase tracking-wider text-destructive">
            God Mode
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">SIM CONTROL</span>
          <svg
            className={`w-3 h-3 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-3 space-y-3">
          {/* Target Selection */}
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
              Target Unit
            </label>
            <select
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
              className="w-full bg-input border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select unit...</option>
              {soldiers.map((soldier) => (
                <option key={soldier.id} value={soldier.id}>
                  {soldier.callsign} - {soldier.status.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Event Buttons */}
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-2">
              Trigger Event
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {eventTypes.map((event) => (
                <button
                  key={event.id}
                  onClick={() => handleTrigger(event.id)}
                  disabled={!selectedTarget}
                  title={event.description}
                  className={`px-2 py-1.5 rounded border text-[10px] uppercase tracking-wide transition-all ${
                    !selectedTarget
                      ? "border-border bg-muted/30 text-muted-foreground cursor-not-allowed"
                      : `border-border hover:border-current ${event.color} bg-background hover:bg-muted/30`
                  }`}
                >
                  {event.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-2 border-t border-border">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-2">
              Quick Actions
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  soldiers.forEach((s) => {
                    const sent = sendPatch(s.id, {
                      status: "nominal",
                      heartRate: 75 + Math.floor(Math.random() * 10),
                      battery: 80 + Math.floor(Math.random() * 15),
                    });
                    if (!sent) {
                      onTriggerEvent({ type: "connectionRestored", targetId: s.id, timestamp: new Date().toISOString() });
                    }
                  });
                }}
                className="flex-1 px-2 py-1.5 rounded border border-success/50 text-success text-[10px] uppercase tracking-wide hover:bg-success/10 transition-colors"
              >
                Reset All
              </button>
              <button
                onClick={() => {
                  const randomSoldier = soldiers[Math.floor(Math.random() * soldiers.length)];
                  const events = ["heartRateSpike", "batteryDrain", "casualty"];
                  handleTrigger(events[Math.floor(Math.random() * events.length)]);
                  if (!selectedTarget) setSelectedTarget(randomSoldier.id);
                }}
                className="flex-1 px-2 py-1.5 rounded border border-accent/50 text-accent text-[10px] uppercase tracking-wide hover:bg-accent/10 transition-colors"
              >
                Random Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
