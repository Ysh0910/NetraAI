# Edge AI Copilot

**Autonomous Battlefield Edge AI Unit for Raspberry Pi**

A lightweight, real-time tactical AI system that processes battlefield telemetry data locally using TinyLlama LLM, generates tactical recommendations, and publishes responses via MQTT.

---

## 🎯 Features

- **Real-time Telemetry Processing**: Receives battlefield sensor data via MQTT
- **Local AI Inference**: Uses llama.cpp with TinyLlama (1.1B parameters, Q4 quantized)
- **Threat Analysis**: Computes risk scores and threat levels from telemetry
- **Automatic Reconnection**: Robust MQTT handling with exponential backoff
- **Failsafe Logic**: Rule-based fallback when AI inference fails
- **Comprehensive Logging**: Daily log rotation with configurable retention
- **Low Latency**: Optimized for Raspberry Pi 4 (~2-3 second response time)

---

## 📋 System Requirements

### Hardware
- **Raspberry Pi 4** (8GB recommended, 4GB minimum)
- MicroSD card (32GB+)
- Network connection (Ethernet or WiFi)

### Software
- Raspberry Pi OS (64-bit recommended)
- Python 3.8+
- MQTT Broker (Mosquitto)

---

## 🚀 Quick Start

### One-Command Setup

```bash
chmod +x setup_and_run.sh
./setup_and_run.sh
```

This single script will:
1. ✅ Check system information
2. ✅ Install system dependencies (cmake, openblas, etc.)
3. ✅ Setup Python environment (venv or system-wide)
4. ✅ Install Python packages (paho-mqtt, llama-cpp-python)
5. ✅ Download TinyLlama model (~637 MB)
6. ✅ Run comprehensive tests
7. ✅ Start the Edge AI Copilot

**Total setup time**: ~20-35 minutes (first time only)

---

## 📁 Project Structure

```
edge_ai/
├── setup_and_run.sh          # Single script for setup and execution
├── main.py                    # Entry point
├── config.py                  # Configuration management
├── orchestrator.py            # Main pipeline coordinator
├── requirements.txt           # Python dependencies
│
├── ai/                        # AI components
│   ├── threat_analysis.py     # Threat analyzer
│   ├── prompt_builder.py      # Prompt generator
│   ├── inference.py           # LLM inference engine
│   ├── failsafe.py            # Fallback logic
│   └── decision_validator.py  # Decision validator
│
├── mqtt/                      # MQTT components
│   ├── subscriber.py          # MQTT subscriber
│   ├── publisher.py           # MQTT publisher
│   └── models.py              # Telemetry data models
│
├── utils/                     # Utilities
│   └── helpers.py             # Logging and utilities
│
├── models/                    # AI models (created by setup script)
│   └── tinyllama.gguf         # TinyLlama Q4 model (~637 MB)
│
└── logs/                      # Log files (created automatically)
    └── edge_ai_YYYYMMDD.log
```

---

## ⚙️ Configuration

Edit `config.py` to customize settings:

### MQTT Settings
```python
MQTT_BROKER_HOST = "172.17.55.214"  # MQTT broker address
MQTT_BROKER_PORT = 1883
MQTT_TOPIC_SENSOR = "battlefield/sensor"
MQTT_TOPIC_RESPONSE = "battlefield/ai-response"
```

### AI Settings
```python
MODEL_PATH = "models/tinyllama.gguf"
MAX_TOKENS = 50
TEMPERATURE = 0.5
THREADS = 2
INFERENCE_TIMEOUT = 5
```

### Threat Analysis Thresholds
```python
CRITICAL_DISTANCE = 100      # Enemy distance for CRITICAL threat (meters)
STRESS_HEART_RATE = 120      # Heart rate threshold for HIGH stress (bpm)
HOSTAGE_RISK_DISTANCE = 50   # Hostage proximity for ELEVATED risk (meters)
```

---

## 📡 MQTT Topics and Payloads

### Incoming Telemetry (`battlefield/sensor`)

```json
{
  "timestamp": 1732452123456,
  "tick": 47,
  "squad": [
    {
      "id": "alpha",
      "callsign": "ALPHA-1",
      "lat": 12.9795,
      "lng": 77.5925,
      "heartRate": 60,
      "battery": 89.9,
      "status": "nominal"
    },
    {
      "id": "charlie",
      "callsign": "CHARLIE-3",
      "lat": 12.9792,
      "lng": 77.5928,
      "heartRate": 77,
      "battery": 88.6,
      "status": "nominal"
    }
  ],
  "enemy": {
    "callsign": "HOSTILE-A",
    "lat": 12.9798,
    "lng": 77.5932
  },
  "hostage": {
    "callsign": "VICTIM-1",
    "lat": 12.9793,
    "lng": 77.5930
  }
}
```

### Outgoing AI Response (`battlefield/ai-response`)

```json
{
  "decision": "Take cover and assess situation",
  "risk_score": 0.87,
  "timestamp": 1778280852338,
  "latency_ms": 2450
}
```

---

## 🧪 Testing

The setup script runs comprehensive tests automatically:

1. **Import Test**: Verifies all Python packages
2. **Model Loading Test**: Loads TinyLlama model
3. **Inference Test**: Generates a tactical decision
4. **Configuration Test**: Validates config.py

### Manual Testing

```bash
# Test MQTT connection
mosquitto_sub -t "battlefield/ai-response" -v

# Send test telemetry (in another terminal)
mosquitto_pub -t "battlefield/sensor" -m '{
  "timestamp": 1732452123456,
  "tick": 47,
  "squad": [
    {
      "id": "alpha",
      "callsign": "ALPHA-1",
      "lat": 12.9795,
      "lng": 77.5925,
      "heartRate": 60,
      "battery": 89.9,
      "status": "nominal"
    },
    {
      "id": "charlie",
      "callsign": "CHARLIE-3",
      "lat": 12.9792,
      "lng": 77.5928,
      "heartRate": 77,
      "battery": 88.6,
      "status": "nominal"
    }
  ],
  "enemy": {
    "callsign": "HOSTILE-A",
    "lat": 12.9798,
    "lng": 77.5932
  },
  "hostage": {
    "callsign": "VICTIM-1",
    "lat": 12.9793,
    "lng": 77.5930
  }
}'
```

---

## 🔄 Pipeline Architecture

```
MQTT Subscriber
    ↓
Telemetry Parser
    ↓
Threat Analyzer (compute risk scores)
    ↓
Prompt Builder (generate LLM prompt)
    ↓
llama.cpp Inference (generate decision)
    ↓
Decision Validator (format & validate)
    ↓
MQTT Publisher
    ↓
Dashboard receives AI feedback
```

---

## 🐛 Troubleshooting

### "externally-managed-environment" Error

The setup script handles this automatically. It will:
- Detect the restriction
- Offer virtual environment (recommended) or system-wide installation
- Install accordingly

### Model Loading Fails

```bash
# Check model file
ls -lh models/tinyllama.gguf

# Should be ~637 MB
# If smaller, re-download:
rm models/tinyllama.gguf
./setup_and_run.sh
```

### MQTT Connection Issues

```bash
# Check Mosquitto is running
sudo systemctl status mosquitto

# Test broker
mosquitto_pub -t test -m "hello"

# Check firewall
sudo ufw status
```

### High CPU Usage

Edit `config.py`:
```python
THREADS = 2              # Reduce if needed
MAX_TOKENS = 40          # Reduce for faster inference
TEMPERATURE = 0.4        # Lower = more deterministic
```

### Inference Too Slow

- Ensure using Q4 quantized model (not Q8 or F16)
- Set `THREADS=2` (optimal for Raspberry Pi 4)
- Reduce `MAX_TOKENS` to 30-40
- Check CPU throttling: `vcgencmd measure_temp`

---

## 🔧 Advanced Usage

### Running as Systemd Service

1. Edit the service file:
```bash
nano edge-ai-copilot.service
```

2. Update paths if using virtual environment:
```ini
[Service]
ExecStart=/home/pi/edge_ai/venv/bin/python3 /home/pi/edge_ai/main.py
```

3. Install and start:
```bash
sudo cp edge-ai-copilot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable edge-ai-copilot
sudo systemctl start edge-ai-copilot
```

4. Check status:
```bash
sudo systemctl status edge-ai-copilot
sudo journalctl -u edge-ai-copilot -f
```

### Manual Installation

If you prefer manual installation:

```bash
# System dependencies
sudo apt-get update
sudo apt-get install -y build-essential cmake libopenblas-dev wget

# Python environment (choose one)
# Option A: Virtual environment
python3 -m venv venv
source venv/bin/activate

# Option B: System-wide
# (add --break-system-packages to pip commands)

# Python packages
pip install paho-mqtt
CMAKE_ARGS="-DLLAMA_BLAS=ON -DLLAMA_BLAS_VENDOR=OpenBLAS" \
  pip install llama-cpp-python --no-cache-dir

# Download model
mkdir -p models
wget https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf -O models/tinyllama.gguf

# Run
python3 main.py
```

---

## 📊 Performance Metrics

**Raspberry Pi 4 (4GB)**:
- Model load time: ~15-20 seconds
- Inference time: ~2-3 seconds
- Total latency: ~2.5-3.5 seconds
- Memory usage: ~1.2 GB
- CPU usage: ~80% during inference

**Optimizations Applied**:
- OpenBLAS acceleration
- Q4 quantization (vs F16)
- Optimized context window (512 tokens)
- Efficient prompt formatting

---

## 🔒 Security Considerations

### MQTT Security

Enable authentication in Mosquitto:
```bash
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

Logs are stored in `logs/edge_ai_YYYYMMDD.log`

```bash
# View logs
tail -f logs/edge_ai_$(date +%Y%m%d).log

# View systemd logs (if running as service)
sudo journalctl -u edge-ai-copilot -f
```

---

## 🤝 Contributing

This is a battlefield edge AI system. Contributions should focus on:
- Performance optimization
- Robustness and error handling
- Security improvements
- Documentation

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🆘 Support

### Quick Commands

```bash
# Setup and run
./setup_and_run.sh

# Run manually (after setup)
python3 main.py

# Run with venv
source venv/bin/activate
python3 main.py

# Check logs
tail -f logs/edge_ai_*.log

# Test MQTT
mosquitto_sub -t "battlefield/ai-response" -v
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "externally-managed-environment" | Run `./setup_and_run.sh` - it handles this |
| Model not found | Run `./setup_and_run.sh` - it downloads automatically |
| Empty LLM response | Check model file size (~637 MB) |
| MQTT connection failed | Check broker IP in `config.py` |
| High latency | Reduce `MAX_TOKENS` in `config.py` |

---

## 🎓 How It Works

1. **Telemetry Reception**: MQTT subscriber receives battlefield data
2. **Threat Analysis**: Calculates distances, risk scores, threat levels
3. **Prompt Building**: Formats tactical situation for LLM
4. **AI Inference**: TinyLlama generates tactical recommendation
5. **Validation**: Ensures decision is concise and actionable
6. **Response Publishing**: Sends decision back via MQTT

**Key Innovation**: Runs entirely on Raspberry Pi with <3s latency using optimized quantized LLM.

---

**Built for autonomous battlefield edge computing** 🎯
