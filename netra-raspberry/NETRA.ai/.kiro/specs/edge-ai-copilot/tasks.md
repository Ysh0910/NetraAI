# Implementation Plan

- [x] 1. Set up project structure and configuration management
  - Create directory structure (mqtt/, ai/, voice/, utils/, models/, logs/)
  - Implement Config class in config.py with all MQTT, AI, TTS, and threshold settings
  - Add configuration validation method to check model file existence and numeric ranges
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 2. Implement telemetry data models and parsing
  - Create Position and TelemetryData dataclasses with type annotations
  - Implement from_json() static method with JSON validation and error handling
  - Add validation for required fields (timestamp, soldier, enemy, hostage, environment, threat_level)
  - _Requirements: 1.4, 1.5_

- [x] 3. Implement MQTT subscriber with reconnection logic
  - Create MQTTSubscriber class using paho-mqtt library
  - Implement connect() method with connection parameters
  - Implement on_connect() callback to subscribe to battlefield/sensor topic
  - Implement on_disconnect() callback with exponential backoff reconnection (5s to 60s)
  - Implement on_message() callback to parse JSON and invoke telemetry callback
  - Add start() and stop() methods for lifecycle management
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 4. Implement threat analysis engine
  - Create ThreatAssessment dataclass with risk_score, threat_level, enemy_distance, soldier_stress, hostage_risk
  - Implement ThreatAnalyzer class with configurable thresholds
  - Implement analyze() method to compute Euclidean distance between soldier and enemy
  - Add threat level classification logic (CRITICAL if distance < 100m)
  - Add soldier stress detection (HIGH if heart_rate > 120 bpm)
  - Add hostage risk detection (ELEVATED if hostage within 50m of enemy)
  - Implement risk score calculation using weighted formula (distance 60%, stress 20%, hostage 20%)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 5. Implement prompt builder for LLM inference
  - Create PromptBuilder class with system instruction constant
  - Implement build_prompt() method to construct prompts from telemetry and threat assessment
  - Format prompt with enemy distance, soldier stress, hostage status, and environment
  - Enforce prompt length limit of 150 characters (excluding system instruction)
  - Add unit formatting (meters for distance, bpm for heart rate)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 6. Implement LLM inference engine with llama.cpp
  - Create InferenceEngine class with model path, max_tokens, temperature, threads, timeout parameters
  - Implement model loading in **init**() using llama-cpp-python bindings
  - Implement generate() method to execute inference with configured parameters (max_tokens=40, temperature=0.4, threads=2)
  - Add timeout enforcement (3 seconds) using subprocess timeout or threading
  - Extract tactical decision text from model output
  - Implement cleanup() method to release model resources
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 7. Implement failsafe handler for inference failures
  - Create FailsafeHandler class with rule-based decision logic
  - Implement generate_fallback() method using threat assessment
  - Add rule: if enemy_distance < 50m, return "Immediate retreat recommended"
  - Add rule: if 50m <= enemy_distance < 100m, return "Take cover behind nearby structure"
  - Add rule: if enemy_distance >= 100m, return "Maintain current position and monitor"
  - Integrate fallback into InferenceEngine.generate() when inference fails or times out
  - _Requirements: 4.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 8. Implement tactical decision validator and formatter
  - Create TacticalDecisionGenerator class with action verb list
  - Implement validate_decision() method to check word count (max 20 words)
  - Add action verb validation (must contain at least one: move, take, hold, retreat, advance, cover, engage, disengage, reposition)
  - Add narrative phrase rejection (remove "appears", "seems", "might be")
  - Implement truncation logic at last complete sentence if exceeds 20 words
  - Implement format_decision() method for proper capitalization and punctuation
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 9. Implement TTS engine with Piper integration
  - Create TTSEngine class with model name and timeout parameters
  - Implement speak() method to convert text to speech
  - Implement \_generate_audio() method to call Piper CLI and create WAV file in /tmp
  - Implement \_play_audio() method using pygame.mixer or aplay command
  - Add automatic cleanup of temporary WAV files after playback
  - Enforce 2-second timeout for TTS generation
  - Add error handling to return False on failure without blocking pipeline
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 10. Implement MQTT publisher for AI responses
  - Create MQTTPublisher class with broker host, port, topic, and QoS parameters
  - Implement connect() method to establish broker connection
  - Implement publish_response() method to construct JSON payload with decision, risk_score, timestamp, latency_ms
  - Publish to battlefield/ai-response topic with QoS level 1
  - Add retry logic (up to 3 attempts with 1-second intervals) on publish failure
  - Implement disconnect() method for graceful shutdown
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 11. Implement logging system with rotation
  - Create setup_logging() function in utils/helpers.py
  - Configure daily rotating file handler with logs directory
  - Set log format: "timestamp | level | component | message"
  - Implement 7-day retention policy for log files
  - Use filename format "edge_ai_YYYYMMDD.log"
  - Add logging calls for telemetry received (timestamp, positions, threat level)
  - Add logging calls for tactical decisions (decision text, risk score, inference latency)
  - Add logging calls for all errors (error type, stack trace, timestamp)
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 12. Implement main orchestrator and pipeline coordination
  - Create EdgeAICopilot class with config parameter
  - Implement **init**() to initialize all components (MQTT subscriber/publisher, threat analyzer, prompt builder, inference engine, TTS engine, failsafe handler, logger)
  - Implement on_telemetry_received() pipeline handler with steps: parse telemetry, analyze threat, build prompt, generate decision (with fallback), validate decision, speak decision, publish response, log all operations
  - Implement start() method to connect MQTT subscriber and enter main loop
  - Implement stop() method for graceful shutdown of all components
  - Add signal handlers for SIGINT and SIGTERM
  - _Requirements: 1.1, 1.2, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1_

- [x] 13. Create main entry point and startup validation
  - Create main.py entry point with if **name** == "**main**" block
  - Load and validate configuration at startup
  - Verify model file exists before initializing InferenceEngine
  - Initialize EdgeAICopilot instance
  - Start the system and handle keyboard interrupts
  - Add startup logging with system information and configuration summary
  - _Requirements: 10.5, 4.1_

- [x] 14. Create integration test suite
  - Write test to publish mock telemetry via MQTT and verify AI response is received
  - Write test to verify audio file generation and cleanup
  - Write test to measure end-to-end pipeline latency (target: <5s)
  - Write test for MQTT broker disconnection and reconnection
  - Write test for inference timeout and fallback activation
  - Write test for malformed JSON handling
  - _Requirements: 1.3, 1.5, 4.5, 6.5, 7.4, 9.1_

- [x] 15. Create deployment documentation and systemd service

  - Write README.md with system overview, dependencies, and installation instructions
  - Document all configuration parameters in config.py
  - Create systemd service file for automatic startup
  - Add deployment script for Raspberry Pi setup (install dependencies, download model, configure mosquitto)
  - Document MQTT topic structure and payload formats
  - _Requirements: 10.1, 10.2, 10.3, 10.4_
