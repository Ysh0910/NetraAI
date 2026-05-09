"use client";

import { useState, useCallback, useRef } from "react";
import { isPositionBlocked, VIDHANA_GRID, GRID_ROWS, GRID_COLS } from "@/lib/tactical-grid";

export function TacticalMap({ soldiers, selectedSoldier, onSelectSoldier }) {
  const liveSquad = Array.isArray(soldiers) ? soldiers : [];
  const [hoveredSoldier, setHoveredSoldier] = useState(null);
  const [cursorOverWall, setCursorOverWall] = useState(false);
  const mapRef = useRef(null);

  // Enemy marker position (percentage-based, draggable)
  const [enemyPos, setEnemyPos] = useState({ x: 70, y: 60 });

  // Hostage marker position (percentage-based, draggable)
  const [hostagePos, setHostagePos] = useState({ x: 55, y: 45 });

  // Soldier positions — local drag state, no store writes, no movement logic
  const [soldierPositions, setSoldierPositions] = useState({});

  // Tracking drag state for enemy
  const [draggingEnemy, setDraggingEnemy] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Tracking drag state for hostage
  const [draggingHostage, setDraggingHostage] = useState(false);
  const [hostDragOffset, setHostDragOffset] = useState({ x: 0, y: 0 });

  // Drag state for soldier markers
  const [draggingSoldier, setDraggingSoldier] = useState(null);
  const [soldierDragOffset, setSoldierDragOffset] = useState({ x: 0, y: 0 });

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case "nominal":   return "text-success";
      case "warning":   return "text-accent";
      case "critical":  return "text-destructive";
      case "offline":   return "text-muted-foreground";
    }
  }, []);

  // Drag handler for enemy marker
  const handleEnemyMouseDown = (e) => {
    if (!mapRef.current) return;
    e.stopPropagation();
    const rect = mapRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;
    setDraggingEnemy(true);
    setDragOffset({ x: clickX - enemyPos.x, y: clickY - enemyPos.y });
  };

  // Drag handler for hostage marker
  const handleHostageMouseDown = (e) => {
    if (!mapRef.current) return;
    e.stopPropagation();
    const rect = mapRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;
    setDraggingHostage(true);
    setHostDragOffset({ x: clickX - hostagePos.x, y: clickY - hostagePos.y });
  };

  const handleMouseMove = (e) => {
    if (!mapRef.current) return;

    // Check if cursor is over a wall (for visual feedback)
    if (!draggingSoldier && !draggingEnemy && !draggingHostage) {
      const rect = mapRef.current.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
      const mouseY = ((e.clientY - rect.top) / rect.height) * 100;
      setCursorOverWall(isPositionBlocked(mouseX, mouseY));
    }

    // Enemy drag
    if (draggingEnemy) {
      const rect = mapRef.current.getBoundingClientRect();
      const moveX = ((e.clientX - rect.left) / rect.width) * 100;
      const moveY = ((e.clientY - rect.top) / rect.height) * 100;
      setEnemyPos({
        x: Math.max(0, Math.min(100, moveX - dragOffset.x)),
        y: Math.max(0, Math.min(100, moveY - dragOffset.y)),
      });
    }

    // Hostage drag
    if (draggingHostage) {
      const rect = mapRef.current.getBoundingClientRect();
      const moveX = ((e.clientX - rect.left) / rect.width) * 100;
      const moveY = ((e.clientY - rect.top) / rect.height) * 100;
      setHostagePos({
        x: Math.max(0, Math.min(100, moveX - hostDragOffset.x)),
        y: Math.max(0, Math.min(100, moveY - hostDragOffset.y)),
      });
    }

    // Soldier drag — pure local state, no store writes, no movement logic
    if (draggingSoldier) {
      const rect = mapRef.current.getBoundingClientRect();
      const moveX = ((e.clientX - rect.left) / rect.width) * 100;
      const moveY = ((e.clientY - rect.top) / rect.height) * 100;
      setSoldierPositions((prev) => ({
        ...prev,
        [draggingSoldier]: {
          x: Math.max(0, Math.min(100, moveX - soldierDragOffset.x)),
          y: Math.max(0, Math.min(100, moveY - soldierDragOffset.y)),
        },
      }));
    }
  };

  const handleMouseUp = () => {
    setDraggingEnemy(false);
    setDraggingHostage(false);
    setDraggingSoldier(null);
  };

  // Drag handler for soldier markers
  const handleSoldierMouseDown = (e, soldierId, currentPos) => {
    if (!mapRef.current) return;
    e.stopPropagation();
    const rect = mapRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;
    setDraggingSoldier(soldierId);
    setSoldierDragOffset({ x: clickX - currentPos.x, y: clickY - currentPos.y });
  };

  // Derive telemetry from the first live soldier + enemy for the header
  const primarySoldier = liveSquad[0];
  const heartRate = primarySoldier?.heartRate ?? 75;
  const soldierPos = primarySoldier?.position ?? { x: 50, y: 50 };
  const distanceToEnemy = Math.round(
    Math.sqrt(
      Math.pow(soldierPos.x - enemyPos.x, 2) + Math.pow(soldierPos.y - enemyPos.y, 2)
    )
  );

  return (
    <div
      ref={mapRef}
      className={`relative w-full h-full bg-card rounded border border-border overflow-hidden ${
        draggingSoldier || draggingEnemy || draggingHostage
          ? "cursor-grabbing"
          : cursorOverWall
            ? "cursor-not-allowed"
            : "cursor-grab"
      }`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Satellite/Top-Down Map Background */}
      <img
        src="/satellite.jpg"
        alt="Satellite Tactical Map"
        className="absolute inset-0 w-full h-full object-contain bg-black"
        style={{ filter: "contrast(1.3) brightness(1.2) saturate(1.1)" }}
      />

      {/* Tactical Grid Overlay */}
      <div className="absolute inset-0 tactical-grid opacity-10" />

      {/* DEBUG: Wall grid visualization (remove after testing) */}
      {false && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
          {VIDHANA_GRID.map((row, r) =>
            row.map((cell, c) =>
              cell === 1 ? (
                <rect
                  key={`${r}-${c}`}
                  x={`${(c / GRID_COLS) * 100}%`}
                  y={`${(r / GRID_ROWS) * 100}%`}
                  width={`${(1 / GRID_COLS) * 100}%`}
                  height={`${(1 / GRID_ROWS) * 100}%`}
                  fill="red"
                />
              ) : null
            )
          )}
        </svg>
      )}

      {/* Map Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-background/70 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            LIVE FEED - INTERACTIVE SIMULATOR
          </span>
        </div>
        <div className="text-xs text-primary font-tactical">
          SECTOR 7-ALPHA | GRID REF: 38°54&apos;17&quot;N 77°00&apos;59&quot;W
        </div>
        <div className="text-xs text-muted-foreground">
          HR: {heartRate} BPM | IN COVER: {distanceToEnemy}
        </div>
      </div>

      {/* Live squad markers */}
      {liveSquad.map((s) => {
        // Use local drag position if available, otherwise fall back to store position
        const storePos = s?.position ?? { x: 50, y: 50 };
        const localPos = soldierPositions[s?.id];
        const px = localPos?.x ?? storePos.x;
        const py = localPos?.y ?? storePos.y;
        const status = s?.status ?? "offline";
        const callsign = s?.callsign ?? s?.id ?? "UNIT";
        const isDragging = draggingSoldier === s?.id;
        const ringColor =
          status === "critical"
            ? "bg-destructive"
            : status === "warning"
              ? "bg-accent"
              : status === "offline"
                ? "bg-muted-foreground"
                : "bg-success";
        const textColor =
          status === "critical"
            ? "text-destructive"
            : status === "warning"
              ? "text-accent"
              : status === "offline"
                ? "text-muted-foreground"
                : "text-success";
        return (
          <div
            key={`live-${s?.id ?? callsign}`}
            className={`absolute cursor-move select-none ${isDragging ? "z-30" : "z-20"}`}
            style={{
              left: `${px}%`,
              top: `${py}%`,
              transform: "translate(-50%, -50%)",
              transition: isDragging ? "none" : "left 300ms ease, top 300ms ease",
            }}
            onMouseDown={(e) => handleSoldierMouseDown(e, s?.id, { x: px, y: py })}
            onClick={() => onSelectSoldier?.(s?.id)}
            onMouseEnter={() => setHoveredSoldier(s?.id)}
            onMouseLeave={() => setHoveredSoldier(null)}
          >
            <div className="relative flex items-center justify-center">
              <div className={`absolute w-8 h-8 rounded-full ${ringColor}/15 animate-ping`} />
              <div
                className={`relative w-3 h-3 rounded-full ${ringColor} border border-background ${isDragging ? "scale-125" : ""} transition-transform`}
              />
              <div
                className={`absolute left-full ml-1.5 whitespace-nowrap text-[9px] font-tactical uppercase tracking-wider ${textColor}`}
              >
                {callsign}
              </div>
            </div>

            {/* Hover tooltip */}
            {hoveredSoldier === s?.id && (
              <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 whitespace-nowrap z-40">
                <div className={`bg-background/90 border border-border px-2 py-1 rounded text-xs`}>
                  <div className={`font-bold ${getStatusColor(status)}`}>{callsign}</div>
                  <div className="text-muted-foreground text-[10px]">
                    HR: {s?.heartRate ?? "--"} BPM
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* HOSTILE Enemy Marker */}
      <button
        onMouseDown={handleEnemyMouseDown}
        onClick={() => onSelectSoldier?.("HOSTILE")}
        onMouseEnter={() => setHoveredSoldier("HOSTILE")}
        onMouseLeave={() => setHoveredSoldier(null)}
        className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-destructive z-20 cursor-pointer"
        style={{ left: `${enemyPos.x}%`, top: `${enemyPos.y}%` }}
      >
        <div className="relative w-6 h-6 rounded glow-danger">
          <svg viewBox="0 0 24 24" className="w-full h-full text-destructive">
            <rect
              x="4" y="4" width="16" height="16"
              fill="currentColor" fillOpacity="0.8"
              stroke="currentColor" strokeWidth="1"
            />
            <text x="12" y="14" textAnchor="middle" className="fill-background text-[8px] font-bold">
              H
            </text>
          </svg>
          <div className="absolute inset-0 w-6 h-6 rounded border-2 border-destructive/50 animate-pulse" />
        </div>

        {hoveredSoldier === "HOSTILE" && (
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap z-40">
            <div className="bg-background/90 border border-destructive/50 px-2 py-1 rounded text-xs">
              <div className="font-bold text-destructive">HOSTILE</div>
              <div className="text-muted-foreground text-[10px]">THREAT: ACTIVE</div>
            </div>
          </div>
        )}
      </button>

      {/* HOSTAGE Marker */}
      <button
        onMouseDown={handleHostageMouseDown}
        onClick={() => onSelectSoldier?.("HOSTAGE")}
        onMouseEnter={() => setHoveredSoldier("HOSTAGE")}
        onMouseLeave={() => setHoveredSoldier(null)}
        className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-accent z-20 cursor-pointer"
        style={{ left: `${hostagePos.x}%`, top: `${hostagePos.y}%` }}
      >
        <div className="relative w-6 h-6 flex items-center justify-center">
          {/* Diamond shape via rotated square */}
          <svg viewBox="0 0 24 24" className="w-full h-full text-accent">
            <rect
              x="6" y="6" width="12" height="12"
              fill="currentColor" fillOpacity="0.8"
              stroke="currentColor" strokeWidth="1"
              transform="rotate(45 12 12)"
            />
            <text x="12" y="15" textAnchor="middle" className="fill-background text-[7px] font-bold">
              HG
            </text>
          </svg>
          <div className="absolute inset-0 w-6 h-6 rounded border-2 border-accent/50 animate-pulse" />
        </div>

        {hoveredSoldier === "HOSTAGE" && (
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap z-40">
            <div className="bg-background/90 border border-accent/50 px-2 py-1 rounded text-xs">
              <div className="font-bold text-accent">HOSTAGE</div>
              <div className="text-muted-foreground text-[10px]">STATUS: UNKNOWN</div>
            </div>
          </div>
        )}
      </button>

      {/* Connection line between ALPHA-1 and HOSTILE */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <line
          x1={`${soldierPos.x}%`}
          y1={`${soldierPos.y}%`}
          x2={`${enemyPos.x}%`}
          y2={`${enemyPos.y}%`}
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 4"
          className="text-primary/30"
        />
      </svg>

      {/* Scale indicator */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        <div className="w-20 h-0.5 bg-primary/50" />
        <span className="text-[10px] text-muted-foreground">100m</span>
      </div>

      {/* Compass */}
      <div className="absolute bottom-4 right-4 w-12 h-12 border border-border rounded-full bg-background/50 flex items-center justify-center">
        <div className="relative w-8 h-8">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] text-destructive font-bold">N</div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground">S</div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">W</div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">E</div>
        </div>
      </div>
    </div>
  );
}
