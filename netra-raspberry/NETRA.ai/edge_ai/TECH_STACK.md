# Edge AI Copilot - Tech Stack

## 🎯 Overview

A real-time, edge-computing AI system for battlefield tactical decision-making, running entirely on Raspberry Pi 4 with <3 second latency.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    EDGE AI COPILOT SYSTEM                       │
│                   (Raspberry Pi 4 - Edge Device)                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│  MQTT Broker    │  ← External (172.17.55.214:1883)
│  (Mosquitto)    │
└────────┬────────┘
         │
    ┌────▼────┐
    │  MQTT   │
    │Subscriber│
    └────┬────┘
         │
    ┌────▼────────────────────────────────────────────┐
    │         TELEMETRY PROCESSING PIPELINE           │
    ├─────────────────────────────────────────────────┤
    │  1. Parse JSON → TelemetryData                  │
    │  2. Threat Analysis → ThreatAssessment          │
    │  3. Build Prompt → Formatted String             │
    │  4. LLM Inference → Raw Decision                │
    │  5. Validate Decision → Clean Text              │
    │  6. Store Context → Historical Data             │
    │  7. Publish Response → MQTT                     │
    └─────────────────────────────────────────────────┘
         │
    ┌────▼────┐
    │  MQTT   │
    │Publisher│
    └────┬────┘
         │
    ┌────▼────────┐
    │  Dashboard  │  ← External
    └─────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    STORAGE LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  • Memory Buffer (100 items)                                    │
│  • Session Files (JSONL format)                                 │
│  • Daily Logs (rotating)                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💻 Core Technologies

### Programming Language
- **Python 3.8+**
  - Async/await support
  - Type hints
  - Dataclasses
  - Pathlib

### AI/ML Stack
- **llama.cpp** (via llama-cpp-python)
  - C++ inference engine
  - GGUF model format support
  - CPU-optimized
  - Low memory footprint

- **TinyLlama 1.1B**
  - 1.1 billion parameters
  - Q4_K_M quantization (~637 MB)
  - Chat-tuned variant
  - Optimized for edge devices

### Communication
- **MQTT Protocol**
  - Lightweight pub/sub messaging
  - QoS levels (0, 1, 2)
  - Automatic reconnection
  - Topic-based routing

- **paho-mqtt** (Python client)
  - Async callbacks
  - TLS support
  - Connection pooling

### Acceleration
- **OpenBLAS**
  - Linear algebra operations
  - CPU optimization
  - SIMD instructions
  - Multi-threading

---

## 📦 Python Dependencies

### Core (2 packages)
```
paho-mqtt>=1.6.1          # MQTT client
llama-cpp-python>=0.2.0   # LLM inference
```

### System Dependencies
```
build-essential           # C/C++ compiler
cmake                     # Build system
libopenblas-dev          # Linear algebra
wget                     # Model download
```

---

## 🗂️ Project Structure

```
edge_ai/
├── 📄 main.py                    # Entry point
├── 📄 config.py                  # Configuration
├── 📄 orchestrator.py            # Pipeline coordinator
├── 📄 requirements.txt           # Python dependencies
│
├── 📁 ai/                        # AI Components
│   ├── threat_analysis.py        # Threat analyzer
│   ├── prompt_builder.py         # Prompt generator
│   ├── inference.py              # LLM inference
│   ├── failsafe.py               # Rule-based fallback
│   └── decision_validator.py     # Decision validator
│
├── 📁 mqtt/                      # MQTT Components
│   ├── subscriber.py             # MQTT subscriber
│   ├── publisher.py              # MQTT publisher
│   └── models.py                 # Data models
│
├── 📁 storage/                   # Storage Layer
│   ├── context_store.py          # Context storage
│   └── __init__.py
│
├── 📁 utils/                     # Utilities
│   └── helpers.py                # Logging utilities
│
├── 📁 tests/                     # Tests
│   └── test_integration.py       # Integration tests
│
├── 📁 models/                    # AI Models
│   └── tinyllama.gguf            # TinyLlama Q4 (~637 MB)
│
├── 📁 storage/context/           # Context Storage
│   └── session_*.jsonl           # Session files
│
└── 📁 logs/                      # Logs
    └── edge_ai_*.log             # Daily logs
```

---

## 🔄 Data Flow

### 1. Input (MQTT)
```json
{
  "timestamp": 1732452123456,
  "tick": 47,
  "squad": [...],
  "enemy": {...},
  "hostage": {...}
}
```

### 2. Processing Pipeline
```
Parse → Analyze → Prompt → Infer → Validate → Store → Publish
```

### 3. Output (MQTT)
```json
{
  "decision": "Take cover and assess situation",
  "risk_score": 0.87,
  "timestamp": 1732452123456,
  "latency_ms": 2450
}
```

---

## 🧮 Algorithms

### Threat Analysis
- **Haversine Formula**: GPS distance calculation
- **Risk Scoring**: Weighted multi-factor analysis
  - Distance factor (50%)
  - Stress factor (20%)
  - Hostage factor (15%)
  - Squad factor (15%)

### LLM Inference
- **Sampling**: Temperature-based (0.5)
- **Top-p**: Nucleus sampling (0.9)
- **Repeat Penalty**: 1.1
- **Stop Tokens**: `["</s>", "<|", "\n\n"]`

### Context Storage
- **Circular Buffer**: Fixed-size deque
- **JSONL Format**: Append-only log
- **Automatic Cleanup**: Time-based retention

---

## 📊 Performance Characteristics

### Latency Breakdown
```
Model Load:     15-20 seconds  (one-time)
Parse:          <10 ms
Threat Analysis: <5 ms
Prompt Build:   <5 ms
LLM Inference:  2000-3000 ms   (dominant)
Validation:     <5 ms
Storage:        <10 ms
MQTT Publish:   <10 ms
─────────────────────────────────
Total:          2.0-3.5 seconds
```

### Resource Usage
```
CPU:     80% during inference (4 cores)
Memory:  ~1.2 GB (model + runtime)
Disk:    ~1 GB (model + logs + context)
Network: <1 KB/s (MQTT messages)
```

### Throughput
```
Max Rate:       ~0.3-0.5 decisions/second
Sustainable:    ~0.2 decisions/second
Batch:          Not supported (real-time only)
```

---

## 🔧 Configuration

### MQTT Settings
```python
MQTT_BROKER_HOST = "172.17.55.214"
MQTT_BROKER_PORT = 1883
MQTT_TOPIC_SENSOR = "battlefield/sensor"
MQTT_TOPIC_RESPONSE = "battlefield/ai-response"
MQTT_QOS = 1
```

### AI Settings
```python
MODEL_PATH = "models/tinyllama.gguf"
MAX_TOKENS = 50
TEMPERATURE = 0.5
THREADS = 2
INFERENCE_TIMEOUT = 5
```

### Storage Settings
```python
CONTEXT_STORAGE_DIR = "storage/context"
CONTEXT_MEMORY_ITEMS = 100
CONTEXT_FILE_ITEMS = 10000
CONTEXT_RETENTION_DAYS = 7
```

---

## 🔒 Security

### Current Implementation
- **MQTT**: Unencrypted (plaintext)
- **Storage**: File system permissions
- **Logs**: Plaintext files
- **Model**: Local (no external calls)

### Recommended Enhancements
- [ ] MQTT TLS encryption
- [ ] MQTT authentication
- [ ] File encryption at rest
- [ ] Access control lists
- [ ] Audit logging

---

## 🎯 Design Principles

### 1. Edge-First
- All processing on device
- No cloud dependency
- Low latency (<3s)
- Offline capable

### 2. Resource-Constrained
- Optimized for Raspberry Pi 4
- Quantized models (Q4)
- Efficient algorithms
- Memory-conscious

### 3. Real-Time
- Event-driven architecture
- Async I/O
- Non-blocking operations
- Immediate response

### 4. Robust
- Automatic reconnection
- Failsafe fallback
- Error handling
- Graceful degradation

### 5. Observable
- Comprehensive logging
- Context storage
- Performance metrics
- Debug tools

---

## 🔄 Deployment Options

### 1. Manual Run
```bash
python3 main.py
```

### 2. Systemd Service
```bash
sudo systemctl start edge-ai-copilot
```

### 3. Docker (Future)
```bash
docker run edge-ai-copilot
```

---

## 📈 Scalability

### Current Limitations
- **Single-threaded**: One request at a time
- **Single-device**: No distributed processing
- **Memory-bound**: 100 items in memory
- **CPU-bound**: Inference is bottleneck

### Potential Improvements
- [ ] Multi-model support
- [ ] Request queuing
- [ ] Distributed inference
- [ ] GPU acceleration
- [ ] Model caching

---

## 🧪 Testing

### Unit Tests
```bash
python3 -m pytest tests/
```

### Integration Tests
```bash
python3 test_system.py
```

### Manual Testing
```bash
mosquitto_pub -t "battlefield/sensor" -m '{...}'
```

---

## 📚 Documentation

- **README.md** - Project overview
- **QUICKSTART.md** - Quick start guide
- **PAYLOAD_FORMAT.md** - MQTT payload spec
- **CONTEXT_STORAGE.md** - Storage system
- **TECH_STACK.md** - This document

---

## 🔮 Future Roadmap

### Short-term
- [ ] SQLite database
- [ ] Web dashboard
- [ ] Model fine-tuning
- [ ] Performance profiling

### Medium-term
- [ ] Multi-model ensemble
- [ ] Predictive analytics
- [ ] Anomaly detection
- [ ] Real-time alerts

### Long-term
- [ ] Federated learning
- [ ] Edge-cloud hybrid
- [ ] Advanced ML models
- [ ] Autonomous operations

---

## 📊 Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Language** | Python 3.8+ | Core implementation |
| **AI Engine** | llama.cpp | LLM inference |
| **Model** | TinyLlama 1.1B Q4 | Tactical decisions |
| **Communication** | MQTT (paho-mqtt) | Message broker |
| **Acceleration** | OpenBLAS | Linear algebra |
| **Storage** | JSONL files | Context persistence |
| **Logging** | Python logging | Observability |
| **Platform** | Raspberry Pi 4 | Edge device |

---

**Built for autonomous battlefield edge computing** 🎯
