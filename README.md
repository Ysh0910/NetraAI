# N.E.T.R.A. — Networked Edge Tactical Response Assistant

> **An IoT-powered, edge-AI tactical co-pilot for soldiers in active combat zones.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

⚠️ **Note: This project is currently still under active development (Work in Progress).** ⚠️

---

## 🎯 What is N.E.T.R.A.?

N.E.T.R.A. is a distributed IoT system that provides soldiers with an **AI battle buddy** running entirely on edge hardware. It fuses real-time biometric sensors, GPS telemetry, and voice commands, then delivers AI-generated tactical decisions back as voice responses in **under 2 seconds** — with **zero internet required**.

### Key Features
- 🎙️ **Voice-to-Voice AI**: Speak naturally, get tactical advice spoken back
- 📡 **Edge-First**: Runs on Raspberry Pi with local LLM — no cloud dependency
- 📊 **Real-time Telemetry**: Heart rate, battery, GPS position for every soldier
- 🗺️ **Tactical Dashboard**: Live map with squad positions, enemy/hostage markers
- 🔊 **Offline STT/TTS**: Vosk + Piper for speech recognition and synthesis
- 🔄 **MQTT Backbone**: Low-latency, fault-tolerant messaging

---

## 🏗️ Architecture

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│ Soldier IoT  │ ──MQTT──▶│ MQTT Broker  │◀──MQTT──│  Dashboard   │
│   Sensors    │         │   (Aedes)    │         │  (Next.js)   │
└──────────────┘         └──────┬───────┘         └──────┬───────┘
                                │                        │
                                ▼                        ▼
                         ┌──────────────┐        ┌──────────────┐
                         │ Raspberry Pi │        │ Comms Server │
                         │  Edge AI     │        │  (Python)    │
                         │  (LLaMA)     │        │  STT + TTS   │
                         └──────────────┘        └──────────────┘
```

### Five Microservices

| Service | Tech | Port | Purpose |
|---------|------|------|---------|
| `netra-broker` | Node.js + Aedes | 1883 (TCP), 8080 (WS) | MQTT message broker |
| `netra-simulation` | Node.js | N/A | Simulates soldier telemetry every 30s |
| `netra-comms` | Python + FastAPI | 3002 | Speech-to-Text (Vosk) + TTS (Piper) |
| `netra-raspberry` | Python | N/A | Edge AI — receives telemetry, runs LLM, publishes decisions |
| `netra-dashboard` | Next.js 16 | 3000 | Command center UI |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- Raspberry Pi 5 (8GB) with Raspbian (for edge AI)
- MQTT broker can run on any machine

### 1. Install Dependencies

```bash
# Dashboard dependencies
npm install

# Comms server dependencies (Python)
cd netra-comms
pip install fastapi uvicorn pydub vosk paho-mqtt requests python-multipart

# Raspberry Pi dependencies
cd ../netra-raspberry/NETRA.ai/edge_ai
pip install paho-mqtt requests
# Install llama.cpp and download quantized LLM (see below)
```

### 2. Download AI Models

#### Vosk (Speech-to-Text)
```bash
cd netra-comms/models
mkdir -p vosk
# Download model from https://alphacephei.com/vosk/models
# Recommended: vosk-model-en-us-0.22 (larger, more accurate)
# Extract to: netra-comms/models/vosk/
# Should contain: am/final.mdl, conf/model.conf, graph/, ivector/, etc.
```

#### Piper (Text-to-Speech)
```bash
cd netra-comms/models/piper
# Download from: https://github.com/rhasspy/piper/releases
# Download voice model:
# wget https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx
# wget https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json
```

#### LLM for Raspberry Pi
```bash
cd netra-raspberry/NETRA.ai/edge_ai
# Download quantized LLM (~2-3GB)
# Recommended: TinyLlama-1.1B or Phi-3-mini (4-bit quantized)
# Place in: netra-raspberry/NETRA.ai/edge_ai/models/
```

### 3. Start Services (In Order)

```bash
# Terminal 1: Start MQTT Broker
cd netra-broker
npm start

# Terminal 2: Start Simulation (generates soldier telemetry)
cd netra-simulation
node simulate.js

# Terminal 3: Start Comms Server (STT + TTS)
cd netra-comms
python main.py

# Terminal 4: Start Dashboard
cd netra-dashboard  # or project root if combined
npm run dev

# Terminal 5: Start Raspberry Pi Edge AI (on Pi or simulate)
cd netra-raspberry/NETRA.ai/edge_ai
python src/main.py
```

### 4. Access the Dashboard

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
Netra/
├── app/                          # Next.js dashboard (pages, API routes)
│   ├── api/ai-response/route.js  # AI response polling endpoint
│   ├── layout.jsx
│   └── page.jsx
├── components/                   # React components
│   ├── ai-response-player.jsx   # Audio player for AI responses
│   ├── tactical-map.jsx         # Interactive battlefield map
│   ├── telemetry-panel.jsx      # Soldier vitals display
│   ├── voice-command.jsx        # Voice recording interface
│   └── ...
├── hooks/                        # Custom React hooks
│   └── use-mqtt-integration.js  # MQTT connection + polling
├── lib/                          # Utilities & Zustand store
│   ├── store.js                 # Global state management
│   └── utils.js
├── netra-broker/                 # MQTT broker service
│   └── server.js
├── netra-comms/                  # STT + TTS service
│   ├── main.py                  # FastAPI server
│   ├── models/                  # Vosk + Piper models (gitignored)
│   └── audio_output/            # Generated TTS files (gitignored)
├── netra-raspberry/              # Edge AI service (Raspberry Pi)
│   └── NETRA.ai/edge_ai/
│       ├── src/main.py          # Main orchestrator
│       ├── src/ai_client.py     # LLM client
│       └── src/prompt_builder.py # Prompt construction
├── netra-simulation/             # Telemetry simulator
│   └── simulate.js              # Generates soldier data
├── public/                       # Static assets
├── .gitignore                    # Excludes models, audio, temp files
└── package.json
```

---

## 🎮 Usage

### Sending a Voice Command

1. **Open Dashboard** at `http://localhost:3000`
2. **Select unit** (e.g., ALPHA-1) in the Voice Command Panel
3. **Click microphone** and speak: *"How is Charlie doing?"*
4. **Dashboard** sends audio to Comms Server → transcribes with Vosk
5. **Simulation** includes voice message in next telemetry payload to Pi
6. **Raspberry Pi** receives telemetry + voice, runs LLM inference
7. **Pi publishes** AI decision back via MQTT
8. **Dashboard receives** audio URL + text → plays via AI Response Player

### God Mode (Simulation Panel)

Use the Simulation Panel to inject scenarios:
- Set soldier heart rate (simulate injury)
- Set battery level
- Trigger "casualty" or "connection lost" events

### Monitoring

- **Health Check Comms**: `http://localhost:3002/health`
- **MQTT Broker**: `ws://localhost:8080` (WebSocket)
- **API Polling**: `/api/ai-response` (called every 2s by dashboard)

---

## 🔧 Configuration

### Environment Variables

Create `.env.local` in project root:

```env
# Dashboard
NEXT_PUBLIC_MQTT_URL=ws://localhost:8080
NEXT_PUBLIC_API_URL=http://localhost:3002

# Comms Server (set in terminal or .env)
export VOSK_MODEL_PATH=/path/to/vosk-model
export PIPER_EXECUTABLE=/path/to/piper

# Raspberry Pi
export LLAMA_MODEL_PATH=/path/to/quantized-llm.gguf
```

### Model Paths

Comms server auto-detects models in:
- Vosk: `netra-comms/models/vosk/` (or env var `VOSK_MODEL_PATH`)
- Piper: `netra-comms/models/piper/*.onnx`

---

## 🐛 Troubleshooting

### Issue: No audio playing in dashboard

**Check:**
1. Comms server running: `http://localhost:3002/health`
2. Audio files exist in `netra-comms/audio_output/`
3. Browser console shows polling: `[NETRA-AUDIO] Poll status: 200`
4. Zustand store has `lastAiAudio` with valid URL

### Issue: STT not working / poor accuracy

**Solutions:**
1. Download larger Vosk model: `vosk-model-en-us-0.22` (better accuracy than small model)
2. Speak clearly, reduce background noise
3. Check `netra-comms` logs for transcription output

### Issue: Pi not responding

**Check:**
1. MQTT broker running and Pi connected
2. Pi subscribed to `battlefield/sensor` topic
3. Pi can reach broker (network/firewall)
4. Check Pi logs for errors

### Issue: Dashboard not connecting to MQTT

**Check:**
1. Broker WebSocket port 8080 accessible
2. `NEXT_PUBLIC_MQTT_URL` matches broker address
3. Browser console for WebSocket connection errors
4. CORS not blocking (broker allows all origins by default)

---

## 🛠️ Development

### Adding New Features

1. **New MQTT Topic**: Add to `netra-broker/server.js` allowed topics
2. **Dashboard Component**: Add to `components/`, import in `page.jsx`
3. **API Route**: Add to `app/api/[route]/route.js`
4. **Store Update**: Add action to `lib/store.js`

### Testing Voice Flow Locally

Without Raspberry Pi, you can simulate the AI response:

```bash
# Send test AI response to dashboard
curl -X POST http://localhost:3000/api/ai-response \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "Take cover behind the wall. Enemy approaching.",
    "audioUrl": "http://localhost:3002/audio/test.wav",
    "filename": "test.wav",
    "soldierId": "alpha"
  }'
```

---

## 📜 License

MIT License — see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Vosk](https://alphacephei.com/vosk/) — Offline speech recognition
- [Piper](https://github.com/rhasspy/piper) — Fast local text-to-speech
- [Aedes](https://github.com/moscajs/aedes) — MQTT broker in Node.js
- [llama.cpp](https://github.com/ggerganov/llama.cpp) — Edge LLM inference

---

**Built with ❤️ for the edge.**
