"""
Integration tests for Edge AI Copilot pipeline.
"""
import json
import time
import unittest
from unittest.mock import Mock, patch
import paho.mqtt.client as mqtt

from edge_ai.config import Config
from edge_ai.mqtt.models import TelemetryData
from edge_ai.ai.threat_analysis import ThreatAnalyzer
from edge_ai.ai.prompt_builder import PromptBuilder
from edge_ai.ai.failsafe import FailsafeHandler
from edge_ai.ai.decision_validator import TacticalDecisionGenerator


class TestTelemetryParsing(unittest.TestCase):
    """Test telemetry parsing and validation."""
    
    def test_valid_telemetry(self):
        """Test parsing valid telemetry JSON."""
        payload = json.dumps({
            "timestamp": 1710000000,
            "soldier": {"x": 120, "y": 340, "heart_rate": 125},
            "enemy": {"x": 180, "y": 360},
            "hostage": {"x": 140, "y": 350},
            "environment": "urban",
            "threat_level": "high"
        })
        
        telemetry = TelemetryData.from_json(payload)
        self.assertIsNotNone(telemetry)
        self.assertEqual(telemetry.timestamp, 1710000000)
        self.assertEqual(telemetry.soldier['heart_rate'], 125)
        self.assertEqual(telemetry.environment, "urban")
    
    def test_malformed_json(self):
        """Test handling of malformed JSON."""
        payload = "{ invalid json }"
        telemetry = TelemetryData.from_json(payload)
        self.assertIsNone(telemetry)
    
    def test_missing_fields(self):
        """Test handling of missing required fields."""
        payload = json.dumps({
            "timestamp": 1710000000,
            "soldier": {"x": 120, "y": 340}
            # Missing other required fields
        })
        telemetry = TelemetryData.from_json(payload)
        self.assertIsNone(telemetry)


class TestThreatAnalysis(unittest.TestCase):
    """Test threat analysis engine."""
    
    def setUp(self):
        """Setup test fixtures."""
        self.analyzer = ThreatAnalyzer(
            critical_distance=100,
            stress_heart_rate=120,
            hostage_risk_distance=50
        )
    
    def test_critical_threat(self):
        """Test CRITICAL threat classification."""
        telemetry = TelemetryData(
            timestamp=1710000000,
            soldier={"x": 100, "y": 100, "heart_rate": 130},
            enemy={"x": 150, "y": 100},  # 50m away
            hostage={"x": 140, "y": 100},
            environment="urban",
            threat_level="high"
        )
        
        assessment = self.analyzer.analyze(telemetry)
        self.assertEqual(assessment.threat_level, "CRITICAL")
        self.assertLess(assessment.enemy_distance, 100)
        self.assertEqual(assessment.soldier_stress, "HIGH")
    
    def test_low_threat(self):
        """Test LOW threat classification."""
        telemetry = TelemetryData(
            timestamp=1710000000,
            soldier={"x": 100, "y": 100, "heart_rate": 80},
            enemy={"x": 400, "y": 100},  # 300m away
            hostage={"x": 200, "y": 100},
            environment="rural",
            threat_level="low"
        )
        
        assessment = self.analyzer.analyze(telemetry)
        self.assertEqual(assessment.threat_level, "LOW")
        self.assertGreater(assessment.enemy_distance, 200)
        self.assertEqual(assessment.soldier_stress, "NORMAL")
    
    def test_risk_score_calculation(self):
        """Test risk score is within valid range."""
        telemetry = TelemetryData(
            timestamp=1710000000,
            soldier={"x": 100, "y": 100, "heart_rate": 125},
            enemy={"x": 180, "y": 100},
            hostage={"x": 160, "y": 100},
            environment="urban",
            threat_level="high"
        )
        
        assessment = self.analyzer.analyze(telemetry)
        self.assertGreaterEqual(assessment.risk_score, 0.0)
        self.assertLessEqual(assessment.risk_score, 1.0)


class TestPromptBuilder(unittest.TestCase):
    """Test prompt builder."""
    
    def setUp(self):
        """Setup test fixtures."""
        self.builder = PromptBuilder()
        self.analyzer = ThreatAnalyzer(100, 120, 50)
    
    def test_prompt_format(self):
        """Test prompt formatting."""
        telemetry = TelemetryData(
            timestamp=1710000000,
            soldier={"x": 100, "y": 100, "heart_rate": 125},
            enemy={"x": 180, "y": 100},
            hostage={"x": 160, "y": 100},
            environment="urban",
            threat_level="high"
        )
        
        assessment = self.analyzer.analyze(telemetry)
        prompt = self.builder.build_prompt(telemetry, assessment)
        
        self.assertIn("battlefield tactical AI", prompt)
        self.assertIn("Enemy distance:", prompt)
        self.assertIn("urban", prompt)
    
    def test_prompt_length_limit(self):
        """Test prompt length enforcement."""
        telemetry = TelemetryData(
            timestamp=1710000000,
            soldier={"x": 100, "y": 100, "heart_rate": 125},
            enemy={"x": 180, "y": 100},
            hostage={"x": 160, "y": 100},
            environment="urban",
            threat_level="high"
        )
        
        assessment = self.analyzer.analyze(telemetry)
        prompt = self.builder.build_prompt(telemetry, assessment)
        
        # Context should be under limit (excluding system instruction)
        context = prompt.split('\n', 1)[1] if '\n' in prompt else prompt
        self.assertLessEqual(len(context), self.builder.MAX_CONTEXT_LENGTH)


class TestFailsafeHandler(unittest.TestCase):
    """Test failsafe handler."""
    
    def setUp(self):
        """Setup test fixtures."""
        self.handler = FailsafeHandler()
        self.analyzer = ThreatAnalyzer(100, 120, 50)
    
    def test_immediate_retreat(self):
        """Test immediate retreat decision."""
        telemetry = TelemetryData(
            timestamp=1710000000,
            soldier={"x": 100, "y": 100, "heart_rate": 125},
            enemy={"x": 130, "y": 100},  # 30m away
            hostage={"x": 160, "y": 100},
            environment="urban",
            threat_level="critical"
        )
        
        assessment = self.analyzer.analyze(telemetry)
        decision = self.handler.generate_fallback(assessment)
        
        self.assertIn("retreat", decision.lower())
    
    def test_take_cover(self):
        """Test take cover decision."""
        telemetry = TelemetryData(
            timestamp=1710000000,
            soldier={"x": 100, "y": 100, "heart_rate": 125},
            enemy={"x": 170, "y": 100},  # 70m away
            hostage={"x": 160, "y": 100},
            environment="urban",
            threat_level="high"
        )
        
        assessment = self.analyzer.analyze(telemetry)
        decision = self.handler.generate_fallback(assessment)
        
        self.assertIn("cover", decision.lower())
    
    def test_maintain_position(self):
        """Test maintain position decision."""
        telemetry = TelemetryData(
            timestamp=1710000000,
            soldier={"x": 100, "y": 100, "heart_rate": 90},
            enemy={"x": 300, "y": 100},  # 200m away
            hostage={"x": 200, "y": 100},
            environment="rural",
            threat_level="low"
        )
        
        assessment = self.analyzer.analyze(telemetry)
        decision = self.handler.generate_fallback(assessment)
        
        self.assertIn("maintain", decision.lower())


class TestDecisionValidator(unittest.TestCase):
    """Test tactical decision validator."""
    
    def setUp(self):
        """Setup test fixtures."""
        self.validator = TacticalDecisionGenerator()
    
    def test_word_count_limit(self):
        """Test word count enforcement."""
        long_decision = " ".join(["word"] * 30)
        validated = self.validator.validate_decision(long_decision)
        
        word_count = len(validated.split())
        self.assertLessEqual(word_count, self.validator.MAX_WORDS)
    
    def test_formatting(self):
        """Test proper formatting."""
        decision = "move to cover"
        formatted = self.validator.format_decision(decision)
        
        self.assertTrue(formatted[0].isupper())
        self.assertTrue(formatted.endswith('.'))
    
    def test_narrative_phrase_removal(self):
        """Test removal of narrative phrases."""
        decision = "It appears to be dangerous, move to cover"
        validated = self.validator.validate_decision(decision)
        
        self.assertNotIn("appears to be", validated.lower())


class TestEndToEndPipeline(unittest.TestCase):
    """Test end-to-end pipeline integration."""
    
    @patch('edge_ai.ai.inference.InferenceEngine')
    @patch('edge_ai.voice.tts.TTSEngine')
    def test_pipeline_latency(self, mock_tts, mock_inference):
        """Test pipeline completes within acceptable time."""
        # Mock inference to return quickly
        mock_inference.return_value.generate.return_value = "Move to cover immediately"
        mock_tts.return_value.speak.return_value = True
        
        # Create components
        analyzer = ThreatAnalyzer(100, 120, 50)
        builder = PromptBuilder()
        validator = TacticalDecisionGenerator()
        
        # Create test telemetry
        telemetry = TelemetryData(
            timestamp=1710000000,
            soldier={"x": 100, "y": 100, "heart_rate": 125},
            enemy={"x": 180, "y": 100},
            hostage={"x": 160, "y": 100},
            environment="urban",
            threat_level="high"
        )
        
        # Measure pipeline execution
        start_time = time.time()
        
        assessment = analyzer.analyze(telemetry)
        prompt = builder.build_prompt(telemetry, assessment)
        decision = validator.validate_decision("Move to cover immediately")
        
        latency = (time.time() - start_time) * 1000
        
        # Pipeline should complete quickly (excluding actual inference)
        self.assertLess(latency, 100)  # 100ms for non-inference components


if __name__ == '__main__':
    unittest.main()
