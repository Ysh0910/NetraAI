"""
Configuration management for Edge AI Copilot system.
Centralized system parameters with validation.
"""
import os
from pathlib import Path


class Config:
    """Centralized configuration for Edge AI Copilot"""
    
    # ============================================================================
    # MQTT SETTINGS
    # ============================================================================
    MQTT_BROKER_HOST: str = "172.17.55.214"  # MQTT broker address
    MQTT_BROKER_PORT: int = 1883
    MQTT_TOPIC_SENSOR: str = "battlefield/sensor"
    MQTT_TOPIC_RESPONSE: str = "battlefield/ai-response"
    MQTT_TOPIC_ALERTS: str = "battlefield/alerts"
    MQTT_QOS: int = 1
    MQTT_RECONNECT_DELAY: int = 5
    MQTT_MAX_RECONNECT_DELAY: int = 60
    
    # ============================================================================
    # AI/LLM SETTINGS
    # ============================================================================
    MODEL_PATH: str = "models/tinyllama.gguf"
    MAX_TOKENS: int = 40  # Allow longer intelligent responses
    TEMPERATURE: float = 0.3  # More focused and accurate
    THREADS: int = 2
    INFERENCE_TIMEOUT: int = 10  # Longer timeout for complex questions
    MAX_DECISION_WORDS: int = 25  # Allow up to 25 words for detailed answers
    
    # ============================================================================
    # THREAT ANALYSIS THRESHOLDS
    # ============================================================================
    CRITICAL_DISTANCE: int = 100  # meters
    STRESS_HEART_RATE: int = 120  # bpm
    HOSTAGE_RISK_DISTANCE: int = 50  # meters
    
    # ============================================================================
    # LOGGING
    # ============================================================================
    LOG_DIR: str = "logs"
    LOG_RETENTION_DAYS: int = 7
    
    # ============================================================================
    # CONTEXT STORAGE
    # ============================================================================
    CONTEXT_STORAGE_DIR: str = "storage/context"
    CONTEXT_MEMORY_ITEMS: int = 100  # Items to keep in memory
    CONTEXT_FILE_ITEMS: int = 10000  # Items to keep in file
    CONTEXT_RETENTION_DAYS: int = 7  # Days to keep old session files
    
    @classmethod
    def validate(cls) -> None:
        """
        Validate configuration values and ensure required resources exist.
        Raises ValueError if configuration is invalid.
        """
        # Validate model file exists
        model_path = Path(cls.MODEL_PATH)
        if not model_path.exists():
            raise ValueError(
                f"Model file not found at {cls.MODEL_PATH}. "
                f"Run the setup script to download it."
            )
        
        # Validate numeric ranges
        if cls.MQTT_BROKER_PORT < 1 or cls.MQTT_BROKER_PORT > 65535:
            raise ValueError(f"Invalid MQTT port: {cls.MQTT_BROKER_PORT}")
        
        if cls.MQTT_QOS not in [0, 1, 2]:
            raise ValueError(f"Invalid MQTT QoS level: {cls.MQTT_QOS}")
        
        if cls.MAX_TOKENS < 1 or cls.MAX_TOKENS > 1000:
            raise ValueError(f"Invalid MAX_TOKENS: {cls.MAX_TOKENS}")
        
        if cls.TEMPERATURE < 0.0 or cls.TEMPERATURE > 2.0:
            raise ValueError(f"Invalid TEMPERATURE: {cls.TEMPERATURE}")
        
        if cls.THREADS < 1 or cls.THREADS > 8:
            raise ValueError(f"Invalid THREADS: {cls.THREADS}")
        
        if cls.INFERENCE_TIMEOUT < 1:
            raise ValueError(f"Invalid INFERENCE_TIMEOUT: {cls.INFERENCE_TIMEOUT}")
        
        if cls.CRITICAL_DISTANCE < 1:
            raise ValueError(f"Invalid CRITICAL_DISTANCE: {cls.CRITICAL_DISTANCE}")
        
        if cls.STRESS_HEART_RATE < 1:
            raise ValueError(f"Invalid STRESS_HEART_RATE: {cls.STRESS_HEART_RATE}")
        
        if cls.HOSTAGE_RISK_DISTANCE < 1:
            raise ValueError(f"Invalid HOSTAGE_RISK_DISTANCE: {cls.HOSTAGE_RISK_DISTANCE}")
        
        # Ensure directories exist
        log_dir = Path(cls.LOG_DIR)
        log_dir.mkdir(parents=True, exist_ok=True)
        
        models_dir = Path("models")
        models_dir.mkdir(parents=True, exist_ok=True)
