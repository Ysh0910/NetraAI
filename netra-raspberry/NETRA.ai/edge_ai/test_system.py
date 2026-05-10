#!/usr/bin/env python3
"""
Standalone system test script for Edge AI Copilot.
Tests all components independently.
"""
import sys
import os
import time
import json

# Add both current directory and parent directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)

# If we're in edge_ai directory, add parent to path
if os.path.basename(current_dir) == 'edge_ai':
    sys.path.insert(0, parent_dir)
else:
    # If we're in parent directory, add current to path
    sys.path.insert(0, current_dir)

def print_header(text):
    print("\n" + "="*70)
    print(text)
    print("="*70)

def print_success(text):
    print(f"✓ {text}")

def print_error(text):
    print(f"✗ {text}")

def print_info(text):
    print(f"ℹ {text}")

def test_imports():
    """Test all required imports."""
    print_header("TEST 1: Python Imports")
    
    try:
        import paho.mqtt.client
        print_success("paho-mqtt imported")
    except ImportError as e:
        print_error(f"paho-mqtt import failed: {e}")
        return False
    
    try:
        import llama_cpp
        version = getattr(llama_cpp, '__version__', 'unknown')
        print_success(f"llama-cpp-python imported (version: {version})")
    except ImportError as e:
        print_error(f"llama-cpp-python import failed: {e}")
        return False
    
    return True

def test_config():
    """Test configuration."""
    print_header("TEST 2: Configuration")
    
    try:
        # Try importing from edge_ai package first, then from current directory
        try:
            from edge_ai.config import Config
        except ImportError:
            from config import Config
        
        print_info(f"MQTT Broker: {Config.MQTT_BROKER_HOST}:{Config.MQTT_BROKER_PORT}")
        print_info(f"Model Path: {Config.MODEL_PATH}")
        print_info(f"Max Tokens: {Config.MAX_TOKENS}")
        print_info(f"Temperature: {Config.TEMPERATURE}")
        
        Config.validate()
        print_success("Configuration validated")
        return True
        
    except Exception as e:
        print_error(f"Configuration test failed: {e}")
        return False

def test_model_loading():
    """Test model loading."""
    print_header("TEST 3: Model Loading")
    
    try:
        from llama_cpp import Llama
        try:
            from edge_ai.config import Config
        except ImportError:
            from config import Config
        
        print_info(f"Loading model: {Config.MODEL_PATH}")
        start = time.time()
        
        llm = Llama(
            model_path=Config.MODEL_PATH,
            n_threads=Config.THREADS,
            n_ctx=512,
            verbose=False
        )
        
        load_time = time.time() - start
        print_success(f"Model loaded in {load_time:.2f} seconds")
        
        del llm
        return True
        
    except Exception as e:
        print_error(f"Model loading failed: {e}")
        return False

def test_inference():
    """Test LLM inference."""
    print_header("TEST 4: LLM Inference")
    
    try:
        from llama_cpp import Llama
        try:
            from edge_ai.config import Config
        except ImportError:
            from config import Config
        
        # Load model
        llm = Llama(
            model_path=Config.MODEL_PATH,
            n_threads=Config.THREADS,
            n_ctx=512,
            verbose=False
        )
        
        # Format prompt
        prompt = "<|system|>\nYou are a tactical military AI assistant.</s>\n<|user|>\nEnemy at 50 meters. What action?</s>\n<|assistant|>\n"
        
        print_info("Generating tactical decision...")
        start = time.time()
        
        output = llm(
            prompt,
            max_tokens=Config.MAX_TOKENS,
            temperature=Config.TEMPERATURE,
            top_p=0.9,
            repeat_penalty=1.1,
            stop=["</s>", "<|", "\n\n"],
            echo=False
        )
        
        inference_time = time.time() - start
        
        # Extract response
        if output and 'choices' in output and len(output['choices']) > 0:
            response = output['choices'][0]['text'].strip()
            
            if response and len(response) > 3:
                print_success(f"Generated: {response}")
                print_info(f"Inference time: {inference_time:.2f} seconds")
                
                if 'usage' in output:
                    usage = output['usage']
                    print_info(f"Tokens generated: {usage.get('completion_tokens', 'N/A')}")
                
                del llm
                return True
            else:
                print_error("Empty or invalid response")
                del llm
                return False
        else:
            print_error("No output generated")
            del llm
            return False
            
    except Exception as e:
        print_error(f"Inference test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_threat_analysis():
    """Test threat analysis component."""
    print_header("TEST 5: Threat Analysis")
    
    try:
        try:
            from edge_ai.ai.threat_analysis import ThreatAnalyzer
            from edge_ai.mqtt.models import TelemetryData
            from edge_ai.config import Config
        except ImportError:
            from ai.threat_analysis import ThreatAnalyzer
            from mqtt.models import TelemetryData
            from config import Config
        
        # Create test telemetry
        telemetry_dict = {
            "timestamp": 1732452123456,
            "tick": 47,
            "squad": [
                {
                    "id": "alpha",
                    "callsign": "ALPHA-1",
                    "lat": 12.9795,
                    "lng": 77.5925,
                    "heartRate": 60,
                    "battery": 89.9,
                    "status": "nominal"
                },
                {
                    "id": "charlie",
                    "callsign": "CHARLIE-3",
                    "lat": 12.9792,
                    "lng": 77.5928,
                    "heartRate": 77,
                    "battery": 88.6,
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
        
        telemetry = TelemetryData.from_dict(telemetry_dict)
        
        # Analyze threat
        analyzer = ThreatAnalyzer(
            critical_distance=Config.CRITICAL_DISTANCE,
            stress_heart_rate=Config.STRESS_HEART_RATE,
            hostage_risk_distance=Config.HOSTAGE_RISK_DISTANCE
        )
        
        assessment = analyzer.analyze(telemetry)
        
        print_info(f"Primary soldier: {assessment.primary_soldier_id}")
        print_info(f"Enemy distance: {assessment.enemy_distance:.1f}m")
        print_info(f"Threat level: {assessment.threat_level}")
        print_info(f"Risk score: {assessment.risk_score:.2f}")
        print_info(f"Soldier stress: {assessment.soldier_stress}")
        print_info(f"Hostage risk: {assessment.hostage_risk}")
        print_info(f"Squad status: {assessment.squad_status}")
        
        print_success("Threat analysis completed")
        return True
        
    except Exception as e:
        print_error(f"Threat analysis test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_mqtt_connection():
    """Test MQTT connection."""
    print_header("TEST 6: MQTT Connection")
    
    try:
        import paho.mqtt.client as mqtt
        try:
            from edge_ai.config import Config
        except ImportError:
            from config import Config
        
        connected = [False]
        
        def on_connect(client, userdata, flags, rc):
            if rc == 0:
                connected[0] = True
        
        client = mqtt.Client()
        client.on_connect = on_connect
        
        print_info(f"Connecting to {Config.MQTT_BROKER_HOST}:{Config.MQTT_BROKER_PORT}")
        
        try:
            client.connect(Config.MQTT_BROKER_HOST, Config.MQTT_BROKER_PORT, 60)
            client.loop_start()
            
            # Wait for connection
            timeout = 5
            start = time.time()
            while not connected[0] and (time.time() - start) < timeout:
                time.sleep(0.1)
            
            client.loop_stop()
            client.disconnect()
            
            if connected[0]:
                print_success("MQTT connection successful")
                return True
            else:
                print_error("MQTT connection timeout")
                return False
                
        except Exception as e:
            print_error(f"MQTT connection failed: {e}")
            return False
            
    except Exception as e:
        print_error(f"MQTT test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("\n" + "="*70)
    print("EDGE AI COPILOT - SYSTEM TEST")
    print("="*70)
    print(f"Date: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    tests = [
        ("Imports", test_imports),
        ("Configuration", test_config),
        ("Model Loading", test_model_loading),
        ("LLM Inference", test_inference),
        ("Threat Analysis", test_threat_analysis),
        ("MQTT Connection", test_mqtt_connection),
    ]
    
    results = []
    
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print_error(f"Test '{name}' crashed: {e}")
            results.append((name, False))
    
    # Summary
    print_header("TEST SUMMARY")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"  {status}: {name}")
    
    print()
    print(f"  Total: {passed}/{total} tests passed")
    
    if passed == total:
        print()
        print_success("All tests passed! System is ready.")
        print()
        print_info("To start the copilot:")
        print("  python3 main.py")
        print()
        return 0
    else:
        print()
        print_error(f"{total - passed} test(s) failed. Please review errors above.")
        print()
        print_info("Run the setup script to fix issues:")
        print("  ./setup_and_run.sh")
        print()
        return 1

if __name__ == "__main__":
    sys.exit(main())
