"use client";

import { useEffect, useCallback, useState } from "react";
import { CommandHeader } from "@/components/command-header";
import { TacticalMap } from "@/components/tactical-map";
import { TelemetryPanel } from "@/components/telemetry-panel";
import { AgentLog } from "@/components/agent-log";
import { SimulationPanel } from "@/components/simulation-panel";
import { useTacticalStore } from "@/lib/store";
import { useMqttIntegration } from "@/hooks/use-mqtt-integration";

export default function CommandCenter() {
  // ── Live MQTT pipeline ──────────────────────────────────────────────
  useMqttIntegration();

  const soldiers = useTacticalStore((s) => s.soldiers);
  const logs = useTacticalStore((s) => s.logs);
  const brokerStatus = useTacticalStore((s) => s.brokerStatus);
  const hasLiveTelemetry = useTacticalStore((s) => s.hasLiveTelemetry);
  const setSoldiers = useTacticalStore((s) => s.setSoldiers);
  const patchSoldier = useTacticalStore((s) => s.patchSoldier);
  const addLog = useTacticalStore((s) => s.addLog);

  const [selectedSoldier, setSelectedSoldier] = useState(null);

  // ── Local-only fluctuation simulator ────────────────────────────────
  // Runs only when no live telemetry is flowing, so the dashboard never
  // looks dead during demos with the broker offline.
  useEffect(() => {
    if (hasLiveTelemetry) return undefined;
    const interval = setInterval(() => {
      setSoldiers((prev) =>
        prev.map((soldier) => {
          if (soldier.status === "offline") return soldier;
          const hrDelta = (Math.random() - 0.5) * 4;
          const newHr = Math.max(
            60,
            Math.min(150, (soldier.heartRate ?? 75) + hrDelta),
          );
          const posXDelta = (Math.random() - 0.5) * 0.3;
          const posYDelta = (Math.random() - 0.5) * 0.3;
          const px = soldier.position?.x ?? 50;
          const py = soldier.position?.y ?? 50;
          return {
            ...soldier,
            heartRate: Math.round(newHr),
            position: {
              x: Math.max(10, Math.min(90, px + posXDelta)),
              y: Math.max(15, Math.min(85, py + posYDelta)),
            },
            heading:
              ((soldier.heading ?? 0) + (Math.random() - 0.5) * 5 + 360) % 360,
          };
        }),
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [hasLiveTelemetry, setSoldiers]);

  // Battery drain (only when no live telemetry — backend owns battery).
  useEffect(() => {
    if (hasLiveTelemetry) return undefined;
    const interval = setInterval(() => {
      setSoldiers((prev) =>
        prev.map((soldier) => {
          if (soldier.status === "offline") return soldier;
          const newBattery = Math.max(0, (soldier.battery ?? 100) - 0.1);
          let newStatus = soldier.status;
          if (newBattery < 20 && soldier.status === "nominal") {
            newStatus = "warning";
          }
          return { ...soldier, battery: newBattery, status: newStatus };
        }),
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [hasLiveTelemetry, setSoldiers]);

  // ── God-mode simulation events (frontend-only feature, kept intact) ─
  const handleSimulationEvent = useCallback(
    (event) => {
      const findTarget = (id) => soldiers.find((s) => s.id === id);
      switch (event.type) {
        case "heartRateSpike": {
          if (!event.targetId) break;
          const target = findTarget(event.targetId);
          patchSoldier(event.targetId, {
            heartRate: Math.min(150, (target?.heartRate ?? 80) + 40),
            status: "critical",
          });
          addLog({
            type: "alert",
            source: "NETRA-MED",
            message: `CRITICAL: ${target?.callsign} experiencing severe tachycardia. Recommend immediate tactical pause.`,
            data: { heartRate: Math.min(150, (target?.heartRate ?? 80) + 40) },
          });
          break;
        }
        case "heartRateDrop": {
          if (!event.targetId) break;
          const target = findTarget(event.targetId);
          patchSoldier(event.targetId, {
            heartRate: Math.max(50, (target?.heartRate ?? 80) - 20),
            status: "warning",
          });
          addLog({
            type: "warning",
            source: "NETRA-MED",
            message: `${target?.callsign} heart rate dropping. Possible fatigue or medical event.`,
          });
          break;
        }
        case "batteryDrain": {
          if (!event.targetId) break;
          const target = findTarget(event.targetId);
          const newBat = Math.max(5, (target?.battery ?? 100) - 30);
          patchSoldier(event.targetId, {
            battery: newBat,
            status: newBat < 20 ? "warning" : target?.status,
          });
          addLog({
            type: "warning",
            source: "NETRA-SYS",
            message: `${target?.callsign} experiencing rapid power drain. Check equipment integrity.`,
          });
          break;
        }
        case "equipmentFailure": {
          if (!event.targetId) break;
          const target = findTarget(event.targetId);
          const equipment = (target?.equipment ?? []).map((eq, i) =>
            i === 0 ? { ...eq, status: "failed" } : eq,
          );
          patchSoldier(event.targetId, { equipment, status: "warning" });
          addLog({
            type: "alert",
            source: "NETRA-SYS",
            message: `Equipment failure detected on ${target?.callsign}. ${target?.equipment?.[0]?.name ?? "Equipment"} offline.`,
          });
          break;
        }
        case "connectionLost": {
          if (!event.targetId) break;
          const target = findTarget(event.targetId);
          patchSoldier(event.targetId, { status: "offline" });
          addLog({
            type: "alert",
            source: "NETRA-COMM",
            message: `CONNECTION LOST: ${target?.callsign} is no longer transmitting. Last known position logged.`,
          });
          break;
        }
        case "connectionRestored": {
          if (!event.targetId) break;
          const target = findTarget(event.targetId);
          patchSoldier(event.targetId, {
            status: "nominal",
            heartRate: 75 + Math.floor(Math.random() * 10),
            battery: 80 + Math.floor(Math.random() * 15),
            equipment: (target?.equipment ?? []).map((eq) => ({
              ...eq,
              status: "active",
            })),
          });
          addLog({
            type: "directive",
            source: "NETRA-COMM",
            message: `Connection restored with ${target?.callsign}. Resuming telemetry stream.`,
          });
          break;
        }
        case "casualty": {
          if (!event.targetId) break;
          const target = findTarget(event.targetId);
          patchSoldier(event.targetId, { heartRate: 45, status: "critical" });
          addLog({
            type: "alert",
            source: "NETRA-MED",
            message: `CASUALTY ALERT: ${target?.callsign} vitals critical. Initiating MEDEVAC protocol.`,
          });
          break;
        }
        case "threatDetected": {
          addLog({
            type: "alert",
            source: "NETRA-INTEL",
            message:
              "CONTACT: Possible hostile movement detected at bearing 045. All units hold position.",
            data: { bearing: "045°", distance: "200m", confidence: "78%" },
          });
          break;
        }
        default:
          break;
      }
    },
    [soldiers, patchSoldier, addLog],
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="scanlines" />

      <CommandHeader />

      <main className="flex-1 p-3 grid grid-cols-12 gap-3 min-h-0">
        <aside className="col-span-3 flex flex-col gap-3 min-h-0">
          <div className="flex-1 min-h-0">
            <TelemetryPanel
              soldiers={soldiers}
              selectedSoldier={selectedSoldier}
              onSelectSoldier={setSelectedSoldier}
            />
          </div>
        </aside>

        <section className="col-span-6 min-h-0">
          <TacticalMap
            soldiers={soldiers}
            selectedSoldier={selectedSoldier}
            onSelectSoldier={setSelectedSoldier}
          />
        </section>

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
          <span
            className={
              brokerStatus === "connected"
                ? "text-success"
                : brokerStatus === "connecting"
                  ? "text-accent"
                  : "text-destructive"
            }
          >
            ■ BROKER: {String(brokerStatus).toUpperCase()}
          </span>
        </div>
      </footer>
    </div>
  );
}
