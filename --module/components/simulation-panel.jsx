"use client";

import { useState } from "react";

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
      id: "equipmentFailure",
      label: "Equip Fail",
      color: "text-destructive",
      description: "Equipment malfunction",
    },
    {
      id: "connectionLost",
      label: "Conn Lost",
      color: "text-muted-foreground",
      description: "Lose unit connection",
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
    {
      id: "threatDetected",
      label: "Threat",
      color: "text-destructive",
      description: "Hostile contact detected",
    },
  ];

  const handleTrigger = (eventType) => {
    if (!selectedTarget && eventType !== "threatDetected") return;
    onTriggerEvent({
      type: eventType,
      targetId: selectedTarget || undefined,
      timestamp: new Date().toISOString(),
    });
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
                  disabled={!selectedTarget && event.id !== "threatDetected"}
                  title={event.description}
                  className={`px-2 py-1.5 rounded border text-[10px] uppercase tracking-wide transition-all ${
                    !selectedTarget && event.id !== "threatDetected"
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
                    onTriggerEvent({
                      type: "connectionRestored",
                      targetId: s.id,
                      timestamp: new Date().toISOString(),
                    });
                  });
                }}
                className="flex-1 px-2 py-1.5 rounded border border-success/50 text-success text-[10px] uppercase tracking-wide hover:bg-success/10 transition-colors"
              >
                Reset All
              </button>
              <button
                onClick={() => {
                  const randomSoldier =
                    soldiers[Math.floor(Math.random() * soldiers.length)];
                  const randomEvents = [
                    "heartRateSpike",
                    "batteryDrain",
                    "equipmentFailure",
                  ];
                  const randomEvent =
                    randomEvents[
                      Math.floor(Math.random() * randomEvents.length)
                    ];
                  onTriggerEvent({
                    type: randomEvent,
                    targetId: randomSoldier.id,
                    timestamp: new Date().toISOString(),
                  });
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
