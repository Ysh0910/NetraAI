"use client";

import { useEffect, useState } from "react";

function HeartRateGraph({ heartRate, status }) {
  const [points, setPoints] = useState([]);
  const hasPulse = typeof heartRate === "number" && heartRate > 0;
  useEffect(() => {
    if (!hasPulse) {
      setPoints([]);
      return undefined;
    }
    const interval = setInterval(() => {
      setPoints((prev) => {
        const newPoint = heartRate + (Math.random() - 0.5) * 10;
        const updated = [...prev, newPoint];
        return updated.slice(-20);
      });
    }, 200);
    return () => clearInterval(interval);
  }, [heartRate, hasPulse]);

  const getColor = () => {
    switch (status) {
      case "nominal":
        return "stroke-success";
      case "warning":
        return "stroke-accent";
      case "critical":
        return "stroke-destructive";
      case "offline":
        return "stroke-muted-foreground";
    }
  };

  const pathD = points
    .map((p, i) => {
      const x = (i / 19) * 100;
      const y = 50 - ((p - 70) / 60) * 40;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full h-8"
      preserveAspectRatio="none"
    >
      <path d={pathD} fill="none" className={`${getColor()} stroke-[2]`} />
    </svg>
  );
}

function StatusIndicator({ status }) {
  const getStatusConfig = () => {
    switch (status) {
      case "nominal":
        return { color: "bg-success", glow: "glow-success", label: "NOMINAL" };
      case "warning":
        return { color: "bg-accent", glow: "glow-warning", label: "WARNING" };
      case "critical":
        return {
          color: "bg-destructive",
          glow: "glow-danger animate-critical",
          label: "CRITICAL",
        };
      case "offline":
        return { color: "bg-muted-foreground", glow: "", label: "OFFLINE" };
    }
  };
  const config = getStatusConfig();
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${config.color} ${config.glow}`} />
      <span
        className={`text-[10px] uppercase tracking-wider ${
          status === "nominal"
            ? "text-success"
            : status === "warning"
              ? "text-accent"
              : status === "critical"
                ? "text-destructive"
                : "text-muted-foreground"
        }`}
      >
        {config.label}
      </span>
    </div>
  );
}

function BatteryIndicator({ level }) {
  const getColor = () => {
    if (level > 50) return "bg-success";
    if (level > 20) return "bg-accent";
    return "bg-destructive";
  };
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-8 h-4 border border-muted-foreground rounded-sm">
        <div
          className={`absolute inset-0.5 ${getColor()} rounded-sm transition-all`}
          style={{ width: `${Math.max(0, Math.min(100, level)) * 0.9}%` }}
        />

        <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-2 bg-muted-foreground rounded-r-sm" />
      </div>
      <span
        className={`text-xs font-tactical ${
          level > 50
            ? "text-success"
            : level > 20
              ? "text-accent"
              : "text-destructive"
        }`}
      >
        {level}%
      </span>
    </div>
  );
}

export function TelemetryPanel({ soldiers, selectedSoldier, onSelectSoldier }) {
  const list = Array.isArray(soldiers) ? soldiers : [];
  return (
    <div className="h-full bg-card border border-border rounded overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <span className="text-xs uppercase tracking-wider text-foreground">
            Squad Telemetry
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">{list.length} UNITS</span>
      </div>

      {/* Soldier Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {list.map((soldier) => {
          const status = soldier?.status ?? "offline";
          const callsign = soldier?.callsign ?? "UNIT";
          const heartRate = soldier?.heartRate;
          const hasPulse = typeof heartRate === "number" && heartRate > 0;
          const battery = soldier?.battery ?? 0;
          const equipment = Array.isArray(soldier?.equipment)
            ? soldier.equipment
            : [];
          return (
            <button
              key={soldier?.id ?? callsign}
              onClick={() => onSelectSoldier?.(soldier?.id)}
              className={`w-full text-left p-3 rounded border transition-all ${
                selectedSoldier === soldier?.id
                  ? "border-primary bg-primary/10 glow-primary"
                  : "border-border bg-background hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              {/* Callsign & Status */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                      status === "nominal"
                        ? "bg-success/20 text-success"
                        : status === "warning"
                          ? "bg-accent/20 text-accent"
                          : status === "critical"
                            ? "bg-destructive/20 text-destructive"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {callsign.charAt(0)}
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    {callsign}
                  </span>
                </div>
                <StatusIndicator status={status} />
              </div>

              {/* Heart Rate */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground uppercase">
                    Heart Rate
                  </span>
                  <span
                    className={`text-sm font-tactical ${
                      hasPulse && heartRate > 120
                        ? "text-destructive text-glow-danger"
                        : hasPulse && heartRate > 100
                          ? "text-accent text-glow-warning"
                          : hasPulse
                            ? "text-success text-glow-success"
                            : "text-muted-foreground"
                    } ${hasPulse ? "animate-pulse" : ""}`}
                  >
                    {hasPulse ? `${Math.round(heartRate)} BPM` : "-- BPM"}
                  </span>
                </div>
                <HeartRateGraph
                  heartRate={heartRate ?? 0}
                  status={status}
                />
              </div>

              {/* Battery & Equipment */}
              <div className="flex items-center justify-between">
                <BatteryIndicator level={Math.round(battery)} />
                <div className="flex items-center gap-1">
                  {equipment.length > 0 ? (
                    equipment.map((eq, i) => (
                      <div
                        key={i}
                        className={`px-1.5 py-0.5 rounded text-[9px] uppercase ${
                          eq?.status === "active"
                            ? "bg-success/20 text-success"
                            : eq?.status === "standby"
                              ? "bg-muted text-muted-foreground"
                              : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {eq?.name ?? "--"}
                      </div>
                    ))
                  ) : (
                    <div className="px-1.5 py-0.5 rounded text-[9px] uppercase bg-muted text-muted-foreground">
                      NO KIT
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="px-3 py-2 border-t border-border bg-muted/30 grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="text-[10px] text-muted-foreground">ACTIVE</div>
          <div className="text-sm font-bold text-success">
            {list.filter((s) => s?.status === "nominal").length}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">WARNING</div>
          <div className="text-sm font-bold text-accent">
            {list.filter((s) => s?.status === "warning").length}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">CRITICAL</div>
          <div className="text-sm font-bold text-destructive">
            {list.filter((s) => s?.status === "critical").length}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">OFFLINE</div>
          <div className="text-sm font-bold text-muted-foreground">
            {list.filter((s) => s?.status === "offline").length}
          </div>
        </div>
      </div>
    </div>
  );
}
