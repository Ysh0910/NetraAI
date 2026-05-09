"use client";

import { useTacticalStore } from "@/lib/store";
import { Volume2, Play, Clock } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function AIResponsePlayer() {
  const lastAiAudio = useTacticalStore((s) => s.lastAiAudio);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [lastUrl, setLastUrl] = useState(null);
  const audioRef = useRef(null);

  // Log when lastAiAudio changes
  useEffect(() => {
    console.log('[AI-PLAYER] lastAiAudio changed:', lastAiAudio);
  }, [lastAiAudio]);

  // Reset played state when new audio arrives
  useEffect(() => {
    console.log('[AI-PLAYER] Checking url change:', lastAiAudio?.url, 'vs', lastUrl);
    if (lastAiAudio?.url && lastAiAudio.url !== lastUrl) {
      console.log('[AI-PLAYER] NEW URL - resetting state');
      setHasPlayed(false);
      setLastUrl(lastAiAudio.url);
      // Load the new audio
      if (audioRef.current) {
        audioRef.current.src = lastAiAudio.url;
        audioRef.current.load();
        console.log('[AI-PLAYER] Audio src set to:', lastAiAudio.url);
      }
    }
  }, [lastAiAudio, lastUrl]);

  // Auto-play when new audio arrives (first time only)
  useEffect(() => {
    if (lastAiAudio?.url && audioRef.current && !hasPlayed && lastAiAudio.url === lastUrl) {
      audioRef.current.play().catch(() => {
        // Auto-play blocked, user can click play
      });
    }
  }, [lastAiAudio, hasPlayed, lastUrl]);

  if (!lastAiAudio) {
    return (
      <div className="bg-muted/50 border border-muted rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
          <Volume2 className="w-4 h-4" />
          <span>AI VOICE RESPONSE</span>
          <span className="ml-auto text-[10px]">Waiting...</span>
        </div>
        <p className="text-sm text-muted-foreground">No AI response yet</p>
        <button
          disabled
          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-muted text-muted-foreground rounded disabled:opacity-50 cursor-not-allowed"
        >
          <Play className="w-3 h-3" />
          Waiting for response...
        </button>
      </div>
    );
  }

  const timeAgo = Math.floor((Date.now() - lastAiAudio.timestamp) / 1000);
  const timeDisplay = timeAgo < 60 ? `${timeAgo}s ago` : `${Math.floor(timeAgo / 60)}m ago`;
  const isNew = !hasPlayed;

  const handlePlay = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => {
        setHasPlayed(true);
      }).catch(() => {
        // Play failed
      });
    }
  };

  return (
    <div className={`border rounded-lg p-3 space-y-2 animate-in fade-in slide-in-from-top-2 ${isNew ? 'bg-primary/20 border-primary/50 ring-1 ring-primary/30' : 'bg-primary/10 border-primary/30'}`}>
      <div className="flex items-center gap-2 text-xs text-primary font-medium">
        <Volume2 className="w-4 h-4" />
        <span>AI VOICE RESPONSE {isNew && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">NEW</span>}</span>
        <span className="text-muted-foreground ml-auto flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeDisplay}
        </span>
      </div>

      <p className="text-sm line-clamp-2">&ldquo;{lastAiAudio.text}&rdquo;</p>

      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onEnded={() => {
          setIsPlaying(false);
          setHasPlayed(true);
        }}
        onPause={() => setIsPlaying(false)}
        className="hidden"
      />

      <div className="flex items-center gap-2">
        <button
          onClick={handlePlay}
          disabled={isPlaying}
          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Play className="w-3 h-3" />
          {isPlaying ? "Playing..." : hasPlayed ? "Play Again" : "▶ Play Response"}
        </button>

        <span className="text-[10px] text-muted-foreground truncate flex-1">
          {lastAiAudio.filename}
        </span>
      </div>
    </div>
  );
}
