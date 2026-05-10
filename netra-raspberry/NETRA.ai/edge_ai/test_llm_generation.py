#!/usr/bin/env python3
"""
Test script to verify LLM generation is working properly.
Tests the entire pipeline from telemetry to LLM response.
"""
import sys
import os
import json

# Add parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from edge_ai.config import Config
from edge_ai.mqtt.models import TelemetryData
from edge_ai.ai.threat_analysis import ThreatAnalyzer
from edge_ai.ai.prompt_builder import PromptBuilder
from edge_ai.ai.inference import InferenceEngine
from edge_ai.ai.failsafe import FailsafeHandler
from edge_ai.ai.decision_validator import TacticalDecisionGenerator

# Sample telemetry payload
SAMPLE_PAYLOAD = {
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
    },
    "voiceMessage": {
        "unit": "ALPHA-1",
        "message": "Cover me I'm moving",
        "timestamp": 1715247595000,
        "source": "dashboard"
    }
}


def print_section(title):
    """Print a section header."""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)


def test_llm_generation():
    """Test the complete LLM generation pipeline."""
    
    print("\n" + "="*80)
    print("  LLM GENERATION TEST")
    print("="*80)
    
    # Step 1: Parse telemetry
    print_section("STEP 1: Parse Telemetry")
    telemetry = TelemetryData.from_dict(SAMPLE_PAYLOAD)
    
    if not telemetry:
        print("❌ Failed to parse telemetry")
        return False
    
    print("✅ Telemetry parsed successfully")
    print(f"   Tick: {telemetry.tick}")
    print(f"   Squad: {len(telemetry.squad)} members")
    print(f"   Primary: {telemetry.squad[0].callsign}")
    if telemetry.voice_message:
        print(f"   Voice message: \"{telemetry.voice_message.message}\" from {telemetry.voice_message.unit}")
    
    # Step 2: Analyze threat
    print_section("STEP 2: Analyze Threat")
    threat_analyzer = ThreatAnalyzer(
        critical_distance=Config.CRITICAL_DISTANCE,
        stress_heart_rate=Config.STRESS_HEART_RATE,
        hostage_risk_distance=Config.HOSTAGE_RISK_DISTANCE
    )
    
    assessment = threat_analyzer.analyze(telemetry)
    print("✅ Threat analysis complete")
    print(f"   Primary Soldier: {assessment.primary_soldier_id}")
    print(f"   Enemy Distance: {assessment.enemy_distance:.1f}m")
    print(f"   Threat Level: {assessment.threat_level}")
    print(f"   Risk Score: {assessment.risk_score:.2f}")
    print(f"   Squad Status: {assessment.squad_status}")
    
    # Step 3: Build prompt
    print_section("STEP 3: Build Prompt")
    prompt_builder = PromptBuilder()
    prompt = prompt_builder.build_prompt(telemetry, assessment)
    
    print("✅ Prompt built successfully")
    print(f"   Prompt length: {len(prompt)} characters")
    print(f"   Prompt:\n{prompt}")
    
    # Step 4: Initialize LLM
    print_section("STEP 4: Initialize LLM")
    
    try:
        failsafe_handler = FailsafeHandler()
        inference_engine = InferenceEngine(
            model_path=Config.MODEL_PATH,
            max_tokens=Config.MAX_TOKENS,
            temperature=Config.TEMPERATURE,
            threads=Config.THREADS,
            timeout=Config.INFERENCE_TIMEOUT,
            failsafe_handler=failsafe_handler
        )
        print("✅ LLM initialized successfully")
        print(f"   Model: {Config.MODEL_PATH}")
        print(f"   Max tokens: {Config.MAX_TOKENS}")
        print(f"   Temperature: {Config.TEMPERATURE}")
        
    except Exception as e:
        print(f"❌ Failed to initialize LLM: {e}")
        return False
    
    # Step 5: Generate decision
    print_section("STEP 5: Generate Decision")
    print("⏳ Generating decision (this may take a few seconds)...")
    
    try:
        raw_decision = inference_engine.generate(prompt, assessment)
        
        if not raw_decision:
            print("⚠️  LLM returned empty response, using failsafe")
            raw_decision = failsafe_handler.generate_fallback(assessment)
        
        print(f"✅ Raw decision generated: '{raw_decision}'")
        print(f"   Length: {len(raw_decision)} characters")
        
    except Exception as e:
        print(f"❌ Generation failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Step 6: Validate decision
    print_section("STEP 6: Validate Decision")
    validator = TacticalDecisionGenerator()
    final_decision = validator.validate_decision(raw_decision)
    
    print(f"✅ Final decision: '{final_decision}'")
    print(f"   Length: {len(final_decision)} characters")
    print(f"   Word count: {len(final_decision.split())} words")
    
    # Step 7: Summary
    print_section("TEST SUMMARY")
    print("✅ All steps completed successfully!")
    print(f"\n📋 FINAL OUTPUT:")
    print(f"   Decision: {final_decision}")
    print(f"   Risk Score: {assessment.risk_score:.2f}")
    print(f"   Threat Level: {assessment.threat_level}")
    print("="*80 + "\n")
    
    # Cleanup
    inference_engine.cleanup()
    
    return True


def main():
    """Main entry point."""
    try:
        # Validate config
        print("Validating configuration...")
        Config.validate()
        print("✅ Configuration valid\n")
        
        # Run test
        success = test_llm_generation()
        
        if success:
            print("\n✅ TEST PASSED - LLM generation is working correctly!")
            sys.exit(0)
        else:
            print("\n❌ TEST FAILED - Check errors above")
            sys.exit(1)
            
    except FileNotFoundError as e:
        print(f"\n❌ Error: {e}")
        print(f"\nModel file not found: {Config.MODEL_PATH}")
        print(f"Run the setup script to download it:")
        print(f"  ./setup_and_run.sh")
        sys.exit(1)
        
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
