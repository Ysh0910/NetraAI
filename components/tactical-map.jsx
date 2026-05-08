"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTacticalStore } from "@/lib/store";
import { isPositionBlocked, findNearestValidPosition } from "@/lib/tactical-grid";

export function TacticalMap({ soldiers, selectedSoldier, onSelectSoldier }) {
  const hasLiveTelemetry = useTacticalStore((s) => s.hasLiveTelemetry);
  const liveSquad = Array.isArray(soldiers) ? soldiers : [];
  const [hoveredSoldier, setHoveredSoldier] = useState(null);
  const mapRef = useRef(null);

  // Draggable unit positions (percentage-based)
  const [soldierPos, setSoldierPos] = useState({ x: 30, y: 40 });
  const [enemyPos, setEnemyPos] = useState({ x: 70, y: 60 });

  // Tracking drag state
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Telemetry data (for legacy debug markers only)
  const [inCover, setInCover] = useState(0);
  const [heartRate, setHeartRate] = useState(75);
  const [soldierStatus, setSoldierStatus] = useState("nominal");

  // Drag state for live squad markers
  const [draggingSoldier, setDraggingSoldier] = useState(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragStartMouse, setDragStartMouse] = useState({ x: 0, y: 0 });

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

  // Collision detection: Check if position hits a wall using the tactical grid
  const checkWallCollision = useCallback((pos) => {
    return isPositionBlocked(pos.x, pos.y);
  }, []);

  // Calculate distance between soldier and enemy
  const calculateDistance = useCallback((pos1, pos2) => {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Map distance to heart rate (75 BPM baseline at distance > 50%, max 160 BPM at distance < 5%)
  const calculateHeartRate = useCallback((distance) => {
    const maxDistance = 50; // Baseline at > 50% map distance
    const minDistance = 5; // Max heart rate at < 5% map distance
    
    if (distance >= maxDistance) {
      return 75;
    } else if (distance <= minDistance) {
      return 160;
    } else {
      // Linear interpolation between 75 and 160
      const ratio = (maxDistance - distance) / (maxDistance - minDistance);
      return Math.round(75 + (160 - 75) * ratio);
    }
  }, []);

  // Get soldier status based on heart rate
  const getHeartRateStatus = useCallback((hr) => {
    if (hr < 90) return "nominal";
    if (hr < 130) return "warning";
    return "critical";
  }, []);

  // Drag handlers for legacy debug markers
  const handleMouseDown = (e, unitType) => {
    if (!mapRef.current) return;
    
    const rect = mapRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;
    
    const currentPos = unitType === "soldier" ? soldierPos : enemyPos;
    
    setDragging(unitType);
    setDragOffset({
      x: clickX - currentPos.x,
      y: clickY - currentPos.y,
    });
  };

  const handleMouseMove = (e) => {
    if (!mapRef.current) return;

    // Handle legacy marker dragging
    if (dragging) {
      const rect = mapRef.current.getBoundingClientRect();
      const moveX = ((e.clientX - rect.left) / rect.width) * 100;
      const moveY = ((e.clientY - rect.top) / rect.height) * 100;

      const newX = Math.max(0, Math.min(100, moveX - dragOffset.x));
      const newY = Math.max(0, Math.min(100, moveY - dragOffset.y));

      if (dragging === "soldier") {
        setSoldierPos({ x: newX, y: newY });
      } else if (dragging === "enemy") {
        setEnemyPos({ x: newX, y: newY });
      }
    }

    // Handle live squad dragging
    if (draggingSoldier && mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate delta from drag start
      const deltaX = ((mouseX - dragStartMouse.x) / rect.width) * 100;
      const deltaY = ((mouseY - dragStartMouse.y) / rect.height) * 100;

      let newX = dragStartPos.x + deltaX;
      let newY = dragStartPos.y + deltaY;

      // Clamp to bounds
      newX = Math.max(2, Math.min(98, newX));
      newY = Math.max(2, Math.min(98, newY));

      // Check collision - if hitting wall, try to find nearest valid position
      if (isPositionBlocked(newX, newY)) {
        const validPos = findNearestValidPosition(newX, newY, 5);
        newX = validPos.x;
        newY = validPos.y;
      }

      // Update store with new position
      const patchSoldier = useTacticalStore.getState().patchSoldier;
      patchSoldier(draggingSoldier, {
        position: { x: newX, y: newY }
      });
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setDraggingSoldier(null);
  };

  // Handle drag start for live squad markers
  const handleSoldierMouseDown = (e, soldierId) => {
    if (!mapRef.current) return;
    e.stopPropagation();

    const rect = mapRef.current.getBoundingClientRect();
    const soldier = liveSquad.find(s => s?.id === soldierId);
    if (!soldier) return;

    setDraggingSoldier(soldierId);
    setDragStartPos({
      x: soldier?.position?.x ?? 50,
      y: soldier?.position?.y ?? 50
    });
    setDragStartMouse({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // Update telemetry data whenever positions change
  useEffect(() => {
    const newCover = checkWallCollision(soldierPos) ? 0 : 1;
    setInCover(newCover);

    const distance = calculateDistance(soldierPos, enemyPos);
    const newHeartRate = calculateHeartRate(distance);
    setHeartRate(newHeartRate);

    const newStatus = getHeartRateStatus(newHeartRate);
    setSoldierStatus(newStatus);
  }, [soldierPos, enemyPos, checkWallCollision, calculateDistance, calculateHeartRate, getHeartRateStatus]);

  // Output telemetry payload
  useEffect(() => {
    const payload = {
      unit_id: "ALPHA-1",
      coordinates: {
        x: Math.round(soldierPos.x),
        y: Math.round(soldierPos.y),
      },
      heart_rate: heartRate,
      in_cover: inCover,
    };
    
    console.log("TELEMETRY_PAYLOAD:", payload);
  }, [soldierPos, heartRate, inCover]);

  return (
    <div
      ref={mapRef}
      className="relative w-full h-full bg-card rounded border border-border overflow-hidden cursor-grab active:cursor-grabbing"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Satellite/Top-Down Map Background */}
      <img
        src="/satellite.jpg"
        alt="Satellite Tactical Map"
        className="absolute inset-0 w-full h-full object-contain bg-black"
        style={{
          filter: "contrast(1.3) brightness(1.2) saturate(1.1)"
        }}
      />

      {/* Tactical Grid Overlay - Much Lighter */}
      <div className="absolute inset-0 tactical-grid opacity-10" />

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
          HR: {heartRate} BPM | IN COVER: {inCover}
        </div>
      </div>

      {/* Live squad overlay (draggable, with wall collision) */}
      {liveSquad.map((s) => {
        const px = s?.position?.x ?? 50;
        const py = s?.position?.y ?? 50;
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
            className={`absolute z-10 cursor-move select-none ${isDragging ? "z-30" : "z-10"}`}
            style={{
              left: `${px}%`,
              top: `${py}%`,
              transform: "translate(-50%, -50%)",
              transition: isDragging ? "none" : "left 600ms linear, top 600ms linear",
            }}
            onMouseDown={(e) => handleSoldierMouseDown(e, s?.id)}
          >
            <div className="relative flex items-center justify-center">
              <div
                className={`absolute w-8 h-8 rounded-full ${ringColor}/15 animate-ping`}
              />
              <div
                className={`relative w-3 h-3 rounded-full ${ringColor} border border-background ${isDragging ? "scale-125" : ""} transition-transform`}
              />
              <div
                className={`absolute left-full ml-1.5 whitespace-nowrap text-[9px] font-tactical uppercase tracking-wider ${textColor}`}
              >
                {callsign}
              </div>
            </div>
          </div>
        );
      })}

      {/* ALPHA-1 Soldier Marker */}
      <button
        onMouseDown={(e) => handleMouseDown(e, "soldier")}
        onClick={() => onSelectSoldier("ALPHA-1")}
        onMouseEnter={() => setHoveredSoldier("ALPHA-1")}
        onMouseLeave={() => setHoveredSoldier(null)}
        className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-primary z-20 cursor-pointer`}
        style={{
          left: `${soldierPos.x}%`,
          top: `${soldierPos.y}%`,
        }}
      >
        {/* Pulse ring for active unit */}
        <div
          className={`absolute inset-0 w-12 h-12 -m-3 rounded-full ${getStatusColor(soldierStatus).replace("text-", "bg-")}/20 animate-ping`}
        />

        {/* Marker */}
        <div className={`relative w-6 h-6 rounded ${getGlowClass(soldierStatus)}`}>
          {/* Diamond shape */}
          <svg
            viewBox="0 0 24 24"
            className={`w-full h-full ${getStatusColor(soldierStatus)}`}
          >
            <path
              d="M12 2 L22 12 L12 22 L2 12 Z"
              fill="currentColor"
              fillOpacity="0.8"
              stroke="currentColor"
              strokeWidth="1"
            />
            <text
              x="12"
              y="14"
              textAnchor="middle"
              className="fill-background text-[8px] font-bold"
            >
              A
            </text>
          </svg>

          {/* Direction indicator */}
          <div
            className={`absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] ${getStatusColor(soldierStatus).replace("text-", "border-b-")}`}
            style={{
              transform: `translateX(-50%) rotate(45deg)`,
            }}
          />
        </div>

        {/* Label */}
        <div
          className={`absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap ${
            hoveredSoldier === "ALPHA-1" ? "opacity-100" : "opacity-0"
          } transition-opacity`}
        >
          <div className="bg-background/90 border border-border px-2 py-1 rounded text-xs">
            <div className={`font-bold ${getStatusColor(soldierStatus)}`}>
              ALPHA-1
            </div>
            <div className="text-muted-foreground text-[10px]">
              HR: {heartRate} | COVER: {inCover ? "YES" : "NO"}
            </div>
          </div>
        </div>
      </button>

      {/* HOSTILE Enemy Marker */}
      <button
        onMouseDown={(e) => handleMouseDown(e, "enemy")}
        onClick={() => onSelectSoldier("HOSTILE")}
        onMouseEnter={() => setHoveredSoldier("HOSTILE")}
        onMouseLeave={() => setHoveredSoldier(null)}
        className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-destructive z-20 cursor-pointer`}
        style={{
          left: `${enemyPos.x}%`,
          top: `${enemyPos.y}%`,
        }}
      >
        {/* Marker */}
        <div className="relative w-6 h-6 rounded glow-danger">
          {/* Square shape for enemy */}
          <svg
            viewBox="0 0 24 24"
            className="w-full h-full text-destructive"
          >
            <rect
              x="4"
              y="4"
              width="16"
              height="16"
              fill="currentColor"
              fillOpacity="0.8"
              stroke="currentColor"
              strokeWidth="1"
            />
            <text
              x="12"
              y="14"
              textAnchor="middle"
              className="fill-background text-[8px] font-bold"
            >
              H
            </text>
          </svg>

          {/* Pulsing indicator */}
          <div className="absolute inset-0 w-6 h-6 rounded border-2 border-destructive/50 animate-pulse" />
        </div>

        {/* Label */}
        <div
          className={`absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap ${
            hoveredSoldier === "HOSTILE" ? "opacity-100" : "opacity-0"
          } transition-opacity`}
        >
          <div className="bg-background/90 border border-destructive/50 px-2 py-1 rounded text-xs">
            <div className="font-bold text-destructive">HOSTILE</div>
            <div className="text-muted-foreground text-[10px]">
              THREAT: ACTIVE
            </div>
          </div>
        </div>
      </button>

      {/* Connection line between units */}
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
