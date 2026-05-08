"use client";

import { useEffect, useState } from "react";

export function CommandHeader() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
      setDate(
        now
          .toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
          })
          .toUpperCase(),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 bg-card border-b border-border px-4 flex items-center justify-between">
      {/* Left - Logo & Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {/* NETRA Logo */}
          <div className="w-8 h-8 rounded border border-primary bg-primary/10 flex items-center justify-center glow-primary">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary">
              <circle cx="12" cy="12" r="3" fill="currentColor" />
              <circle
                cx="12"
                cy="12"
                r="8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <line
                x1="12"
                y1="2"
                x2="12"
                y2="6"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <line
                x1="12"
                y1="18"
                x2="12"
                y2="22"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <line
                x1="2"
                y1="12"
                x2="6"
                y2="12"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <line
                x1="18"
                y1="12"
                x2="22"
                y2="12"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-primary text-glow-primary tracking-wider">
              NETRA
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Tactical Command Center
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-border" />

        {/* Mission Info */}
        <div className="flex items-center gap-4">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">
              Mission
            </div>
            <div className="text-xs text-foreground font-tactical">
              OPERATION SILENT THUNDER
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">
              Classification
            </div>
            <div className="text-xs text-accent font-tactical">CLASSIFIED</div>
          </div>
        </div>
      </div>

      {/* Center - System Status */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] text-muted-foreground uppercase">
            SYS NOMINAL
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success" />
          <span className="text-[10px] text-muted-foreground uppercase">
            SAT LINK ACTIVE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-[10px] text-muted-foreground uppercase">
            MESH PARTIAL
          </span>
        </div>
      </div>

      {/* Right - Time & User */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-lg font-bold text-primary font-tactical text-glow-primary">
            {time}
          </div>
          <div className="text-[10px] text-muted-foreground">{date} UTC</div>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded border border-border bg-muted flex items-center justify-center">
            <svg
              className="w-4 h-4 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
            </svg>
          </div>
          <div>
            <div className="text-xs text-foreground">CMD. WILLIAMS</div>
            <div className="text-[10px] text-muted-foreground">
              AUTH LEVEL: ALPHA
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
