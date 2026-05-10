# Requirements Document

## Introduction

The Edge AI Copilot is an autonomous battlefield edge AI unit running on Raspberry Pi 4. The system receives simulated telemetry data via MQTT, analyzes battlefield conditions locally using a lightweight LLM (llama.cpp with TinyLlama), generates tactical recommendations, converts them to speech using Piper TTS, and publishes responses back to the dashboard. The system prioritizes low latency, reliability, modular architecture, and lightweight execution suitable for edge deployment.

## Glossary

- **Edge AI Node**: The Raspberry Pi system that processes battlefield telemetry locally
- **MQTT Broker**: Message broker (Mosquitto) facilitating pub/sub communication between dashboard and Edge AI Node
- **Telemetry Payload**: JSON-formatted sensor data containing soldier, enemy, hostage positions and environmental data
- **Threat Analyzer**: Component that computes risk scores from telemetry before AI inference
- **Tactical Decision**: Short actionable battlefield recommendation (under 20 words)
- **Piper TTS**: Text-to-speech engine for voice output
- **llama.cpp**: Lightweight LLM inference engine
- **TinyLlama**: Quantized language model (Q4 GGUF format)
- **Dashboard**: Backend system that publishes telemetry and receives AI responses

## Requirements

### Requirement 1

**User Story:** As a battlefield operator, I want the Edge AI Node to continuously receive telemetry data from the dashboard, so that real-time battlefield conditions are available for analysis.

#### Acceptance Criteria

1. WHEN the Edge AI Node starts, THE MQTT Subscriber SHALL establish connection to the MQTT Broker on topic "battlefield/sensor"
2. WHILE connected to the MQTT Broker, THE MQTT Subscriber SHALL listen continuously for incoming telemetry messages
3. IF the MQTT Broker connection fails, THEN THE MQTT Subscriber SHALL attempt reconnection every 5 seconds with exponential backoff up to 60 seconds
4. WHEN a telemetry message is received, THE MQTT Subscriber SHALL decode the JSON payload and validate required fields (timestamp, soldier, enemy, hostage, environment, threat_level)
5. IF a malformed JSON payload is received, THEN THE MQTT Subscriber SHALL log the error and continue listening without crashing

### Requirement 2

**User Story:** As a battlefield operator, I want the system to analyze threat levels from telemetry data, so that critical situations are prioritized before AI processing.

#### Acceptance Criteria

1. WHEN telemetry data is received, THE Threat Analyzer SHALL compute enemy distance from soldier position using Euclidean distance formula
2. IF enemy distance is less than 100 meters, THEN THE Threat Analyzer SHALL classify threat level as CRITICAL
3. IF soldier heart rate exceeds 120 bpm, THEN THE Threat Analyzer SHALL flag soldier stress state as HIGH
4. WHEN hostage position is within 50 meters of enemy position, THE Threat Analyzer SHALL flag hostage risk as ELEVATED
5. THE Threat Analyzer SHALL compute a normalized risk score between 0.0 and 1.0 based on distance, heart rate, and hostage proximity

### Requirement 3

**User Story:** As a battlefield operator, I want the system to generate compact prompts for the LLM, so that inference remains fast and responses stay tactical.

#### Acceptance Criteria

1. WHEN threat analysis is complete, THE Prompt Builder SHALL construct a prompt containing enemy distance, soldier stress level, environment type, and hostage status
2. THE Prompt Builder SHALL limit prompt length to maximum 150 characters excluding system instruction
3. THE Prompt Builder SHALL include the system instruction "You are a battlefield tactical AI. Generate one short tactical recommendation."
4. THE Prompt Builder SHALL format numerical values with appropriate units (meters for distance, bpm for heart rate)

### Requirement 4

**User Story:** As a battlefield operator, I want the system to generate tactical decisions using local AI inference, so that recommendations are available without network dependency.

#### Acceptance Criteria

1. WHEN the Edge AI Node initializes, THE Inference Engine SHALL load the TinyLlama GGUF model from the models directory once
2. WHEN a prompt is ready, THE Inference Engine SHALL execute llama.cpp inference with max_tokens set to 40, temperature set to 0.4, and threads set to 2
3. THE Inference Engine SHALL complete inference within 3 seconds for 95% of requests
4. THE Inference Engine SHALL extract the tactical decision text from the model output
5. IF inference fails or times out, THEN THE Inference Engine SHALL invoke rule-based fallback logic based on threat level

### Requirement 5

**User Story:** As a battlefield operator, I want tactical decisions to be concise and actionable, so that they can be quickly understood and executed.

#### Acceptance Criteria

1. THE Tactical Decision Generator SHALL ensure output contains maximum 20 words
2. THE Tactical Decision Generator SHALL validate that output contains at least one action verb (move, take, hold, retreat, advance, etc.)
3. THE Tactical Decision Generator SHALL reject outputs containing narrative phrases like "appears to be" or "seems like"
4. IF the AI output exceeds 20 words, THEN THE Tactical Decision Generator SHALL truncate at the last complete sentence within the limit

### Requirement 6

**User Story:** As a battlefield operator, I want tactical decisions converted to voice output, so that hands-free operation is supported in the field.

#### Acceptance Criteria

1. WHEN a tactical decision is generated, THE TTS Engine SHALL convert the text to speech using Piper TTS
2. THE TTS Engine SHALL save the audio output as a temporary WAV file in the system temp directory
3. THE TTS Engine SHALL play the audio through the default audio output device
4. THE TTS Engine SHALL complete text-to-speech conversion within 2 seconds
5. AFTER audio playback completes, THE TTS Engine SHALL delete the temporary WAV file

### Requirement 7

**User Story:** As a dashboard operator, I want to receive AI-generated tactical decisions via MQTT, so that I can monitor edge AI recommendations in real-time.

#### Acceptance Criteria

1. WHEN a tactical decision is generated, THE MQTT Publisher SHALL construct a JSON response containing decision text, risk_score, and timestamp
2. THE MQTT Publisher SHALL publish the response to topic "battlefield/ai-response"
3. THE MQTT Publisher SHALL ensure message delivery with QoS level 1 (at least once delivery)
4. IF publishing fails, THEN THE MQTT Publisher SHALL retry up to 3 times with 1-second intervals

### Requirement 8

**User Story:** As a system administrator, I want comprehensive logging of system operations, so that I can troubleshoot issues and audit AI decisions.

#### Acceptance Criteria

1. WHEN telemetry is received, THE Logging System SHALL record timestamp, soldier position, enemy position, and threat level
2. WHEN a tactical decision is generated, THE Logging System SHALL record the decision text, risk score, and inference latency
3. IF any component encounters an error, THEN THE Logging System SHALL record error type, stack trace, and timestamp
4. THE Logging System SHALL rotate log files daily and retain logs for 7 days
5. THE Logging System SHALL write logs to the logs directory with filename format "edge_ai_YYYYMMDD.log"

### Requirement 9

**User Story:** As a system administrator, I want the system to handle failures gracefully with fallback mechanisms, so that critical operations continue even when AI components fail.

#### Acceptance Criteria

1. IF llama.cpp inference fails, THEN THE Failsafe Handler SHALL generate a rule-based tactical decision based on threat level
2. WHERE enemy distance is less than 50 meters, THE Failsafe Handler SHALL generate decision "Immediate retreat recommended"
3. WHERE enemy distance is between 50 and 100 meters, THE Failsafe Handler SHALL generate decision "Take cover behind nearby structure"
4. WHERE enemy distance exceeds 100 meters, THE Failsafe Handler SHALL generate decision "Maintain current position and monitor"
5. THE Failsafe Handler SHALL log all fallback activations with reason codes

### Requirement 10

**User Story:** As a system administrator, I want centralized configuration management, so that system parameters can be adjusted without code changes.

#### Acceptance Criteria

1. THE Configuration Manager SHALL load settings from a config.py file at startup
2. THE Configuration Manager SHALL provide MQTT broker host, port, topics, and QoS settings
3. THE Configuration Manager SHALL provide llama.cpp parameters including model path, max_tokens, temperature, and thread count
4. THE Configuration Manager SHALL provide threat analysis thresholds for critical distance, stress heart rate, and hostage proximity
5. THE Configuration Manager SHALL validate all configuration values and raise errors for invalid settings before system startup
