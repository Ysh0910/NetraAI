"use client";

import { useState, useCallback } from "react";

export function TacticalMap({ soldiers, selectedSoldier, onSelectSoldier }) {
  const [hoveredSoldier, setHoveredSoldier] = useState(null);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case "nominal":
        return "text-success";
      case "warning":
        return "text-accent";
      case "critical":
        return "text-destructive";
      case "offline":
        return "text-muted-foreground";
    }
  }, []);

  const getGlowClass = useCallback((status) => {
    switch (status) {
      case "nominal":
        return "glow-success";
      case "warning":
        return "glow-warning";
      case "critical":
        return "glow-danger animate-critical";
      case "offline":
        return "";
    }
  }, []);

  return (
    <div className="relative w-full h-full bg-card rounded border border-border overflow-hidden">
      {/* Map Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            LIVE FEED
          </span>
        </div>
        <div className="text-xs text-primary font-tactical">
          SECTOR 7-ALPHA | GRID REF: 38°54&apos;17&quot;N 77°00&apos;59&quot;W
        </div>
        <div className="text-xs text-muted-foreground">
          ZOOM: 1.5x | ALT: 450m
        </div>
      </div>

      {/* Tactical Grid Background */}
      <div className="absolute inset-0 tactical-grid" />

      {/* Topographic contour lines */}
      <svg
        className="absolute inset-0 w-full h-full opacity-20"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id="contour"
            patternUnits="userSpaceOnUse"
            width="100"
            height="100"
          >
            <path
              d="M0 50 Q25 30 50 50 T100 50"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-primary"
            />
          </pattern>
        </defs>
        <ellipse
          cx="30%"
          cy="40%"
          rx="20%"
          ry="15%"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-primary/30"
        />
        <ellipse
          cx="30%"
          cy="40%"
          rx="15%"
          ry="10%"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-primary/20"
        />
        <ellipse
          cx="70%"
          cy="60%"
          rx="25%"
          ry="18%"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-primary/30"
        />
        <ellipse
          cx="70%"
          cy="60%"
          rx="18%"
          ry="12%"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-primary/20"
        />
        <path
          d="M10% 80% Q30% 70% 50% 75% T90% 65%"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-primary/25"
        />
        <path
          d="M5% 90% Q25% 80% 45% 85% T85% 75%"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-primary/20"
        />
      </svg>

      {/* Terrain features */}
      <div className="absolute top-[20%] left-[15%] w-24 h-16 border border-primary/20 rounded bg-primary/5 flex items-center justify-center">
        <span className="text-[10px] text-primary/50 uppercase">
          Structure A
        </span>
      </div>
      <div className="absolute top-[55%] right-[20%] w-32 h-20 border border-primary/20 rounded bg-primary/5 flex items-center justify-center">
        <span className="text-[10px] text-primary/50 uppercase">
          Compound B
        </span>
      </div>
      <div className="absolute bottom-[25%] left-[40%] w-16 h-16 border border-accent/30 rounded-full bg-accent/10 flex items-center justify-center">
        <span className="text-[10px] text-accent/60 uppercase">HZ</span>
      </div>

      {/* Soldier Markers */}
      {soldiers.map((soldier) => (
        <button
          key={soldier.id}
          onClick={() => onSelectSoldier(soldier.id)}
          onMouseEnter={() => setHoveredSoldier(soldier.id)}
          onMouseLeave={() => setHoveredSoldier(null)}
          className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary ${
            selectedSoldier === soldier.id ? "scale-125 z-20" : "z-10"
          }`}
          style={{
            left: `${soldier.position.x}%`,
            top: `${soldier.position.y}%`,
          }}
        >
          {/* Pulse ring for selected */}
          {selectedSoldier === soldier.id && (
            <div
              className={`absolute inset-0 w-12 h-12 -m-3 rounded-full ${getStatusColor(soldier.status).replace("text-", "bg-")}/20 animate-ping`}
            />
          )}

          {/* Marker */}
          <div
            className={`relative w-6 h-6 rounded ${getGlowClass(soldier.status)}`}
          >
            {/* Diamond shape */}
            <svg
              viewBox="0 0 24 24"
              className={`w-full h-full ${getStatusColor(soldier.status)}`}
            >
              <path
                d="M12 2 L22 12 L12 22 L2 12 Z"
                fill="currentColor"
                fillOpacity={soldier.status === "offline" ? 0.3 : 0.8}
                stroke="currentColor"
                strokeWidth="1"
              />

              <text
                x="12"
                y="14"
                textAnchor="middle"
                className="fill-background text-[8px] font-bold"
              >
                {soldier.callsign.charAt(0)}
              </text>
            </svg>

            {/* Direction indicator */}
            <div
              className={`absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] ${getStatusColor(soldier.status).replace("text-", "border-b-")}`}
              style={{
                transform: `translateX(-50%) rotate(${soldier.heading}deg)`,
              }}
            />
          </div>

          {/* Label */}
          <div
            className={`absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap ${
              hoveredSoldier === soldier.id || selectedSoldier === soldier.id
                ? "opacity-100"
                : "opacity-0"
            } transition-opacity`}
          >
            <div className="bg-background/90 border border-border px-2 py-1 rounded text-xs">
              <div
                className={`font-bold ${getStatusColor(soldier.status)} text-glow-${soldier.status === "nominal" ? "success" : soldier.status === "warning" ? "warning" : soldier.status === "critical" ? "danger" : ""}`}
              >
                {soldier.callsign}
              </div>
              <div className="text-muted-foreground text-[10px]">
                HR: {soldier.heartRate} | BAT: {soldier.battery}%
              </div>
            </div>
          </div>
        </button>
      ))}

      {/* Connection lines between soldiers */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {soldiers.map((soldier, i) =>
          soldiers
            .slice(i + 1)
            .map((other) => (
              <line
                key={`${soldier.id}-${other.id}`}
                x1={`${soldier.position.x}%`}
                y1={`${soldier.position.y}%`}
                x2={`${other.position.x}%`}
                y2={`${other.position.y}%`}
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="4 4"
                className="text-primary/20"
              />
            )),
        )}
      </svg>

      {/* Scale indicator */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        <div className="w-20 h-0.5 bg-primary/50" />
        <span className="text-[10px] text-muted-foreground">100m</span>
      </div>

      {/* Compass */}
      <div className="absolute bottom-4 right-4 w-12 h-12 border border-border rounded-full bg-background/50 flex items-center justify-center">
        <div className="relative w-8 h-8">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] text-destructive font-bold">
            N
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground">
            S
          </div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
            W
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
            E
          </div>
        </div>
      </div>
    </div>
  );
}
