"""
MQTT Publisher for AI responses.
"""
import json
import logging
import time
import paho.mqtt.client as mqtt

logger = logging.getLogger(__name__)


class MQTTPublisher:
    """
    Publishes AI tactical decisions back to the dashboard via MQTT.
    """
    
    def __init__(self, broker_host: str, broker_port: int, topic: str, qos: int):
        """
        Initialize MQTT publisher.
        
        Args:
            broker_host: MQTT broker hostname or IP
            broker_port: MQTT broker port
            topic: Topic to publish to
            qos: Quality of Service level (0, 1, or 2)
        """
        self.broker_host = broker_host
        self.broker_port = broker_port
        self.topic = topic
        self.qos = qos
        
        # Create MQTT client
        self.client = mqtt.Client()
        self._connected = False
    
    def connect(self) -> None:
        """
        Establish connection to MQTT broker.
        Non-fatal — if publisher can't connect, system continues without publishing responses.
        """
        try:
            logger.info(f"Publisher connecting to MQTT broker at {self.broker_host}:{self.broker_port}")
            self.client.connect(self.broker_host, self.broker_port, keepalive=60)
            self.client.loop_start()
            self._connected = True
            logger.info("Publisher connected to MQTT broker")
        except Exception as e:
            logger.warning(f"Publisher failed to connect: {e}")
            logger.warning("Continuing without MQTT publish — AI decisions will still work locally")
            self._connected = False  # Don't raise — let system continue
    
    def publish_response(self, decision: str, risk_score: float, 
                        timestamp: int, latency_ms: int = 0,
                        replying_to_unit: str = None,
                        replying_to_message: str = None,
                        original_timestamp: int = None,
                        threat_level: str = "unknown") -> bool:
        """
        Publish tactical decision to dashboard.
        
        Args:
            decision: Tactical recommendation text
            risk_score: Computed risk score (0.0 to 1.0)
            timestamp: Unix timestamp
            latency_ms: Processing latency in milliseconds
            replying_to_unit: Unit being replied to (if voice message present)
            replying_to_message: Original message being replied to
            original_timestamp: Timestamp of original voice message
            threat_level: Threat level assessment
            
        Returns:
            True if published successfully, False otherwise
        """
        if not self._connected:
            logger.error("Publisher not connected to broker")
            return False
        
        # Construct JSON payload with new format
        payload = {
            "timestamp": timestamp,
            "source": "NETRA-EdgeAI",
            "type": "ai_response",
            "decision": decision,
            "context": {
                "risk_score": round(risk_score, 2),
                "threat_level": threat_level,
                "latency_ms": latency_ms
            }
        }
        
        # Add voice message context if present
        if replying_to_unit:
            payload["context"]["replying_to_unit"] = replying_to_unit
        if replying_to_message:
            payload["context"]["replying_to_message"] = replying_to_message
        if original_timestamp:
            payload["context"]["original_timestamp"] = original_timestamp
        
        payload_json = json.dumps(payload)
        
        # Publish with retry logic
        max_retries = 3
        retry_delay = 1  # seconds
        
        for attempt in range(1, max_retries + 1):
            try:
                result = self.client.publish(
                    self.topic,
                    payload_json,
                    qos=self.qos
                )
                
                # Wait for publish to complete
                result.wait_for_publish(timeout=2.0)
                
                if result.is_published():
                    logger.info(
                        f"Published response to {self.topic}: {decision[:50]}... "
                        f"(risk: {risk_score:.2f})"
                    )
                    return True
                else:
                    logger.warning(f"Publish attempt {attempt} not confirmed")
                    
            except Exception as e:
                logger.error(f"Publish attempt {attempt} failed: {e}")
            
            # Retry with delay
            if attempt < max_retries:
                logger.info(f"Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
        
        logger.error(f"Failed to publish after {max_retries} attempts")
        return False
    
    def disconnect(self) -> None:
        """
        Gracefully disconnect from broker.
        """
        if self._connected:
            logger.info("Publisher disconnecting from MQTT broker")
            self.client.loop_stop()
            self.client.disconnect()
            self._connected = False
