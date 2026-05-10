# Quick Start Guide

## First Time Setup

Run the automated setup script (handles everything):
```bash
cd edge_ai
chmod +x setup_and_run.sh
./setup_and_run.sh
```

This will:
1. Check Python version
2. Install dependencies (paho-mqtt, llama-cpp-python)
3. Download TinyLlama model (~637MB)
4. Run system tests
5. Start the copilot

**Time required:** 20-35 minutes (first time only)

---

## Daily Usage

### Start the Copilot

```bash
cd edge_ai
python main.py
```

You should see:
```
╔═══════════════════════════════════════════════════════════════════════╗
║                    EDGE AI COPILOT v2.0.0                             ║
╚═══════════════════════════════════════════════════════════════════════╝

🚀 EDGE AI COPILOT ONLINE
================================================================================
MQTT Broker    : 172.17.55.214:1883
Listening on   : battlefield/sensor
Publishing to  : battlefield/ai-response
LLM Model      : models/tinyllama.gguf
Max Tokens     : 50
Temperature    : 0.5
================================================================================
Waiting for telemetry... (Press Ctrl+C to stop)
```

### Send Test Data

In another terminal:
```bash
cd edge_ai
python test_mqtt_send.py
```

### Stop the Copilot

Press `Ctrl+C` in the terminal running `main.py`

---

## Testing

### Test LLM Only (no MQTT)
```bash
cd edge_ai
python test_llm_generation.py
```

### Test Full System (with MQTT)
```bash
# Terminal 1
python main.py

# Terminal 2
python test_mqtt_send.py
```

---

## Configuration

Edit `edge_ai/config.py` to change:

```python
# MQTT Settings
MQTT_BROKER_HOST: str = "172.17.55.214"  # Your broker IP
MQTT_BROKER_PORT: int = 1883

# LLM Settings
MAX_TOKENS: int = 50        # Response length (30-100)
TEMPERATURE: float = 0.5    # Creativity (0.3-0.7)
THREADS: int = 2            # CPU threads (2-4)
```

---

## Payload Format

Send JSON to topic `battlefield/sensor`:

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
      "heartRate": 85,
      "battery": 89.9,
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

Receive JSON on topic `battlefield/ai-response`:

```json
{
  "decision": "Take cover behind nearby structure.",
  "risk_score": 0.65,
  "timestamp": 1732452123456,
  "latency_ms": 1234
}
```

---

## Troubleshooting

### Model not found
```bash
# Re-download model
mkdir -p models
wget https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf -O models/tinyllama.gguf
```

### MQTT connection fails
```bash
# Test broker connection
mosquitto_pub -h 172.17.55.214 -t test -m "hello"
```

### Dependencies missing
```bash
# Reinstall dependencies
pip install paho-mqtt llama-cpp-python
```

### Check logs
```bash
tail -f logs/edge_ai_*.log
```

---

## Production Deployment (Raspberry Pi)

### Install as systemd service:
```bash
sudo cp edge-ai-copilot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable edge-ai-copilot
sudo systemctl start edge-ai-copilot
```

### Check status:
```bash
sudo systemctl status edge-ai-copilot
```

### View logs:
```bash
sudo journalctl -u edge-ai-copilot -f
```

---

## Performance

**Raspberry Pi 4:**
- Inference: 1-3 seconds
- Total latency: 1.5-4 seconds
- Memory: ~500MB

**Desktop:**
- Inference: 0.5-1 seconds
- Total latency: 0.7-1.5 seconds
- Memory: ~400MB

---

## Support

- Full documentation: `README.md`
- Testing guide: `TESTING.md`
- Payload format: `PAYLOAD_FORMAT.md`
- Context storage: `CONTEXT_STORAGE.md`
- Tech stack: `TECH_STACK.md`
