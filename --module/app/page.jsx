"use client";

import { useState, useEffect, useCallback } from "react";
import { CommandHeader } from "@/components/command-header";
import { TacticalMap } from "@/components/tactical-map";
import { TelemetryPanel } from "@/components/telemetry-panel";
import { AgentLog } from "@/components/agent-log";
import { SimulationPanel } from "@/components/simulation-panel";

const initialSoldiers = [
  {
    id: "alpha",
    callsign: "ALPHA-1",
    status: "nominal",
    heartRate: 78,
    battery: 92,
    position: { x: 25, y: 35 },
    heading: 45,
    equipment: [
      { name: "NVG", status: "active" },
      { name: "COMM", status: "active" },
    ],
  },
  {
    id: "bravo",
    callsign: "BRAVO-2",
    status: "nominal",
    heartRate: 82,
    battery: 87,
    position: { x: 45, y: 55 },
    heading: 120,
    equipment: [
      { name: "NVG", status: "active" },
      { name: "COMM", status: "active" },
    ],
  },
  {
    id: "charlie",
    callsign: "CHARLIE-3",
    status: "warning",
    heartRate: 105,
    battery: 45,
    position: { x: 65, y: 40 },
    heading: 270,
    equipment: [
      { name: "NVG", status: "active" },
      { name: "COMM", status: "standby" },
    ],
  },
  {
    id: "delta",
    callsign: "DELTA-4",
    status: "nominal",
    heartRate: 72,
    battery: 95,
    position: { x: 55, y: 70 },
    heading: 180,
    equipment: [
      { name: "NVG", status: "standby" },
      { name: "COMM", status: "active" },
    ],
  },
];

const initialLogs = [
  {
    id: "1",
    type: "info",
    source: "NETRA-CORE",
    message: "Tactical Command Center initialized. All systems nominal.",
    timestamp: "14:32:01",
  },
  {
    id: "2",
    type: "directive",
    source: "NETRA-TAC",
    message: "Squad deployment confirmed. Establishing mesh network topology.",
    timestamp: "14:32:15",
    data: { nodes: 4, latency: "12ms" },
  },
  {
    id: "3",
    type: "analysis",
    source: "NETRA-INTEL",
    message:
      "Terrain analysis complete. Identified 2 structures and 1 hazard zone in operational area.",
    timestamp: "14:32:28",
  },
  {
    id: "4",
    type: "warning",
    source: "NETRA-MED",
    message:
      "CHARLIE-3 elevated heart rate detected. Monitoring physiological stress indicators.",
    timestamp: "14:33:45",
    data: { heartRate: 105, threshold: 100 },
  },
  {
    id: "5",
    type: "info",
    source: "NETRA-COMM",
    message:
      "Satellite uplink established. Encrypted channel active on frequency ZULU-7.",
    timestamp: "14:34:02",
  },
];

export default function CommandCenter() {
  const [soldiers, setSoldiers] = useState(initialSoldiers);
  const [logs, setLogs] = useState(initialLogs);
  const [selectedSoldier, setSelectedSoldier] = useState(null);

  // Add a new log entry
  const addLog = useCallback((entry) => {
    const newEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };
    setLogs((prev) => [...prev, newEntry]);
  }, []);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSoldiers((prev) =>
        prev.map((soldier) => {
          if (soldier.status === "offline") return soldier;
          // Small random fluctuations
          const hrDelta = (Math.random() - 0.5) * 4;
          const newHr = Math.max(
            60,
            Math.min(150, soldier.heartRate + hrDelta),
          );
          // Small position movements
          const posXDelta = (Math.random() - 0.5) * 0.3;
          const posYDelta = (Math.random() - 0.5) * 0.3;
          return {
            ...soldier,
            heartRate: Math.round(newHr),
            position: {
              x: Math.max(10, Math.min(90, soldier.position.x + posXDelta)),
              y: Math.max(15, Math.min(85, soldier.position.y + posYDelta)),
            },
            heading: (soldier.heading + (Math.random() - 0.5) * 5 + 360) % 360,
          };
        }),
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Battery drain simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setSoldiers((prev) =>
        prev.map((soldier) => {
          if (soldier.status === "offline") return soldier;
          const newBattery = Math.max(0, soldier.battery - 0.1);
          // Update status based on battery
          let newStatus = soldier.status;
          if (newBattery < 20 && soldier.status === "nominal") {
            newStatus = "warning";
          }
          return {
            ...soldier,
            battery: newBattery,
            status: newStatus,
          };
        }),
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle simulation events
  const handleSimulationEvent = useCallback(
    (event) => {
      switch (event.type) {
        case "heartRateSpike":
          if (event.targetId) {
            setSoldiers((prev) =>
              prev.map((s) =>
                s.id === event.targetId
                  ? {
                      ...s,
                      heartRate: Math.min(150, s.heartRate + 40),
                      status: "critical",
                    }
                  : s,
              ),
            );
            const target = soldiers.find((s) => s.id === event.targetId);
            addLog({
              type: "alert",
              source: "NETRA-MED",
              message: `CRITICAL: ${target?.callsign} experiencing severe tachycardia. Recommend immediate tactical pause.`,
              data: {
                heartRate: Math.min(150, (target?.heartRate || 80) + 40),
              },
            });
          }
          break;
        case "heartRateDrop":
          if (event.targetId) {
            setSoldiers((prev) =>
              prev.map((s) =>
                s.id === event.targetId
                  ? {
                      ...s,
                      heartRate: Math.max(50, s.heartRate - 20),
                      status: "warning",
                    }
                  : s,
              ),
            );
            const target = soldiers.find((s) => s.id === event.targetId);
            addLog({
              type: "warning",
              source: "NETRA-MED",
              message: `${target?.callsign} heart rate dropping. Possible fatigue or medical event.`,
            });
          }
          break;
        case "batteryDrain":
          if (event.targetId) {
            setSoldiers((prev) =>
              prev.map((s) =>
                s.id === event.targetId
                  ? {
                      ...s,
                      battery: Math.max(5, s.battery - 30),
                      status: s.battery - 30 < 20 ? "warning" : s.status,
                    }
                  : s,
              ),
            );
            const target = soldiers.find((s) => s.id === event.targetId);
            addLog({
              type: "warning",
              source: "NETRA-SYS",
              message: `${target?.callsign} experiencing rapid power drain. Check equipment integrity.`,
            });
          }
          break;
        case "equipmentFailure":
          if (event.targetId) {
            setSoldiers((prev) =>
              prev.map((s) =>
                s.id === event.targetId
                  ? {
                      ...s,
                      equipment: s.equipment.map((eq, i) =>
                        i === 0 ? { ...eq, status: "failed" } : eq,
                      ),
                      status: "warning",
                    }
                  : s,
              ),
            );
            const target = soldiers.find((s) => s.id === event.targetId);
            addLog({
              type: "alert",
              source: "NETRA-SYS",
              message: `Equipment failure detected on ${target?.callsign}. ${target?.equipment[0].name} offline.`,
            });
          }
          break;
        case "connectionLost":
          if (event.targetId) {
            setSoldiers((prev) =>
              prev.map((s) =>
                s.id === event.targetId ? { ...s, status: "offline" } : s,
              ),
            );
            const target = soldiers.find((s) => s.id === event.targetId);
            addLog({
              type: "alert",
              source: "NETRA-COMM",
              message: `CONNECTION LOST: ${target?.callsign} is no longer transmitting. Last known position logged.`,
            });
          }
          break;
        case "connectionRestored":
          if (event.targetId) {
            setSoldiers((prev) =>
              prev.map((s) =>
                s.id === event.targetId
                  ? {
                      ...s,
                      status: "nominal",
                      heartRate: 75 + Math.floor(Math.random() * 10),
                      battery: 80 + Math.floor(Math.random() * 15),
                      equipment: s.equipment.map((eq) => ({
                        ...eq,
                        status: "active",
                      })),
                    }
                  : s,
              ),
            );
            const target = soldiers.find((s) => s.id === event.targetId);
            addLog({
              type: "directive",
              source: "NETRA-COMM",
              message: `Connection restored with ${target?.callsign}. Resuming telemetry stream.`,
            });
          }
          break;
        case "casualty":
          if (event.targetId) {
            setSoldiers((prev) =>
              prev.map((s) =>
                s.id === event.targetId
                  ? { ...s, heartRate: 45, status: "critical" }
                  : s,
              ),
            );
            const target = soldiers.find((s) => s.id === event.targetId);
            addLog({
              type: "alert",
              source: "NETRA-MED",
              message: `CASUALTY ALERT: ${target?.callsign} vitals critical. Initiating MEDEVAC protocol.`,
            });
          }
          break;
        case "threatDetected":
          addLog({
            type: "alert",
            source: "NETRA-INTEL",
            message:
              "CONTACT: Possible hostile movement detected at bearing 045. All units hold position.",
            data: { bearing: "045°", distance: "200m", confidence: "78%" },
          });
          break;
      }
    },
    [soldiers, addLog],
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Scanline Overlay */}
      <div className="scanlines" />

      {/* Header */}
      <CommandHeader />

      {/* Main Content */}
      <main className="flex-1 p-3 grid grid-cols-12 gap-3 min-h-0">
        {/* Left Panel - Telemetry */}
        <aside className="col-span-3 flex flex-col gap-3 min-h-0">
          <div className="flex-1 min-h-0">
            <TelemetryPanel
              soldiers={soldiers}
              selectedSoldier={selectedSoldier}
              onSelectSoldier={setSelectedSoldier}
            />
          </div>
        </aside>

        {/* Center - Tactical Map */}
        <section className="col-span-6 min-h-0">
          <TacticalMap
            soldiers={soldiers}
            selectedSoldier={selectedSoldier}
            onSelectSoldier={setSelectedSoldier}
          />
        </section>

        {/* Right Panel - Agent Log & Simulation */}
        <aside className="col-span-3 flex flex-col gap-3 min-h-0">
          <div className="flex-1 min-h-0">
            <AgentLog logs={logs} />
          </div>
          <SimulationPanel
            soldiers={soldiers}
            onTriggerEvent={handleSimulationEvent}
          />
        </aside>
      </main>

      {/* Status Bar */}
      <footer className="h-6 bg-card border-t border-border px-4 flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>NETRA v2.4.1</span>
          <span>|</span>
          <span>ENCRYPTION: AES-256-GCM</span>
          <span>|</span>
          <span>PROTOCOL: MILSPEC-7</span>
        </div>
        <div className="flex items-center gap-4">
          <span>LAT: 38.9072° N</span>
          <span>LON: 77.0369° W</span>
          <span>|</span>
          <span className="text-success">■ SECURE CONNECTION</span>
        </div>
      </footer>
    </div>
  );
}
