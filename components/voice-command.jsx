"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, Square, Send, Volume2, Loader2, Play } from "lucide-react";
import { useTacticalStore } from "@/lib/store";

export function VoiceCommandPanel({ soldiers, selectedUnit, onUnitChange }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const [status, setStatus] = useState("");
  
  // Get last AI response from store
  const lastAiAudio = useTacticalStore((s) => s.lastAiAudio);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlayerRef = useRef(null);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob);
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setStatus("Recording...");
      setTranscript("");
      setAudioUrl(null);
    } catch (err) {
      console.error("Failed to start recording:", err);
      setStatus("Error: Microphone access denied");
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatus("Processing...");
    }
  }, []);

  // Process recorded audio: STT → Send to simulation
  const processAudio = async (audioBlob) => {
    setIsProcessing(true);
    
    try {
      // Step 1: Send to STT service
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      
      const sttResponse = await fetch("/api/stt", {
        method: "POST",
        body: formData,
      });
      
      if (!sttResponse.ok) {
        throw new Error("STT failed");
      }
      
      const sttResult = await sttResponse.json();
      const text = sttResult.text;
      
      setTranscript(text);
      
      if (!text || text.trim().length === 0) {
        setStatus("No speech detected");
        setIsProcessing(false);
        return;
      }
      
      // Step 2: Send voice command to simulation server
      const unit = selectedUnit || (soldiers[0]?.callsign || "ALPHA-1");
      
      const voiceResponse = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit,
          message: text,
        }),
      });
      
      if (!voiceResponse.ok) {
        throw new Error("Failed to send voice command");
      }
      
      setStatus(`Sent to ${unit}: "${text}"`);
      
    } catch (err) {
      console.error("Processing error:", err);
      setStatus(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Play TTS audio
  const playResponse = async (text) => {
    try {
      setStatus("Generating speech...");
      
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) {
        throw new Error("TTS failed");
      }
      
      const result = await response.json();
      
      if (result.audioUrl) {
        setAudioUrl(result.audioUrl);
        
        // Auto-play
        if (audioPlayerRef.current) {
          audioPlayerRef.current.src = result.audioUrl;
          audioPlayerRef.current.play();
        }
      }
      
      setStatus("Playing audio response");
    } catch (err) {
      console.error("TTS error:", err);
      setStatus(`TTS Error: ${err.message}`);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider">Voice Command</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Unit:</span>
          <select
            value={selectedUnit}
            onChange={(e) => onUnitChange(e.target.value)}
            className="text-xs bg-background border border-border rounded px-2 py-1"
          >
            {soldiers.map((s) => (
              <option key={s.id} value={s.callsign}>
                {s.callsign}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Record Button */}
      <div className="flex justify-center">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
            isRecording
              ? "bg-destructive animate-pulse"
              : "bg-primary hover:bg-primary/90"
          } disabled:opacity-50`}
        >
          {isRecording ? (
            <Square className="w-6 h-6 text-primary-foreground" />
          ) : (
            <Mic className="w-6 h-6 text-primary-foreground" />
          )}
        </button>
      </div>

      {/* Status */}
      {status && (
        <div className="text-xs text-center text-muted-foreground">
          {isProcessing && <Loader2 className="inline w-3 h-3 mr-1 animate-spin" />}
          {status}
        </div>
      )}

      {/* Transcript */}
      {transcript && (
        <div className="bg-muted rounded p-3 space-y-2">
          <div className="text-xs text-muted-foreground uppercase">Transcript</div>
          <div className="text-sm">&ldquo;{transcript}&rdquo;</div>
        </div>
      )}

      {/* Hidden Audio Player */}
      <audio ref={audioPlayerRef} className="hidden" />

      {/* Play Last AI Response */}
      <div className="pt-2 border-t border-border">
        <button
          onClick={() => {
            if (lastAiAudio?.url && audioPlayerRef.current) {
              audioPlayerRef.current.src = lastAiAudio.url;
              audioPlayerRef.current.play();
              setStatus(`Playing: ${lastAiAudio.text?.substring(0, 30)}...`);
            } else {
              setStatus("No AI response yet");
            }
          }}
          disabled={!lastAiAudio}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs bg-secondary hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
        >
          <Play className="w-4 h-4" />
          {lastAiAudio ? "Play AI Response" : "No AI Response Yet"}
        </button>
        {lastAiAudio && (
          <p className="text-[10px] text-muted-foreground mt-1 truncate">
            {lastAiAudio.text?.substring(0, 50)}...
          </p>
        )}
      </div>
    </div>
  );
}
