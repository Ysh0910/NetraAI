"use client";

import { useTacticalStore } from "@/lib/store";
import { Volume2, Play, Clock } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function AIResponsePlayer() {
  const lastAiAudio = useTacticalStore((s) => s.lastAiAudio);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  // Auto-play when new audio arrives
  useEffect(() => {
    if (lastAiAudio?.url && audioRef.current) {
      audioRef.current.src = lastAiAudio.url;
      audioRef.current.play().catch(() => {
        // Auto-play blocked, user can click play
      });
    }
  }, [lastAiAudio]);

  if (!lastAiAudio) return null;

  const timeAgo = Math.floor((Date.now() - lastAiAudio.timestamp) / 1000);
  const timeDisplay = timeAgo < 60 ? `${timeAgo}s ago` : `${Math.floor(timeAgo / 60)}m ago`;

  return (
    <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 space-y-2 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2 text-xs text-primary font-medium">
        <Volume2 className="w-4 h-4" />
        <span>AI VOICE RESPONSE</span>
        <span className="text-muted-foreground ml-auto flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeDisplay}
        </span>
      </div>

      <p className="text-sm line-clamp-2">&ldquo;{lastAiAudio.text}&rdquo;</p>

      <audio
        ref={audioRef}
        src={lastAiAudio.url}
        onPlay={() => setIsPlaying(true)}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        className="hidden"
      />

      <div className="flex items-center gap-2">
        <button
          onClick={() => audioRef.current?.play()}
          disabled={isPlaying}
          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Play className="w-3 h-3" />
          {isPlaying ? "Playing..." : "Play Again"}
        </button>

        <span className="text-[10px] text-muted-foreground truncate flex-1">
          {lastAiAudio.filename}
        </span>
      </div>
    </div>
  );
}
