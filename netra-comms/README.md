# N.E.T.R.A. Comms Microservice

FastAPI-based voice communication service for N.E.T.R.A. project.

## Features

- **Speech-to-Text (STT)**: Converts audio to text using Vosk
- **Text-to-Speech (TTS)**: Converts text to speech using Piper
- **CORS Enabled**: Frontend dashboard (localhost:3000) can call directly
- **Auto-cleanup**: Temporary files are cleaned up after processing

## Prerequisites

1. **Python 3.8+**
2. **FFmpeg** (must be in system PATH)
   ```powershell
   # Windows: Download from https://ffmpeg.org/download.html
   # Add to PATH or set FFMPEG_PATH environment variable
   ```
3. **Piper executable** in PATH
   ```powershell
   # Download from https://github.com/rhasspy/piper/releases
   # Add to PATH or set PIPER_EXECUTABLE environment variable
   ```

## Setup

1. **Install dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```

2. **Download models:**

   ### Vosk Model
   - Download from: https://alphacephei.com/vosk/models
   - Recommended: `vosk-model-small-en-us-0.15` (small, fast)
   - Extract to: `netra-comms/models/vosk/`
   - Folder should contain: `am/final.mdl`, `conf/model.conf`, etc.

   ### Piper Model
   - Download from: https://huggingface.co/rhasspy/piper-voices/tree/main
   - Recommended: `en_US-lessac-medium` (good quality, small size)
   - Place `.onnx` file in: `netra-comms/models/piper/`

3. **Verify setup:**
   ```powershell
   python main.py
   ```

   Check console output:
   ```
   [COMMS] Vosk model found: 1 file(s)
   [COMMS] Piper model found: en_US-lessac-medium.onnx
   [COMMS] Some models missing... (if not found)
   ```

## Running

```powershell
cd netra-comms
python main.py
```

Server starts on **http://localhost:3002**

## API Endpoints

### Health Check
```bash
GET http://localhost:3002/health
```
Response:
```json
{
  "status": "ok",
  "vosk_ready": true,
  "piper_ready": true
}
```

### Speech-to-Text (STT)
```bash
POST http://localhost:3002/stt
Content-Type: multipart/form-data

file: <audio_file.webm>
```

Response:
```json
{
  "text": "hello world",
  "confidence": 0.95,
  "success": true
}
```

**Supported formats:** `.webm`, `.opus`, `.mp3`, `.wav`, `.ogg`, `.m4a`, `.mp4`

### Text-to-Speech (TTS)
```bash
POST http://localhost:3002/tts
Content-Type: application/x-www-form-urlencoded

text=Hello world&voice_speed=1.0
```

Response: `audio/wav` file (downloads `tts_output.wav`)

## Frontend Integration

From the dashboard (localhost:3000):

```javascript
// STT - Upload audio blob
const formData = new FormData();
formData.append('audio', audioBlob, 'recording.webm');
const response = await fetch('http://localhost:3002/stt', {
  method: 'POST',
  body: formData
});
const { text } = await response.json();

// TTS - Request speech
const response = await fetch('http://localhost:3002/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ text: 'Threat detected', voice_speed: '1.0' })
});
const audioBlob = await response.blob();
const audioUrl = URL.createObjectURL(audioBlob);
new Audio(audioUrl).play();
```

## Troubleshooting

### "FFmpeg not found"
- Install FFmpeg and ensure it's in your PATH
- Test: `ffmpeg -version`

### "Vosk model not found"
- Download model from https://alphacephei.com/vosk/models
- Extract to `models/vosk/` folder (should contain subfolders like `am/`, `conf/`)

### "Piper model not found"
- Download `.onnx` file from https://huggingface.co/rhasspy/piper-voices
- Place in `models/piper/` folder

### "Piper executable not found"
- Download Piper from https://github.com/rhasspy/piper/releases
- Add to PATH or set environment variable: `$env:PIPER_EXECUTABLE="C:\path\to\piper.exe"`

## Architecture

```
┌─────────────┐      HTTP/3002       ┌─────────────────┐
│  Dashboard  │ ────────────────────> │  Comms Service  │
│ (Next.js)   │  (STT/TTS requests) │  (FastAPI)      │
│ localhost:3000                     │  localhost:3002 │
└─────────────┘                      └─────────────────┘
                                             │
                     ┌───────────────────────┴───────────┐
                     │                                   │
                ┌────▼─────┐                       ┌──────▼─────┐
                │   Vosk   │                       │   Piper    │
                │   STT    │                       │   TTS      │
                └──────────┘                       └────────────┘
```

This service is standalone and does not interfere with the MQTT pipeline:
- Simulation → MQTT (1883) → Pi (unchanged)
- Dashboard → HTTP (3001) → Simulation (unchanged)
- Dashboard ↔ HTTP (3002) → Comms (NEW)

## License

MIT
