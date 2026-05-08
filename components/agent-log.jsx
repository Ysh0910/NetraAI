"use client";

import { useEffect, useRef } from "react";

function LogEntryComponent({ entry }) {
  const getTypeConfig = () => {
    switch (entry.type) {
      case "info":
        return {
          icon: "ℹ",
          color: "text-primary",
          bgColor: "bg-primary/10",
          borderColor: "border-primary/30",
        };
      case "warning":
        return {
          icon: "⚠",
          color: "text-accent",
          bgColor: "bg-accent/10",
          borderColor: "border-accent/30",
        };
      case "alert":
        return {
          icon: "!",
          color: "text-destructive",
          bgColor: "bg-destructive/10",
          borderColor: "border-destructive/30",
        };
      case "directive":
        return {
          icon: "→",
          color: "text-success",
          bgColor: "bg-success/10",
          borderColor: "border-success/30",
        };
      case "analysis":
        return {
          icon: "◈",
          color: "text-chart-5",
          bgColor: "bg-chart-5/10",
          borderColor: "border-chart-5/30",
        };
    }
  };
  const config = getTypeConfig();
  return (
    <div
      className={`p-2 rounded border ${config.borderColor} ${config.bgColor} transition-all hover:bg-opacity-20`}
    >
      <div className="flex items-start gap-2">
        <span className={`${config.color} text-sm font-bold flex-shrink-0`}>
          {config.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span
              className={`text-[10px] uppercase tracking-wider ${config.color}`}
            >
              {entry.source}
            </span>
            <span className="text-[10px] text-muted-foreground font-tactical">
              {entry.timestamp}
            </span>
          </div>
          <p className="text-xs text-foreground leading-relaxed">
            {entry.message}
          </p>
          {entry.data && (
            <div className="mt-1.5 p-1.5 bg-background/50 rounded text-[10px] font-tactical text-muted-foreground">
              {Object.entries(entry.data).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-primary/70">{key}:</span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AgentLog({ logs }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="h-full bg-card border border-border rounded overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg
              className="w-4 h-4 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4l2 2" />
            </svg>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success rounded-full animate-pulse" />
          </div>
          <span className="text-xs uppercase tracking-wider text-foreground">
            NETRA AI Agent
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] text-success uppercase">Online</span>
        </div>
      </div>

      {/* Log Stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-2">
        {Array.isArray(logs) && logs.length > 0 ? (
          logs.map((entry) => (
            <LogEntryComponent
              key={entry?.id ?? Math.random()}
              entry={{
                type: entry?.type ?? "info",
                source: entry?.source ?? "NETRA",
                message: entry?.message ?? "",
                timestamp: entry?.timestamp ?? "--:--:--",
                data: entry?.data,
              }}
            />
          ))
        ) : (
          <div className="p-3 text-[11px] text-muted-foreground uppercase tracking-wider text-center animate-pulse">
            SYSTEM INITIALIZED... LISTENING FOR TELEMETRY
          </div>
        )}
      </div>

      {/* Input Area (Command Prompt Style) */}
      <div className="px-3 py-2 border-t border-border bg-muted/30">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-primary">NETRA&gt;</span>
          <span className="text-muted-foreground animate-pulse">
            Monitoring tactical situation...
          </span>
        </div>
      </div>
    </div>
  );
}
