#!/usr/bin/env python3
"""
Test script to send sample telemetry to the MQTT broker.
Use this to test the complete system end-to-end.
"""
import sys
import os
import json
import time

# Add parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import paho.mqtt.client as mqtt
from edge_ai.config import Config

# Sample telemetry payloads
SAMPLE_PAYLOADS = [
    {
        "timestamp": 1715247600000,
        "tick": 47,
        "squad": [
            {
                "id": "alpha",
                "callsign": "ALPHA-1",
                "lat": 12.9795,
                "lng": 77.5925,
                "heartRate": 86,
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
        },
        "voiceMessage": {
            "unit": "ALPHA-1",
            "message": "Cover me I'm moving",
            "timestamp": 1715247595000,
            "source": "dashboard"
        }
    },
    {
        "timestamp": 1715247610000,
        "tick": 48,
        "squad": [
            {
                "id": "alpha",
                "callsign": "ALPHA-1",
                "lat": 12.9795,
                "lng": 77.5925,
                "heartRate": 120,
                "battery": 85.0,
                "status": "warning"
            },
            {
                "id": "bravo",
                "callsign": "BRAVO-2",
                "lat": 12.9793,
                "lng": 77.5923,
                "heartRate": 95,
                "battery": 70.0,
                "status": "nominal"
            }
        ],
        "enemy": {
            "callsign": "HOSTILE-A",
            "lat": 12.9796,
            "lng": 77.5928
        },
        "hostage": {
            "callsign": "VICTIM-1",
            "lat": 12.9793,
            "lng": 77.5930
        },
        "voiceMessage": {
            "unit": "BRAVO-2",
            "message": "Enemy spotted moving towards hostage",
            "timestamp": 1715247608000,
            "source": "dashboard"
        }
    },
    {
        "timestamp": 1715247620000,
        "tick": 49,
        "squad": [
            {
                "id": "alpha",
                "callsign": "ALPHA-1",
                "lat": 12.9795,
                "lng": 77.5925,
                "heartRate": 75,
                "battery": 80.0,
                "status": "nominal"
            }
        ],
        "enemy": {
            "callsign": "HOSTILE-A",
            "lat": 12.9810,
            "lng": 77.5945
        },
        "hostage": {
            "callsign": "VICTIM-1",
            "lat": 12.9793,
            "lng": 77.5930
        }
    }
]


def on_connect(client, userdata, flags, rc):
    """Callback when connected to broker."""
    if rc == 0:
        print("✅ Connected to MQTT broker")
    else:
        print(f"❌ Connection failed with code {rc}")


def on_publish(client, userdata, mid):
    """Callback when message is published."""
    print(f"✅ Message published (mid: {mid})")


def on_message(client, userdata, msg):
    """Callback when response is received."""
    print("\n" + "="*80)
    print("📥 RESPONSE RECEIVED")
    print("="*80)
    print(f"Topic: {msg.topic}")
    print(f"Payload: {msg.payload.decode()}")
    
    try:
        response = json.loads(msg.payload.decode())
        print("\nParsed Response:")
        print(f"  Source     : {response.get('source', 'N/A')}")
        print(f"  Type       : {response.get('type', 'N/A')}")
        print(f"  Decision   : {response.get('decision', 'N/A')}")
        print(f"  Timestamp  : {response.get('timestamp', 'N/A')}")
        
        context = response.get('context', {})
        print(f"\nContext:")
        print(f"  Risk Score : {context.get('risk_score', 'N/A')}")
        print(f"  Threat     : {context.get('threat_level', 'N/A')}")
        print(f"  Latency    : {context.get('latency_ms', 'N/A')}ms")
        
        if 'replying_to_unit' in context:
            print(f"\nReplying To:")
            print(f"  Unit       : {context.get('replying_to_unit', 'N/A')}")
            print(f"  Message    : \"{context.get('replying_to_message', 'N/A')}\"")
            print(f"  Original TS: {context.get('original_timestamp', 'N/A')}")
    except:
        pass
    
    print("="*80 + "\n")


def main():
    """Main entry point."""
    print("\n" + "="*80)
    print("  MQTT TEST PUBLISHER")
    print("="*80)
    print(f"Broker: {Config.MQTT_BROKER_HOST}:{Config.MQTT_BROKER_PORT}")
    print(f"Publish Topic: {Config.MQTT_TOPIC_SENSOR}")
    print(f"Subscribe Topic: {Config.MQTT_TOPIC_RESPONSE}")
    print("="*80 + "\n")
    
    # Create MQTT client
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_publish = on_publish
    client.on_message = on_message
    
    try:
        # Connect to broker
        print(f"Connecting to {Config.MQTT_BROKER_HOST}:{Config.MQTT_BROKER_PORT}...")
        client.connect(Config.MQTT_BROKER_HOST, Config.MQTT_BROKER_PORT, 60)
        
        # Subscribe to response topic
        client.subscribe(Config.MQTT_TOPIC_RESPONSE, qos=1)
        print(f"Subscribed to {Config.MQTT_TOPIC_RESPONSE}")
        
        # Start network loop
        client.loop_start()
        
        # Wait for connection
        time.sleep(2)
        
        # Send test payloads
        for i, payload in enumerate(SAMPLE_PAYLOADS, 1):
            print(f"\n📤 Sending test payload {i}/{len(SAMPLE_PAYLOADS)}...")
            payload_json = json.dumps(payload)
            
            result = client.publish(
                Config.MQTT_TOPIC_SENSOR,
                payload_json,
                qos=1
            )
            
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                print(f"✅ Payload {i} sent successfully")
                print(f"   Tick: {payload['tick']}")
                print(f"   Squad: {len(payload['squad'])} members")
                if 'voiceMessage' in payload:
                    print(f"   Voice: \"{payload['voiceMessage']['message']}\" from {payload['voiceMessage']['unit']}")
                print(f"   Enemy distance: ~{payload['enemy']['lat'] - payload['squad'][0]['lat']:.4f}° lat")
            else:
                print(f"❌ Failed to send payload {i}")
            
            # Wait between messages
            if i < len(SAMPLE_PAYLOADS):
                print(f"\nWaiting 5 seconds before next message...")
                time.sleep(5)
        
        # Wait for responses
        print(f"\n⏳ Waiting 10 seconds for responses...")
        time.sleep(10)
        
        # Cleanup
        client.loop_stop()
        client.disconnect()
        
        print("\n✅ Test complete!")
        print("="*80 + "\n")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        client.loop_stop()
        client.disconnect()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
