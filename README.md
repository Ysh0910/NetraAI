# N.E.T.R.A. — Neural Edge Tactical Response Agent

> **A distributed telemetry and intelligence hub for teams operating in completely offline, denied environments.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status: WIP](https://img.shields.io/badge/Status-Work%20In%20Progress-orange.svg)]()

---

## 🎯 The One-Liner

N.E.T.R.A. is a distributed telemetry and intelligence hub designed for teams operating in completely offline, denied environments (**DDIL: Denied, Disrupted, Interrupted, and Limited**).

---

## 🎬 Demo

Watch N.E.T.R.A. in action — voice commands, real-time telemetry, and AI tactical responses running entirely offline:

<video src="netra_demo_video.mp4" controls width="100%"></video>

---

## ⚠️ The Problem

Whether in a remote desert, a deep mining operation, or a combat zone experiencing electronic jamming, teams frequently lose access to the internet, cellular networks, and cloud infrastructure.

**When the network dies, commanders go blind, and critical coordination is lost.**

| Environment | Failure Mode |
|-------------|--------------|
| **Combat Zones** | Electronic jamming, severed comms |
| **Deep Mining** | No cellular reach underground |
| **Remote Deserts** | No infrastructure for kilometers |
| **Disaster Zones** | Towers destroyed, cloud unreachable |
| **Maritime / Aviation** | Beyond shore-station range |

Existing solutions (cloud AI, tactical tablets, smart helmets) all share one fatal flaw: **they assume connectivity.**

---

## ✅ The Solution

N.E.T.R.A. replaces vulnerable cloud reliance with a **localized, floating mesh architecture** and an **Edge AI Copilot**.

### Core Capabilities

- 📡 **Real-Time Telemetry Mesh** — Tracks team coordinates, vitals, and hostile entities over a local radio network
- 🧠 **Air-Gapped Voice AI** — Tactical questions answered out loud, running entirely on edge hardware
- 🎯 **Threat Intelligence** — Continuously analyzes squad position, enemy proximity, and operator stress
- 🔊 **Voice-First Interface** — Operators keep their hands free; no screens, no taps
- 🛰️ **Zero Cloud Dependency** — Every byte stays on the local mesh

### What Makes It Different

| Traditional Systems | N.E.T.R.A. |
|---------------------|-----------|
| Cloud LLMs (ChatGPT, etc.) | **Edge LLM** on Raspberry Pi |
| Cellular / Wi-Fi backbone | **Local mesh** (MQTT over radio/WS) |
| Screen-based tactical apps | **Voice-driven** (STT + TTS) |
| Vendor-locked, ₹50L+ helmets | **Open-source**, ~₹15K per node |
| Single point of failure (cloud) | **Distributed**, fault-tolerant |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                  DDIL ENVIRONMENT (Offline)                    │
│                                                                │
│  ┌──────────────┐         ┌──────────────┐     ┌────────────┐  │
│  │  IoT Sensor  │──MQTT──▶│  Local MQTT  │◀────│ Commander  │  │
│  │  Nodes       │         │   Broker     │     │ Dashboard  │  │
│  │ (vitals,GPS) │         │  (Aedes)     │     │ (Next.js)  │  │
│  └──────────────┘         └──────┬───────┘     └─────┬──────┘  │
│                                  │                   │         │
│                                  ▼                   ▼         │
│                          ┌──────────────┐   ┌──────────────┐   │
│                          │ Edge AI Pi   │   │ Voice Comms  │   │
│                          │ (Local LLM)  │   │ STT + TTS    │   │
│                          └──────────────┘   └──────────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                          ⛔ No Internet ⛔
```

### Five Microservices

| Service | Tech | Port | Purpose |
|---------|------|------|---------|
| `netra-broker` | Node.js + Aedes | 1883 (TCP), 8080 (WS) | Local MQTT mesh hub |
| `netra-simulation` | Node.js | N/A | Generates squad telemetry (demo mode) |
| `netra-comms` | Python + FastAPI | 3002 | Offline STT (Vosk) + TTS (Piper) |
| `netra-raspberry` | Python + llama.cpp | N/A | Edge AI brain — runs local LLM |
| `netra-dashboard` | Next.js 16 | 3000 | Commander's situational awareness UI |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- Raspberry Pi 5 (8GB) — for production edge AI
- Any local network (no internet needed once set up)

### 1. Install Dependencies

```bash
# Dashboard
npm install

# Comms server
cd netra-comms
pip install fastapi uvicorn pydub vosk paho-mqtt requests python-multipart

# Edge AI (Pi)
cd ../netra-raspberry/NETRA.ai/edge_ai
pip install paho-mqtt requests llama-cpp-python
```

### 2. Download AI Models (One-Time, While You Have Internet)

#### Vosk — Offline Speech-to-Text
```bash
cd netra-comms/models
mkdir -p vosk
# Download from: https://alphacephei.com/vosk/models
# Recommended for accuracy: vosk-model-en-us-0.22 (~1.8GB)
# Extract to: netra-comms/models/vosk/
```

#### Piper — Offline Text-to-Speech
```bash
cd netra-comms/models/piper
# Download from: https://github.com/rhasspy/piper/releases
# wget https://huggingface.co/rhasspy/piper-voices/.../en_US-lessac-medium.onnx
# wget https://huggingface.co/rhasspy/piper-voices/.../en_US-lessac-medium.onnx.json
```

#### Local LLM for the Pi
```bash
cd netra-raspberry/NETRA.ai/edge_ai/models
# Download quantized LLM (~2-3GB)
# Recommended: TinyLlama-1.1B-Chat-Q4 or Phi-3-mini-Q4
```

**Once downloaded, the system runs forever offline.**

### 3. Launch the Mesh

```bash
# Terminal 1: MQTT Mesh Hub
cd netra-broker
npm start

# Terminal 2: Telemetry Source (sensors or simulator)
cd netra-simulation
node simulate.js

# Terminal 3: Voice Comms (STT + TTS)
cd netra-comms
python main.py

# Terminal 4: Commander Dashboard
npm run dev

# Terminal 5: Edge AI Brain (on the Pi)
cd netra-raspberry/NETRA.ai/edge_ai
python src/main.py
```

### 4. Open the Dashboard

[http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
Netra/
├── app/                              # Next.js dashboard
│   ├── api/ai-response/route.js     # AI response polling endpoint
│   ├── layout.jsx
│   └── page.jsx                     # Main command center
├── components/                       # React UI components
│   ├── ai-response-player.jsx       # Plays AI voice replies
│   ├── tactical-map.jsx             # Live battlefield map
│   ├── telemetry-panel.jsx          # Squad vitals
│   ├── voice-command.jsx            # Operator voice input
│   ├── simulation-panel.jsx         # God-mode event injection
│   └── ...
├── hooks/
│   └── use-mqtt-integration.js      # MQTT mesh client + polling
├── lib/
│   ├── store.js                     # Zustand global state
│   └── utils.js
├── netra-broker/                     # MQTT mesh hub
│   ├── server.js
│   └── package.json
├── netra-comms/                      # Offline STT + TTS service
│   ├── main.py                      # FastAPI server
│   ├── models/                      # Vosk + Piper (gitignored)
│   └── audio_output/                # Generated speech (gitignored)
├── netra-raspberry/                  # Edge AI brain
│   └── NETRA.ai/edge_ai/
│       ├── src/main.py              # Pipeline orchestrator
│       ├── ai/                      # Inference, prompts, failsafes
│       ├── mqtt/                    # Models, publisher, subscriber
│       └── storage/                 # Context store
├── netra-simulation/                 # Telemetry generator (demo)
│   └── simulate.js
├── public/
├── .gitignore
└── package.json
```

---

## 🎮 How It Works

### The Voice → AI → Voice Loop

```
1. Operator speaks: "How is Charlie doing?"
       ↓
2. Dashboard → Comms server → Vosk transcribes (OFFLINE)
       ↓
3. Transcript broadcast on MQTT mesh
       ↓
4. Edge AI Pi receives transcript + live squad telemetry
       ↓
5. Prompt builder fuses vitals, positions, threats, query
       ↓
6. Local LLM (llama.cpp) generates tactical decision
       ↓
7. Decision validator scrubs hallucinations
       ↓
8. Pi publishes decision back on MQTT
       ↓
9. Comms server → Piper TTS synthesizes audio (OFFLINE)
       ↓
10. Dashboard plays AI voice reply to operator
```

**End-to-end latency: ~1.5-2 seconds. Zero internet used.**

### Commander Dashboard Features

- 🗺️ **Tactical Map** — Real-time positions of squad members, enemies, hostages
- ❤️ **Vitals Panel** — Heart rate, battery, status per soldier
- 🎙️ **Voice Command** — Click to record, transcribe, and send queries
- 🤖 **AI Response Player** — Listen to AI tactical recommendations
- 🎛️ **God Mode** — Inject scenarios for training (casualty, low battery, etc.)
- 📜 **Agent Log** — Audit trail of all AI decisions and system events

---

## 🔧 Configuration

### Environment Variables

Create `.env.local` in project root:

```env
# Dashboard
NEXT_PUBLIC_MQTT_URL=ws://localhost:8080
NEXT_PUBLIC_API_URL=http://localhost:3002

# Comms server (terminal env)
export VOSK_MODEL_PATH=/path/to/vosk-model
export PIPER_EXECUTABLE=/path/to/piper

# Edge AI
export LLAMA_MODEL_PATH=/path/to/quantized-llm.gguf
```

### Switching Voice Models

The system auto-detects models in default paths. To swap:

```bash
# Quick test of a different Vosk model
$env:VOSK_MODEL_PATH="C:/path/to/vosk-model-en-us-0.22"
python netra-comms/main.py
```

---

## 🌐 Real-World Applications

N.E.T.R.A.'s architecture solves DDIL problems across industries:

| Industry | Use Case |
|----------|----------|
| 🪖 **Defense** | Squad-level tactical AI co-pilot in jammed environments |
| 🚒 **Disaster Response** | Search & rescue when infrastructure is destroyed |
| ⛏️ **Mining** | Deep underground worker safety & coordination |
| 🔥 **Firefighting** | Voice-driven situational awareness in dense smoke |
| 🚢 **Maritime** | Vessels operating beyond coastal network range |
| 🏥 **Rural Healthcare** | Offline triage assistant for ASHA workers |
| 🌾 **Agriculture** | Voice-driven AI agronomist in villages with poor internet |
| 🛻 **Industrial Convoys** | Remote oil & gas, agricultural fleets |

---

## 🐛 Troubleshooting

### No audio playing in dashboard
- Check Comms health: `http://localhost:3002/health`
- Verify `netra-comms/audio_output/` has `.wav` files
- Browser console: look for `[NETRA-AUDIO] Poll status: 200`

### Poor speech recognition accuracy
- Replace small Vosk model with `vosk-model-en-us-0.22` (~1.8GB, much better)
- Speak clearly; reduce background noise
- Check `netra-comms` logs for raw transcription

### Edge AI Pi not responding
- Verify MQTT broker is reachable from Pi
- Check Pi subscribed to `battlefield/sensor` topic
- Check Pi logs for LLM loading errors

### Dashboard can't connect to MQTT
- Confirm broker WebSocket port 8080 accessible
- Match `NEXT_PUBLIC_MQTT_URL` to broker address
- Check browser console for WebSocket errors

---

## 🛠️ Development

### Adding a New MQTT Topic

1. Add to `netra-broker/server.js` allowed topics
2. Subscribe in `hooks/use-mqtt-integration.js`
3. Publish from any service using `mqtt.publish(topic, payload)`

### Testing Without the Pi

Simulate an AI response directly:

```bash
curl -X POST http://localhost:3000/api/ai-response `
  -H "Content-Type: application/json" `
  -d '{
    "decision": "Take cover behind the wall. Enemy approaching.",
    "audioUrl": "http://localhost:3002/audio/test.wav",
    "filename": "test.wav",
    "soldierId": "alpha"
  }'
```

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [Vosk](https://alphacephei.com/vosk/) — Offline speech recognition
- [Piper](https://github.com/rhasspy/piper) — Fast local text-to-speech
- [Aedes](https://github.com/moscajs/aedes) — Lightweight MQTT broker
- [llama.cpp](https://github.com/ggerganov/llama.cpp) — Edge LLM inference

---

> **N.E.T.R.A. — Because the future of coordination shouldn't depend on the cloud.**
