"use client";

import { useEffect, useRef } from "react";
import mqtt from "mqtt";
import { useTacticalStore } from "@/lib/store";

// Default topics defined outside the component so the array reference is
// stable and never triggers an unnecessary useEffect re-run.
const DEFAULT_TOPICS = [
  "tactical/squad/telemetry",   // simulation server
  "tactical/prototype",         // simulation server
  "tactical/system/status",     // simulation server + pi alerts
  "battlefield/sensor",         // pi telemetry
  "battlefield/ai-response",    // pi AI decisions
];

/**
 * Live-tactical-data hook.
 *
 * Connects to the Netra broker over WebSockets, subscribes to the
 * simulation telemetry topic, and forwards every well-formed payload
 * into the Zustand store. Every error path is swallowed so the UI is
 * never taken down by a malformed message or a disconnected broker.
 */
export function useMqttIntegration({
  url = "ws://localhost:8080/mqtt",
  topics = DEFAULT_TOPICS,
} = {}) {
  const setBrokerStatus = useTacticalStore((s) => s.setBrokerStatus);
  const updateTacticalData = useTacticalStore((s) => s.updateTacticalData);
  const addLog = useTacticalStore((s) => s.addLog);
  const setLastAiAudio = useTacticalStore((s) => s.setLastAiAudio);

  // Keep stable refs so the effect doesn't re-run
  const topicsRef = useRef(topics);
  topicsRef.current = topics;
  
  // Use ref for setLastAiAudio to prevent effect re-runs
  const setLastAiAudioRef = useRef(setLastAiAudio);
  setLastAiAudioRef.current = setLastAiAudio;
  
  // Track last processed timestamp in ref (persists across re-renders)
  const lastProcessedTimestampRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let client;
    setBrokerStatus("connecting");

    try {
      // mqtt.js v5 — do NOT pass `protocol` when the URL already carries
      // the scheme (ws:// / wss://). Doing so causes a silent conflict that
      // prevents the WebSocket handshake from completing in the browser.
      client = mqtt.connect(url, {
        protocolVersion: 4,
        clientId: `nf_${Math.floor(Math.random() * 1000000).toString(16).padStart(6, '0')}`,
        reconnectPeriod: 3000,
        connectTimeout: 10000,
        clean: true,
        keepalive: 30,
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
      // Subscribe immediately — no setTimeout. A delay causes subscriptions
      // to fire after React StrictMode's cleanup has already called client.end(),
      // resulting in "client disconnecting" errors on every mount in dev.
      for (const topic of topicsRef.current) {
        client.subscribe(topic, { qos: 0 }, (err) => {
          if (err) {
            console.warn(`[NETRA-MQTT] subscribe ${topic} failed:`, err.message);
          } else {
            console.log(`[NETRA-MQTT] subscribed to ${topic}`);
          }
        });
      }
    });

    // Flag to distinguish intentional cleanup from unexpected disconnects
    let destroyed = false;

    client.on("reconnect", () => {
      if (!destroyed) setBrokerStatus("connecting");
    });

    client.on("offline", () => {
      if (!destroyed) setBrokerStatus("disconnected");
    });

    client.on("close", () => {
      if (!destroyed) setBrokerStatus("disconnected");
    });

    client.on("error", (err) => {
      console.warn("[NETRA-MQTT] error:", err?.message);
      if (!destroyed) setBrokerStatus("error");
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

        // Pi AI decision — log it, don't push into the telemetry store
        if (topic === "battlefield/ai-response") {
          addLog({
            type: "directive",
            source: "NETRA-AI",
            message: parsed?.decision ?? "AI decision received",
            data: { risk_score: parsed?.risk_score, latency_ms: parsed?.latency_ms },
          });
          return;
        }

        // battlefield/sensor and all tactical/* telemetry topics
        updateTacticalData(parsed);
      } catch (err) {
        console.warn("[NETRA-MQTT] store update failed:", err?.message);
      }
    });

    // Expose publish function globally for components to use
    window.__netraMqttPublish = (topic, payload) => {
      if (!client || !client.connected) {
        console.warn("[NETRA-MQTT] Cannot publish - not connected");
        return false;
      }
      const message = typeof payload === "string" ? payload : JSON.stringify(payload);
      client.publish(topic, message, { qos: 0 });
      console.log(`[NETRA-MQTT] published to ${topic}:`, message);
      return true;
    };

    // Poll for AI responses from netra-comms via HTTP
    const pollForAiResponse = async () => {
      try {
        const res = await fetch('/api/ai-response', { cache: 'no-store' });
        console.log('[NETRA-AUDIO] Poll status:', res.status);
        if (res.ok) {
          const data = await res.json();
          console.log('[NETRA-AUDIO] Poll data:', data);
          if (data.success && data.response) {
            const response = data.response;
            const responseTime = response.timestamp || response.receivedAt || 0;
            console.log('[NETRA-AUDIO] Checking response time:', responseTime, 'vs last:', lastProcessedTimestampRef.current);
            
            // Only process if it's a new response
            if (responseTime > lastProcessedTimestampRef.current) {
              lastProcessedTimestampRef.current = responseTime;
              console.log('[NETRA-AUDIO] NEW RESPONSE - updating store');
              setLastAiAudioRef.current({
                audioUrl: response.audioUrl,
                decision: response.decision,
                timestamp: responseTime,
              });
            } else {
              console.log('[NETRA-AUDIO] Same/old response, skipping');
            }
          } else {
            console.log('[NETRA-AUDIO] No response in data');
          }
        } else if (res.status === 404) {
          console.log('[NETRA-AUDIO] No response stored yet (404)');
        }
      } catch (err) {
        console.log('[NETRA-AUDIO] Poll error:', err?.message);
      }
    };

    // Poll every 2 seconds
    const pollInterval = setInterval(pollForAiResponse, 2000);
    pollForAiResponse();

    return () => {
      destroyed = true;
      clearInterval(pollInterval);
      if (client) {
        console.log("[NETRA-MQTT] disconnecting...");
        client.end(false);
      }
      window.__netraMqttPublish = null;
    };
  }, [url, setBrokerStatus, updateTacticalData, addLog]);
}

/**
 * Helper to publish MQTT messages from any component.
 * Returns true if published, false if not connected.
 */
export function publishMessage(topic, payload) {
  if (typeof window === "undefined" || !window.__netraMqttPublish) {
    console.warn("[NETRA-MQTT] Publish not available - hook not mounted");
    return false;
  }
  return window.__netraMqttPublish(topic, payload);
}
