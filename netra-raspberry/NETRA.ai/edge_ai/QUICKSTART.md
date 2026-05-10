# Edge AI Copilot - Quick Start Guide

## 🚀 One-Command Setup

```bash
chmod +x setup_and_run.sh
./setup_and_run.sh
```

That's it! The script will:
- ✅ Install all dependencies
- ✅ Download the LLM model
- ✅ Run tests
- ✅ Start the copilot

---

## 📋 What You Need

- Raspberry Pi 4 (4GB+ RAM)
- Internet connection (for initial setup)
- MQTT broker running

---

## ⚡ Quick Commands

### First Time Setup
```bash
./setup_and_run.sh
```

### Run After Setup
```bash
# If using virtual environment:
source venv/bin/activate
python3 main.py

# If using system-wide install:
python3 main.py
```

### Test MQTT
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

### View Logs
```bash
tail -f logs/edge_ai_*.log
```

---

## 🔧 Configuration

Edit `config.py` to change:

```python
# MQTT Broker
MQTT_BROKER_HOST = "172.17.55.214"  # Change to your broker IP

# AI Settings
MAX_TOKENS = 50        # Response length
TEMPERATURE = 0.5      # Creativity (0.0-2.0)
THREADS = 2            # CPU threads

# Threat Thresholds
CRITICAL_DISTANCE = 100      # meters
STRESS_HEART_RATE = 120      # bpm
```

---

## 🐛 Troubleshooting

### "externally-managed-environment" error
✅ The setup script handles this automatically

### Model not found
```bash
./setup_and_run.sh  # Re-run setup
```

### MQTT connection failed
```bash
# Check broker is running
sudo systemctl status mosquitto

# Update broker IP in config.py
nano config.py
```

### Slow inference
```python
# Edit config.py
MAX_TOKENS = 40        # Reduce tokens
TEMPERATURE = 0.4      # Lower temperature
```

---

## 📊 Expected Performance

- **Setup time**: 20-35 minutes (first time)
- **Model load**: 15-20 seconds
- **Inference**: 2-3 seconds per decision
- **Memory**: ~1.2 GB

---

## 🎯 Next Steps

1. ✅ Run `./setup_and_run.sh`
2. ✅ Configure MQTT broker in `config.py`
3. ✅ Send test telemetry
4. ✅ Monitor logs
5. ✅ Deploy as systemd service (optional)

---

## 📚 Full Documentation

See `README.md` for complete documentation.

---

**Ready to deploy autonomous battlefield AI!** 🎯
