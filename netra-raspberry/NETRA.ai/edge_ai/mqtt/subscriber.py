"""
MQTT Subscriber with automatic reconnection and telemetry parsing.
"""
import logging
import time
from typing import Callable
import paho.mqtt.client as mqtt
from .models import TelemetryData

logger = logging.getLogger(__name__)


class MQTTSubscriber:
    """
    MQTT subscriber for receiving battlefield telemetry with automatic reconnection.
    """
    
    def __init__(self, broker_host: str, broker_port: int, topic: str, 
                 qos: int, on_message_callback: Callable[[TelemetryData, str], None],
                 reconnect_delay: int = 5, max_reconnect_delay: int = 60):
        """
        Initialize MQTT subscriber.
        
        Args:
            broker_host: MQTT broker hostname or IP
            broker_port: MQTT broker port
            topic: Topic to subscribe to
            qos: Quality of Service level (0, 1, or 2)
            on_message_callback: Callback function to invoke with parsed telemetry and raw payload
            reconnect_delay: Initial reconnection delay in seconds
            max_reconnect_delay: Maximum reconnection delay in seconds
        """
        self.broker_host = broker_host
        self.broker_port = broker_port
        self.topic = topic
        self.qos = qos
        self.on_message_callback = on_message_callback
        self.reconnect_delay = reconnect_delay
        self.max_reconnect_delay = max_reconnect_delay
        self.current_reconnect_delay = reconnect_delay
        
        # Create MQTT client
        self.client = mqtt.Client()
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message = self._on_message
        
        self._connected = False
    
    def connect(self) -> None:
        """
        Establish connection to MQTT broker with timeout.
        """
        try:
            logger.info(f"Connecting to MQTT broker at {self.broker_host}:{self.broker_port}")
            self.client.connect(self.broker_host, self.broker_port, keepalive=60)
        except Exception as e:
            logger.error(f"Failed to connect to MQTT broker: {e}")
            logger.error(f"Check that broker at {self.broker_host}:{self.broker_port} is reachable")
            raise
    
    def _on_connect(self, client, userdata, flags, rc) -> None:
        """
        Callback when connection is established.
        
        Args:
            client: MQTT client instance
            userdata: User data
            flags: Connection flags
            rc: Connection result code
        """
        if rc == 0:
            logger.info(f"Connected to MQTT broker successfully")
            self._connected = True
            self.current_reconnect_delay = self.reconnect_delay  # Reset delay
            
            # Subscribe to topic
            client.subscribe(self.topic, qos=self.qos)
            logger.info(f"Subscribed to topic: {self.topic} with QoS {self.qos}")
        else:
            logger.error(f"Connection failed with code {rc}")
            self._connected = False
    
    def _on_disconnect(self, client, userdata, rc) -> None:
        """
        Callback when disconnected from broker.
        
        Args:
            client: MQTT client instance
            userdata: User data
            rc: Disconnection result code
        """
        self._connected = False
        
        if rc != 0:
            logger.warning(f"Unexpected disconnection (code {rc}). Attempting reconnection...")
            self._reconnect_with_backoff()
        else:
            logger.info("Disconnected from MQTT broker")
    
    def _reconnect_with_backoff(self) -> None:
        """
        Attempt reconnection with exponential backoff.
        """
        while not self._connected:
            try:
                logger.info(f"Reconnecting in {self.current_reconnect_delay} seconds...")
                time.sleep(self.current_reconnect_delay)
                
                self.client.reconnect()
                logger.info("Reconnection successful")
                break
                
            except Exception as e:
                logger.error(f"Reconnection failed: {e}")
                
                # Exponential backoff
                self.current_reconnect_delay = min(
                    self.current_reconnect_delay * 2,
                    self.max_reconnect_delay
                )
    
    def _on_message(self, client, userdata, msg) -> None:
        """
        Callback when message is received.
        
        Args:
            client: MQTT client instance
            userdata: User data
            msg: MQTT message
        """
        try:
            payload = msg.payload.decode('utf-8')
            logger.debug(f"Received message on topic {msg.topic}")
            
            # Parse telemetry
            telemetry = TelemetryData.from_json(payload)
            
            if telemetry is None:
                logger.warning("Failed to parse telemetry, skipping message")
                return
            
            # Invoke callback with parsed telemetry AND raw payload
            self.on_message_callback(telemetry, payload)
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")
    
    def start(self) -> None:
        """
        Start the MQTT client loop in non-blocking mode.
        """
        logger.info("Starting MQTT subscriber loop")
        self.client.loop_start()
    
    def stop(self) -> None:
        """
        Stop the MQTT client and disconnect gracefully.
        """
        logger.info("Stopping MQTT subscriber")
        self.client.loop_stop()
        self.client.disconnect()
        self._connected = False
