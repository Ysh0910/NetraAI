# Testing Guide for Edge AI Copilot

This guide explains how to test the Edge AI Copilot system at different levels.

## Prerequisites

Make sure you've run the setup script first:
```bash
./setup_and_run.sh
```

This will:
- Install all dependencies
- Download the TinyLlama model
- Run system tests
- Start the copilot

## Test Levels

### 1. Component Test: LLM Generation Only

Test just the LLM generation pipeline without MQTT:

```bash
cd edge_ai
python test_llm_generation.py
```

**What it tests:**
- Telemetry parsing
- Threat analysis
- Prompt building
- LLM inference
- Decision validation

**Expected output:**
```
✅ All steps completed successfully!

📋 FINAL OUTPUT:
   Decision: Take cover behind nearby structure.
   Risk Score: 0.65
   Threat Level: MODERATE
```

**If it fails:**
- Check that `models/tinyllama.gguf` exists
- Verify Python dependencies are installed
- Check logs in `logs/` directory

---

### 2. System Test: Full Pipeline

Test the complete system including MQTT:

**Terminal 1 - Start the copilot:**
```bash
cd edge_ai
python main.py
```

**Terminal 2 - Send test telemetry:**
```bash
cd edge_ai
python test_mqtt_send.py
```

**What it tests:**
- MQTT connection
- Telemetry reception
- Complete processing pipeline
- Response publishing
- End-to-end latency

**Expected output in Terminal 1:**
```
📡 TELEMETRY RECEIVED
================================================================================
Tick      : 47
Squad     : 1 members
  🟢 ALPHA-1: HR=85bpm, Battery=89.9%
Enemy     : HOSTILE-A at (12.9798, 77.5932)
Hostage   : VICTIM-1 at (12.9793, 77.5930)
--------------------------------------------------------------------------------
🔍 Analyzing threat...
Primary Soldier : alpha
Enemy Distance  : 78.5m
Threat Level    : MODERATE
Risk Score      : 0.65
Squad Status    : NOMINAL
--------------------------------------------------------------------------------
🤖 Generating AI decision...
✅ AI DECISION GENERATED
Decision : Take cover and monitor enemy movement.
Latency  : 1234ms
--------------------------------------------------------------------------------
📤 Sending response to broker...
✅ Response sent successfully
================================================================================
```

**Expected output in Terminal 2:**
```
📥 RESPONSE RECEIVED
================================================================================
Topic: battlefield/ai-response
Payload: {"decision": "Take cover and monitor enemy movement.", "risk_score": 0.65, "timestamp": 1732452123456, "latency_ms": 1234}

Parsed Response:
  Decision   : Take cover and monitor enemy movement.
  Risk Score : 0.65
  Timestamp  : 1732452123456
  Latency    : 1234ms
================================================================================
```

---

### 3. Integration Test: With Real MQTT Broker

If you have a real MQTT broker running:

1. **Update configuration** in `edge_ai/config.py`:
   ```python
   MQTT_BROKER_HOST: str = "your.broker.ip"
   MQTT_BROKER_PORT: int = 1883
   ```

2. **Start the copilot:**
   ```bash
   cd edge_ai
   python main.py
   ```

3. **Send telemetry from your client** to topic `battlefield/sensor`

4. **Receive responses** on topic `battlefield/ai-response`

---

## Troubleshooting

### LLM returns empty responses

**Symptoms:**
- Console shows "⚠️  LLM returned empty, using acknowledgment"
- Always getting "OK, I received your message."

**Solutions:**
1. Check model file exists: `ls -lh models/tinyllama.gguf`
2. Increase max_tokens in `config.py`: `MAX_TOKENS: int = 100`
3. Adjust temperature: `TEMPERATURE: float = 0.7`
4. Check logs: `tail -f logs/edge_ai_*.log`

### MQTT connection fails

**Symptoms:**
- "Publisher failed to connect"
- "Subscriber failed to connect"

**Solutions:**
1. Verify broker is running: `mosquitto -v` (if using local broker)
2. Check broker IP in `config.py`
3. Test connection: `mosquitto_pub -h 172.17.55.214 -t test -m "hello"`
4. Check firewall rules

### Model loading fails

**Symptoms:**
- "Model file not found"
- "Failed to load model"

**Solutions:**
1. Re-run setup: `./setup_and_run.sh`
2. Manually download model:
   ```bash
   mkdir -p models
   wget https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf -O models/tinyllama.gguf
   ```
3. Check disk space: `df -h`

### Slow inference

**Symptoms:**
- Latency > 5 seconds
- System feels sluggish

**Solutions:**
1. Reduce max_tokens: `MAX_TOKENS: int = 30`
2. Increase threads: `THREADS: int = 4`
3. Lower temperature: `TEMPERATURE: float = 0.3`
4. Check CPU usage: `top`

---

## Performance Benchmarks

**Expected performance on Raspberry Pi 4:**
- Model loading: 2-5 seconds
- Inference time: 1-3 seconds
- Total latency: 1.5-4 seconds
- Memory usage: ~500MB

**Expected performance on desktop:**
- Model loading: 1-2 seconds
- Inference time: 0.5-1 seconds
- Total latency: 0.7-1.5 seconds
- Memory usage: ~400MB

---

## Logs

All logs are stored in `logs/` directory:
- `edge_ai_YYYYMMDD.log` - Main application log
- Rotated daily
- Kept for 7 days

**View logs:**
```bash
# Real-time
tail -f logs/edge_ai_*.log

# Search for errors
grep ERROR logs/edge_ai_*.log

# Search for warnings
grep WARNING logs/edge_ai_*.log
```

---

## Context Storage

Telemetry and decisions are stored in `storage/context/`:
- `session_YYYYMMDD_HHMMSS.jsonl` - Session files
- One line per telemetry event
- Kept for 7 days

**Query context:**
```bash
cd edge_ai
python query_context.py
```

---

## Next Steps

Once testing is complete:
1. Deploy to Raspberry Pi
2. Configure as systemd service: `sudo cp edge-ai-copilot.service /etc/systemd/system/`
3. Enable auto-start: `sudo systemctl enable edge-ai-copilot`
4. Start service: `sudo systemctl start edge-ai-copilot`
5. Check status: `sudo systemctl status edge-ai-copilot`
