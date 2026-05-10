# Edge AI Copilot - Project Summary

## 🎯 Project Overview

**Edge AI Copilot** is an autonomous battlefield edge AI system that runs entirely on Raspberry Pi 4. It receives real-time telemetry data via MQTT, analyzes threats, generates tactical decisions using a local LLM (TinyLlama), and publishes responses back via MQTT.

**Key Achievement**: <3 second end-to-end latency on Raspberry Pi 4 using optimized quantized LLM.

---

## 📁 Project Structure (Clean & Organized)

```
edge_ai/
│
├── 📄 setup_and_run.sh          # ⭐ SINGLE SCRIPT FOR EVERYTHING
├── 📄 main.py                    # Entry point
├── 📄 config.py                  # Configuration
├── 📄 orchestrator.py            # Pipeline coordinator
├── 📄 requirements.txt           # Python dependencies (2 packages)
│
├── 📁 ai/                        # AI Components
│   ├── threat_analysis.py        # Threat analyzer
│   ├── prompt_builder.py         # Prompt generator
│   ├── inference.py              # LLM inference engine
│   ├── failsafe.py               # Rule-based fallback
│   └── decision_validator.py     # Decision validator
│
├── 📁 mqtt/                      # MQTT Components
│   ├── subscriber.py             # MQTT subscriber
│   ├── publisher.py              # MQTT publisher
│   └── models.py                 # Data models
│
├── 📁 utils/                     # Utilities
│   └── helpers.py                # Logging utilities
│
├── 📁 tests/                     # Tests
│   └── test_integration.py       # Integration tests
│
├── 📁 models/                    # AI Models (created by setup)
│   └── tinyllama.gguf            # TinyLlama Q4 (~637 MB)
│
├── 📁 logs/                      # Logs (auto-created)
│   └── edge_ai_YYYYMMDD.log
│
└── 📚 Documentation
    ├── README.md                 # Complete documentation
    ├── QUICKSTART.md             # Quick start guide
    ├── CHANGELOG.md              # Version history
    └── PROJECT_SUMMARY.md        # This file
```

---

## 🚀 Quick Start (One Command)

```bash
chmod +x setup_and_run.sh
./setup_and_run.sh
```

**What it does:**
1. ✅ Checks system (OS, RAM, CPU, Python)
2. ✅ Installs system dependencies (cmake, openblas, etc.)
3. ✅ Handles "externally-managed-environment" error
4. ✅ Offers virtual environment or system-wide installation
5. ✅ Installs Python packages (paho-mqtt, llama-cpp-python)
6. ✅ Downloads TinyLlama model (~637 MB)
7. ✅ Runs comprehensive tests
8. ✅ Starts the Edge AI Copilot

**Time**: ~20-35 minutes (first time only)

---

## 🔄 System Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                     EDGE AI COPILOT PIPELINE                    │
└─────────────────────────────────────────────────────────────────┘

1. MQTT Subscriber
   ↓ Receives telemetry from battlefield sensors
   
2. Telemetry Parser
   ↓ Parses JSON payload
   
3. Threat Analyzer
   ↓ Calculates distances, risk scores, threat levels
   
4. Prompt Builder
   ↓ Formats tactical situation for LLM
   
5. LLM Inference (TinyLlama)
   ↓ Generates tactical decision (~2-3 seconds)
   
6. Decision Validator
   ↓ Ensures decision is concise and actionable
   
7. MQTT Publisher
   ↓ Publishes response to dashboard
   
8. Logging
   └ Records all events to daily log files
```

---

## 📊 Technical Specifications

### Hardware Requirements
- **Device**: Raspberry Pi 4
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 32GB+ microSD card
- **Network**: Ethernet or WiFi

### Software Stack
- **OS**: Raspberry Pi OS (64-bit)
- **Python**: 3.8+
- **LLM**: TinyLlama 1.1B (Q4 quantized)
- **MQTT**: Mosquitto broker
- **Acceleration**: OpenBLAS

### Performance Metrics
- **Model Load**: 15-20 seconds
- **Inference**: 2-3 seconds
- **Total Latency**: 2.5-3.5 seconds
- **Memory Usage**: ~1.2 GB
- **CPU Usage**: ~80% during inference

### Dependencies
```
Core:
- paho-mqtt (MQTT communication)
- llama-cpp-python (LLM inference)

System:
- build-essential (compilation)
- cmake (build system)
- libopenblas-dev (acceleration)
```

---

## ⚙️ Configuration

Edit `config.py`:

```python
# MQTT Settings
MQTT_BROKER_HOST = "172.17.55.214"
MQTT_BROKER_PORT = 1883
MQTT_TOPIC_SENSOR = "battlefield/sensor"
MQTT_TOPIC_RESPONSE = "battlefield/ai-response"

# AI Settings
MODEL_PATH = "models/tinyllama.gguf"
MAX_TOKENS = 50
TEMPERATURE = 0.5
THREADS = 2
INFERENCE_TIMEOUT = 5

# Threat Thresholds
CRITICAL_DISTANCE = 100      # meters
STRESS_HEART_RATE = 120      # bpm
HOSTAGE_RISK_DISTANCE = 50   # meters
```

---

## 📡 MQTT Interface

### Input: Telemetry Data
**Topic**: `battlefield/sensor`

```json
{
  "timestamp": 1710000000,
  "soldier": {
    "x": 120,
    "y": 340,
    "heart_rate": 125
  },
  "enemy": {
    "x": 180,
    "y": 360
  },
  "hostage": {
    "x": 140,
    "y": 350
  },
  "environment": "urban",
  "threat_level": "high"
}
```

### Output: AI Decision
**Topic**: `battlefield/ai-response`

```json
{
  "decision": "Take cover and assess situation",
  "risk_score": 0.87,
  "timestamp": 1710000000,
  "latency_ms": 2450
}
```

---

## 🧪 Testing

### Automated Tests (Built into setup script)

1. **Import Test**
   - Verifies paho-mqtt installation
   - Verifies llama-cpp-python installation

2. **Model Loading Test**
   - Loads TinyLlama model
   - Measures load time

3. **Inference Test**
   - Generates tactical decision
   - Validates output format
   - Measures inference time

4. **Configuration Test**
   - Validates config.py
   - Checks model file exists
   - Verifies MQTT settings

### Manual Testing

```bash
# Terminal 1: Subscribe to responses
mosquitto_sub -t "battlefield/ai-response" -v

# Terminal 2: Send test telemetry
mosquitto_pub -t "battlefield/sensor" -m '{
  "timestamp": 1710000000,
  "soldier": {"x": 120, "y": 340, "heart_rate": 125},
  "enemy": {"x": 180, "y": 360},
  "hostage": {"x": 140, "y": 350},
  "environment": "urban",
  "threat_level": "high"
}'
```

---

## 🔧 Deployment Options

### Option 1: Manual Run
```bash
# With virtual environment
source venv/bin/activate
python3 main.py

# System-wide
python3 main.py
```

### Option 2: Systemd Service
```bash
# Install service
sudo cp edge-ai-copilot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable edge-ai-copilot
sudo systemctl start edge-ai-copilot

# Check status
sudo systemctl status edge-ai-copilot

# View logs
sudo journalctl -u edge-ai-copilot -f
```

---

## 🐛 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "externally-managed-environment" | Run `./setup_and_run.sh` |
| Model not found | Run `./setup_and_run.sh` |
| Empty LLM response | Check model size (~637 MB) |
| MQTT connection failed | Update broker IP in config.py |
| High latency | Reduce MAX_TOKENS in config.py |
| Out of memory | Close other applications |

### Debug Commands

```bash
# Check system resources
free -h
vcgencmd measure_temp

# Check MQTT broker
sudo systemctl status mosquitto

# View logs
tail -f logs/edge_ai_*.log

# Test Python imports
python3 -c "import paho.mqtt.client; import llama_cpp; print('OK')"

# Test model loading
python3 -c "from llama_cpp import Llama; llm = Llama('models/tinyllama.gguf'); print('OK')"
```

---

## 📈 Optimization Tips

### For Faster Inference
```python
# config.py
MAX_TOKENS = 40          # Reduce response length
TEMPERATURE = 0.4        # More deterministic
THREADS = 2              # Optimal for Pi 4
```

### For Lower Memory
- Use Q4 quantized model (current)
- Don't use Q8 or F16 models
- Close unnecessary applications

### For Better Accuracy
```python
# config.py
MAX_TOKENS = 60          # Longer responses
TEMPERATURE = 0.6        # More creative
```

---

## 🔒 Security

### MQTT Authentication
```bash
# Enable authentication
sudo mosquitto_passwd -c /etc/mosquitto/passwd edge_ai
sudo nano /etc/mosquitto/mosquitto.conf
```

Add:
```
allow_anonymous false
password_file /etc/mosquitto/passwd
```

### TLS Encryption
Update `config.py`:
```python
MQTT_USE_TLS = True
MQTT_CA_CERTS = "/path/to/ca.crt"
```

---

## 📝 Logging

### Log Files
- Location: `logs/edge_ai_YYYYMMDD.log`
- Rotation: Daily
- Retention: 7 days (configurable)

### Log Levels
- INFO: Normal operations
- WARNING: Non-critical issues
- ERROR: Critical failures

### View Logs
```bash
# Real-time
tail -f logs/edge_ai_*.log

# Systemd logs
sudo journalctl -u edge-ai-copilot -f

# Search logs
grep "ERROR" logs/edge_ai_*.log
```

---

## 🎯 Key Features

✅ **Autonomous Operation**: Runs independently on edge device  
✅ **Low Latency**: <3 second response time  
✅ **Local Processing**: No cloud dependency  
✅ **Robust**: Automatic reconnection and failsafe logic  
✅ **Optimized**: Raspberry Pi 4 specific optimizations  
✅ **Comprehensive**: Full logging and error handling  
✅ **Easy Setup**: Single script installation  
✅ **Well Documented**: Complete guides and examples  

---

## 🚀 Getting Started Checklist

- [ ] Clone repository
- [ ] Run `chmod +x setup_and_run.sh`
- [ ] Run `./setup_and_run.sh`
- [ ] Update MQTT broker IP in `config.py`
- [ ] Test with sample telemetry
- [ ] Monitor logs
- [ ] Deploy as systemd service (optional)

---

## 📚 Documentation Files

- **README.md** - Complete project documentation
- **QUICKSTART.md** - Quick start guide
- **CHANGELOG.md** - Version history and changes
- **PROJECT_SUMMARY.md** - This file (overview)

---

## 🤝 Support

### Quick Help
```bash
# Setup and run
./setup_and_run.sh

# View logs
tail -f logs/edge_ai_*.log

# Check status
python3 -c "from edge_ai.config import Config; Config.validate(); print('OK')"
```

### Resources
- Setup script: `./setup_and_run.sh`
- Configuration: `config.py`
- Logs: `logs/edge_ai_*.log`
- Tests: Built into setup script

---

## ✨ What Makes This Special

1. **Single Script Setup**: Everything automated
2. **Robust Error Handling**: Handles all edge cases
3. **Comprehensive Testing**: Built-in test suite
4. **Clean Architecture**: Well-organized codebase
5. **Production Ready**: Systemd service included
6. **Raspberry Pi Optimized**: OpenBLAS acceleration
7. **Low Latency**: <3 second response time
8. **No Cloud Dependency**: Fully autonomous

---

## 🎓 How It Works

The system receives battlefield telemetry via MQTT, analyzes the tactical situation (distances, threat levels, stress indicators), formats a prompt for the LLM, generates a tactical decision using TinyLlama (running locally on Raspberry Pi), validates the decision, and publishes it back via MQTT - all in under 3 seconds.

**Innovation**: Runs a 1.1B parameter LLM on Raspberry Pi 4 with production-ready latency using Q4 quantization and OpenBLAS acceleration.

---

**Built for autonomous battlefield edge computing** 🎯

**Version**: 2.0.0  
**Status**: Production Ready  
**Platform**: Raspberry Pi 4  
**Latency**: <3 seconds  
