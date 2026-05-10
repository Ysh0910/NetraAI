# Design Document

## Overview

The Edge AI Copilot is a modular Python-based system designed for Raspberry Pi 4 that processes battlefield telemetry in real-time. The architecture follows a pipeline pattern where MQTT messages flow through threat analysis, AI inference, and voice output stages. The system uses llama.cpp for lightweight LLM inference, Piper TTS for voice synthesis, and MQTT for bidirectional communication with the dashboard.

Key design principles:
- **Modularity**: Each component (MQTT, AI, TTS) is isolated for independent testing and maintenance
- **Low Latency**: Asynchronous processing and model preloading minimize response time
- **Resilience**: Automatic reconnection, fallback logic, and graceful error handling ensure continuous operation
- **Resource Efficiency**: Quantized models, limited token generation, and optimized threading for Raspberry Pi constraints

## Architecture

### System Context Diagram

```
┌─────────────────┐
│   Dashboard     │
│   (Backend)     │
└────────┬────────┘
         │ MQTT Publish (battlefield/sensor)
         │ MQTT Subscribe (battlefield/ai-response)
         ↓
┌─────────────────────────────────────────┐
│      Raspberry Pi Edge AI Node          │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │     MQTT Subscriber              │  │
│  └──────────┬───────────────────────┘  │
│             ↓                           │
│  ┌──────────────────────────────────┐  │
│  │     Telemetry Parser             │  │
│  └──────────┬───────────────────────┘  │
│             ↓                           │
│  ┌──────────────────────────────────┐  │
│  │     Threat Analyzer              │  │
│  └──────────┬───────────────────────┘  │
│             ↓                           │
│  ┌──────────────────────────────────┐  │
│  │     Prompt Builder               │  │
│  └──────────┬───────────────────────┘  │
│             ↓                           │
│  ┌──────────────────────────────────┐  │
│  │     Inference Engine             │  │
│  │     (llama.cpp)                  │  │
│  └──────────┬───────────────────────┘  │
│             ↓                           │
│  ┌──────────────────────────────────┐  │
│  │  Tactical Decision Generator     │  │
│  └──────────┬───────────────────────┘  │
│             ↓                           │
│  ┌──────────────────────────────────┐  │
│  │     TTS Engine (Piper)           │  │
│  └──────────┬───────────────────────┘  │
│             ↓                           │
│  ┌──────────────────────────────────┐  │
│  │     MQTT Publisher               │  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
         │
         ↓
   Audio Output
```

### Component Architecture

The system is organized into four primary modules:

1. **MQTT Module** (`mqtt/`): Handles all message broker communication
2. **AI Module** (`ai/`): Threat analysis, prompt building, and inference
3. **Voice Module** (`voice/`): Text-to-speech conversion
4. **Main Orchestrator** (`main.py`): Coordinates the pipeline and manages lifecycle

## Components and Interfaces

### 1. Configuration Manager (`config.py`)

**Responsibility**: Centralized configuration storage and validation

**Interface**:
```python
class Config:
    # MQTT Settings
    MQTT_BROKER_HOST: str = "localhost"
    MQTT_BROKER_PORT: int = 1883
    MQTT_TOPIC_SENSOR: str = "battlefield/sensor"
    MQTT_TOPIC_RESPONSE: str = "battlefield/ai-response"
    MQTT_TOPIC_ALERTS: str = "battlefield/alerts"
    MQTT_QOS: int = 1
    MQTT_RECONNECT_DELAY: int = 5
    MQTT_MAX_RECONNECT_DELAY: int = 60
    
    # AI Settings
    MODEL_PATH: str = "models/tinyllama.gguf"
    MAX_TOKENS: int = 40
    TEMPERATURE: float = 0.4
    THREADS: int = 2
    INFERENCE_TIMEOUT: int = 3
    MAX_DECISION_WORDS: int = 20
    
    # Threat Analysis Thresholds
    CRITICAL_DISTANCE: int = 100  # meters
    STRESS_HEART_RATE: int = 120  # bpm
    HOSTAGE_RISK_DISTANCE: int = 50  # meters
    
    # TTS Settings
    TTS_MODEL: str = "en_US-lessac-medium"
    TTS_TIMEOUT: int = 2
    
    # Logging
    LOG_DIR: str = "logs"
    LOG_RETENTION_DAYS: int = 7
    
    @classmethod
    def validate(cls) -> None:
        """Validate configuration values"""
        # Check model file exists
        # Validate numeric ranges
        # Ensure directories exist
```

### 2. MQTT Subscriber (`mqtt/subscriber.py`)

**Responsibility**: Receive telemetry from dashboard with automatic reconnection

**Interface**:
```python
class MQTTSubscriber:
    def __init__(self, broker_host: str, broker_port: int, 
                 topic: str, on_message_callback: Callable):
        """Initialize MQTT client with connection parameters"""
        
    def connect(self) -> None:
        """Establish connection to MQTT broker with retry logic"""
        
    def on_connect(self, client, userdata, flags, rc) -> None:
        """Handle connection event and subscribe to topic"""
        
    def on_disconnect(self, client, userdata, rc) -> None:
        """Handle disconnection and trigger reconnection"""
        
    def on_message(self, client, userdata, msg) -> None:
        """Parse incoming message and invoke callback"""
        
    def start(self) -> None:
        """Start the MQTT client loop in non-blocking mode"""
        
    def stop(self) -> None:
        """Gracefully disconnect and cleanup"""
```

**Design Decisions**:
- Use `paho-mqtt` library for robust MQTT client implementation
- Non-blocking loop (`loop_start()`) to avoid blocking main thread
- Exponential backoff for reconnection attempts
- JSON validation before invoking callback to prevent downstream errors

### 3. Telemetry Parser (`mqtt/subscriber.py`)

**Responsibility**: Validate and parse JSON telemetry payloads

**Interface**:
```python
@dataclass
class Position:
    x: float
    y: float

@dataclass
class TelemetryData:
    timestamp: int
    soldier: Position
    enemy: Position
    hostage: Position
    environment: str
    threat_level: str
    
    @staticmethod
    def from_json(payload: str) -> Optional['TelemetryData']:
        """Parse and validate JSON payload"""
        # Returns None if malformed
```

**Design Decisions**:
- Use Python `dataclass` for type safety and validation
- Return `Optional` to handle malformed data gracefully
- Log parsing errors without crashing the subscriber

### 4. Threat Analyzer (`ai/threat_analysis.py`)

**Responsibility**: Compute risk scores and classify threat levels

**Interface**:
```python
@dataclass
class ThreatAssessment:
    risk_score: float  # 0.0 to 1.0
    threat_level: str  # CRITICAL, HIGH, MEDIUM, LOW
    enemy_distance: float
    soldier_stress: str  # HIGH, NORMAL
    hostage_risk: str  # ELEVATED, NORMAL
    
class ThreatAnalyzer:
    def __init__(self, critical_distance: int, stress_hr: int, 
                 hostage_distance: int):
        """Initialize with threshold configuration"""
        
    def analyze(self, telemetry: TelemetryData) -> ThreatAssessment:
        """Compute threat assessment from telemetry"""
        # Calculate Euclidean distance
        # Classify threat level
        # Compute normalized risk score
```

**Risk Score Formula**:
```
distance_factor = max(0, 1 - (enemy_distance / 200))  # 0-1 scale
stress_factor = 1.0 if heart_rate > threshold else 0.0
hostage_factor = 1.0 if hostage_distance < threshold else 0.0

risk_score = (distance_factor * 0.6) + (stress_factor * 0.2) + (hostage_factor * 0.2)
```

### 5. Prompt Builder (`ai/prompt_builder.py`)

**Responsibility**: Generate compact prompts for LLM inference

**Interface**:
```python
class PromptBuilder:
    SYSTEM_INSTRUCTION = "You are a battlefield tactical AI. Generate one short tactical recommendation."
    
    def build_prompt(self, telemetry: TelemetryData, 
                     assessment: ThreatAssessment) -> str:
        """Construct prompt from telemetry and threat assessment"""
        # Format: system instruction + context + constraints
```

**Prompt Template**:
```
You are a battlefield tactical AI. Generate one short tactical recommendation.
Enemy distance: {distance}m.
Soldier stress: {stress_level}.
Hostage proximity: {hostage_status}.
Environment: {environment}.
```

**Design Decisions**:
- Keep prompts under 150 characters (excluding system instruction)
- Include only essential context to minimize token usage
- Use consistent formatting for reliable model behavior

### 6. Inference Engine (`ai/inference.py`)

**Responsibility**: Execute llama.cpp inference with model management

**Interface**:
```python
class InferenceEngine:
    def __init__(self, model_path: str, max_tokens: int, 
                 temperature: float, threads: int, timeout: int):
        """Initialize and preload the GGUF model"""
        
    def generate(self, prompt: str) -> Optional[str]:
        """Execute inference and return tactical decision"""
        # Use subprocess to call llama.cpp CLI
        # OR use llama-cpp-python bindings
        # Enforce timeout
        # Return None on failure
        
    def cleanup(self) -> None:
        """Release model resources"""
```

**Design Decisions**:
- **Option A**: Use `llama-cpp-python` bindings for direct Python integration
  - Pros: Better performance, no subprocess overhead
  - Cons: Requires compilation on Raspberry Pi
- **Option B**: Use subprocess to call `llama.cpp` CLI
  - Pros: Simpler deployment, no compilation needed
  - Cons: Slightly higher latency due to process spawning

**Recommended**: Use `llama-cpp-python` for production deployment

**Inference Parameters**:
- `n_threads=2`: Optimal for Raspberry Pi 4 quad-core
- `max_tokens=40`: Limits response length
- `temperature=0.4`: Balances creativity and determinism
- `top_p=0.9`: Nucleus sampling for quality
- `repeat_penalty=1.1`: Reduces repetition

### 7. Tactical Decision Generator (`ai/inference.py`)

**Responsibility**: Validate and format AI outputs

**Interface**:
```python
class TacticalDecisionGenerator:
    ACTION_VERBS = ["move", "take", "hold", "retreat", "advance", 
                    "cover", "engage", "disengage", "reposition"]
    
    def validate_decision(self, raw_output: str) -> str:
        """Validate and clean AI output"""
        # Check word count
        # Verify action verb presence
        # Remove narrative phrases
        # Truncate if needed
        
    def format_decision(self, decision: str) -> str:
        """Ensure proper capitalization and punctuation"""
```

**Validation Rules**:
1. Maximum 20 words
2. Must contain at least one action verb
3. No phrases like "appears", "seems", "might be"
4. Proper sentence structure (capitalize first word, end with period)

### 8. TTS Engine (`voice/tts.py`)

**Responsibility**: Convert text to speech using Piper TTS

**Interface**:
```python
class TTSEngine:
    def __init__(self, model_name: str, timeout: int):
        """Initialize Piper TTS with voice model"""
        
    def speak(self, text: str) -> bool:
        """Convert text to speech and play audio"""
        # Generate WAV file
        # Play using system audio
        # Cleanup temp file
        # Return success status
        
    def _generate_audio(self, text: str, output_path: str) -> None:
        """Call Piper CLI to generate WAV"""
        
    def _play_audio(self, audio_path: str) -> None:
        """Play audio using pygame or system command"""
```

**Design Decisions**:
- Use Piper CLI via subprocess for simplicity
- Store temporary WAV files in `/tmp` directory
- Use `pygame.mixer` for audio playback (cross-platform)
- Alternative: Use `aplay` on Raspberry Pi OS for lower overhead

**Piper Command**:
```bash
echo "text" | piper --model en_US-lessac-medium --output_file output.wav
aplay output.wav
```

### 9. MQTT Publisher (`mqtt/publisher.py`)

**Responsibility**: Publish AI responses back to dashboard

**Interface**:
```python
class MQTTPublisher:
    def __init__(self, broker_host: str, broker_port: int, 
                 topic: str, qos: int):
        """Initialize MQTT publisher client"""
        
    def connect(self) -> None:
        """Establish connection to broker"""
        
    def publish_response(self, decision: str, risk_score: float, 
                        timestamp: int) -> bool:
        """Publish tactical decision to dashboard"""
        # Construct JSON payload
        # Publish with retry logic
        # Return success status
        
    def disconnect(self) -> None:
        """Gracefully disconnect"""
```

**Response Payload Format**:
```json
{
  "decision": "Move to cover immediately",
  "risk_score": 0.87,
  "timestamp": 1710000000,
  "latency_ms": 245
}
```

### 10. Failsafe Handler (`ai/inference.py`)

**Responsibility**: Provide rule-based fallback when AI fails

**Interface**:
```python
class FailsafeHandler:
    def generate_fallback(self, assessment: ThreatAssessment) -> str:
        """Generate rule-based tactical decision"""
        # Use threat level and distance
        # Return predefined tactical advice
```

**Fallback Rules**:
```python
if enemy_distance < 50:
    return "Immediate retreat recommended"
elif enemy_distance < 100:
    return "Take cover behind nearby structure"
else:
    return "Maintain current position and monitor"
```

### 11. Logging System (`utils/helpers.py`)

**Responsibility**: Structured logging with rotation

**Interface**:
```python
def setup_logging(log_dir: str, retention_days: int) -> logging.Logger:
    """Configure logging with daily rotation"""
    # Create rotating file handler
    # Set format: timestamp | level | component | message
    # Configure retention policy
```

**Log Format**:
```
2024-05-06 14:32:15 | INFO | MQTTSubscriber | Connected to broker
2024-05-06 14:32:16 | INFO | ThreatAnalyzer | Risk score: 0.87, Level: CRITICAL
2024-05-06 14:32:17 | INFO | InferenceEngine | Decision generated in 1.2s
2024-05-06 14:32:18 | ERROR | InferenceEngine | Timeout exceeded, using fallback
```

### 12. Main Orchestrator (`main.py`)

**Responsibility**: Initialize components and coordinate pipeline

**Interface**:
```python
class EdgeAICopilot:
    def __init__(self, config: Config):
        """Initialize all components"""
        
    def on_telemetry_received(self, telemetry: TelemetryData) -> None:
        """Pipeline handler for incoming telemetry"""
        # 1. Analyze threat
        # 2. Build prompt
        # 3. Generate decision (with fallback)
        # 4. Speak decision
        # 5. Publish response
        # 6. Log everything
        
    def start(self) -> None:
        """Start MQTT subscriber and enter main loop"""
        
    def stop(self) -> None:
        """Graceful shutdown"""
```

## Data Models

### Telemetry Data
```python
{
  "timestamp": int,           # Unix timestamp
  "soldier": {
    "x": float,              # Position in meters
    "y": float,
    "heart_rate": int        # BPM
  },
  "enemy": {
    "x": float,
    "y": float,
    "distance": float        # Pre-computed or computed
  },
  "hostage": {
    "x": float,
    "y": float
  },
  "environment": str,        # "urban", "rural", "forest", etc.
  "threat_level": str        # "high", "medium", "low"
}
```

### AI Response
```python
{
  "decision": str,           # Tactical recommendation
  "risk_score": float,       # 0.0 to 1.0
  "timestamp": int,          # Unix timestamp
  "latency_ms": int          # Processing time
}
```

### Threat Assessment (Internal)
```python
{
  "risk_score": float,
  "threat_level": str,
  "enemy_distance": float,
  "soldier_stress": str,
  "hostage_risk": str
}
```

## Error Handling

### MQTT Connection Failures
- **Strategy**: Exponential backoff reconnection
- **Implementation**: Start with 5s delay, double each attempt, cap at 60s
- **Logging**: Log each reconnection attempt with reason code

### Malformed JSON
- **Strategy**: Log and skip
- **Implementation**: Try-except around JSON parsing, return None
- **Logging**: Log payload snippet (first 100 chars) for debugging

### Inference Timeout
- **Strategy**: Fallback to rule-based decision
- **Implementation**: Use `subprocess.run()` with timeout parameter
- **Logging**: Log timeout event and fallback activation

### TTS Failure
- **Strategy**: Continue without voice output
- **Implementation**: Catch exceptions in `speak()`, return False
- **Logging**: Log TTS error but don't block pipeline

### Model Loading Failure
- **Strategy**: Fail fast at startup
- **Implementation**: Validate model file exists in `__init__`
- **Logging**: Log error and exit with code 1

## Testing Strategy

### Unit Tests

**MQTT Module**:
- Test connection retry logic with mock broker
- Test JSON parsing with valid/invalid payloads
- Test callback invocation

**Threat Analyzer**:
- Test distance calculation with known coordinates
- Test risk score computation with boundary values
- Test threat level classification

**Prompt Builder**:
- Test prompt length constraints
- Test formatting with various telemetry inputs

**Inference Engine**:
- Test timeout handling with slow model
- Test fallback activation
- Test output validation

**TTS Engine**:
- Test audio file generation
- Test cleanup of temporary files

### Integration Tests

**End-to-End Pipeline**:
- Publish test telemetry via MQTT
- Verify AI response is published
- Verify audio output is generated
- Measure end-to-end latency

**Failover Scenarios**:
- Test behavior when model file is missing
- Test behavior when MQTT broker is down
- Test behavior when inference times out

### Performance Tests

**Latency Benchmarks**:
- Measure inference time with various prompt lengths
- Measure TTS generation time
- Measure total pipeline latency (target: <5s)

**Resource Usage**:
- Monitor RAM usage during operation (target: <2GB)
- Monitor CPU usage (target: <80% average)
- Monitor disk I/O for logging

### Manual Testing on Raspberry Pi

**Hardware Validation**:
- Test audio output through HDMI and 3.5mm jack
- Test sustained operation for 1 hour
- Test thermal throttling under load

## Deployment Considerations

### Dependencies Installation
```bash
# System packages
sudo apt-get update
sudo apt-get install -y mosquitto mosquitto-clients python3-pip portaudio19-dev

# Python packages
pip3 install paho-mqtt llama-cpp-python piper-tts pygame

# Download model
wget https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf -O models/tinyllama.gguf
```

### Systemd Service
Create `/etc/systemd/system/edge-ai-copilot.service`:
```ini
[Unit]
Description=Edge AI Copilot
After=network.target mosquitto.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/edge_ai
ExecStart=/usr/bin/python3 main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Configuration Management
- Store `config.py` in version control with defaults
- Use environment variables for deployment-specific overrides
- Document all configuration parameters in README

### Monitoring
- Log rotation via `logrotate`
- Monitor disk space for log directory
- Optional: Send health metrics to dashboard via MQTT

## Performance Optimization

### Model Selection
- **TinyLlama 1.1B Q4**: Best balance of speed and quality
- **Qwen 1.5B Q4**: Alternative with better instruction following
- Avoid Q8 quantization (too slow for Raspberry Pi)

### Inference Optimization
- Preload model at startup (avoid repeated loading)
- Use 2 threads (optimal for Raspberry Pi 4)
- Keep max_tokens low (40 tokens ≈ 30 words)
- Use low temperature (0.4) for deterministic outputs

### Memory Management
- Use `del` to explicitly free large objects
- Avoid storing telemetry history (process and discard)
- Limit log file size with rotation

### Async Processing
- Use `asyncio` for MQTT operations (optional enhancement)
- Run TTS in separate thread to avoid blocking
- Consider multiprocessing for inference (if needed)

## Security Considerations

### MQTT Security
- Use MQTT authentication (username/password)
- Enable TLS for encrypted communication
- Restrict topic access with ACLs

### Input Validation
- Validate all JSON fields before processing
- Sanitize string inputs to prevent injection
- Limit numeric ranges to prevent overflow

### Model Security
- Verify model file integrity with checksums
- Store models in read-only directory
- Avoid loading untrusted model files

## Future Enhancements

### Phase 2 Features
- **Speech Input**: Add Vosk for voice commands
- **Multi-Agent Coordination**: Sync decisions across multiple edge nodes
- **Confidence Scoring**: Add uncertainty quantification to decisions
- **Latency Metrics**: Real-time performance monitoring dashboard
- **Alert System**: Publish critical alerts to separate MQTT topic

### Scalability
- Support multiple simultaneous telemetry streams
- Add Redis for state management across restarts
- Implement message queuing for burst traffic
