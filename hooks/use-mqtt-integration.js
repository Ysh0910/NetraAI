"use client";

import { useEffect } from "react";
import mqtt from "mqtt";
import { useTacticalStore } from "@/lib/store";

/**
 * Live-tactical-data hook.
 *
 * Connects to the Netra broker over WebSockets, subscribes to the
 * simulation telemetry topic, and forwards every well-formed payload
 * into the Zustand store. Every error path is swallowed so the UI is
 * never taken down by a malformed message or a disconnected broker.
 */
export function useMqttIntegration({
  url = "ws://localhost:8080",
  topics = ["tactical/squad/telemetry", "tactical/prototype", "tactical/system/status", "tactical/pi/telemetry"],
} = {}) {
  const setBrokerStatus = useTacticalStore((s) => s.setBrokerStatus);
  const updateTacticalData = useTacticalStore((s) => s.updateTacticalData);
  const addLog = useTacticalStore((s) => s.addLog);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let client;
    setBrokerStatus("connecting");

    try {
      client = mqtt.connect(url, {
        clientId: `netra-frontend-${Math.random().toString(16).slice(2, 10)}`,
        reconnectPeriod: 3000,
        connectTimeout: 10000,
        clean: true,
      });
    } catch (err) {
      console.warn("[NETRA-MQTT] Failed to construct client:", err?.message);
      setBrokerStatus("error");
      return undefined;
    }

    client.on("connect", () => {
      console.log("[NETRA-MQTT] connected to", url);
      setBrokerStatus("connected");
      addLog({
        type: "directive",
        source: "NETRA-COMM",
        message: `Broker link established at ${url}`,
      });
      for (const topic of topics) {
        client.subscribe(topic, { qos: 0 }, (err) => {
          if (err) {
            console.warn(`[NETRA-MQTT] subscribe ${topic} failed:`, err.message);
          } else {
            console.log(`[NETRA-MQTT] subscribed to ${topic}`);
          }
        });
      }
    });

    client.on("reconnect", () => {
      setBrokerStatus("connecting");
    });

    client.on("offline", () => {
      setBrokerStatus("disconnected");
    });

    client.on("close", () => {
      setBrokerStatus("disconnected");
    });

    client.on("error", (err) => {
      console.warn("[NETRA-MQTT] error:", err?.message);
      setBrokerStatus("error");
    });

    client.on("message", (topic, payload) => {
      let raw = "";
      try {
        raw = payload?.toString("utf8") ?? "";
      } catch (err) {
        console.warn("[NETRA-MQTT] payload buffer decode failed:", err?.message);
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        console.warn(
          `[NETRA-MQTT] malformed JSON on "${topic}":`,
          err?.message,
          "| raw:",
          raw,
        );
        return;
      }

      try {
        if (topic === "tactical/system/status") {
          addLog({
            type: parsed?.status === "ONLINE" ? "directive" : "warning",
            source: parsed?.source || "NETRA-SYS",
            message: `Status: ${parsed?.status ?? "UNKNOWN"}`,
          });
          return;
        }
        updateTacticalData(parsed);
      } catch (err) {
        console.warn("[NETRA-MQTT] store update failed:", err?.message);
      }
    });

    return () => {
      try {
        client?.end(true);
      } catch (err) {
        // ignore
      }
      setBrokerStatus("disconnected");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
}
