"""
Prompt builder for LLM inference.
"""
import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from edge_ai.mqtt.models import TelemetryData
    from edge_ai.ai.threat_analysis import ThreatAssessment

logger = logging.getLogger(__name__)


class PromptBuilder:
    """
    Constructs compact prompts for LLM inference from telemetry and threat assessment.
    """
    
    SYSTEM_INSTRUCTION = """You are a battlefield tactical AI. Answer questions based on current battlefield data.

Response rules:
- Answer the question directly
- Use military radio style
- Keep under 20 words
- Be precise with numbers
- Reference specific units by callsign
- Mention critical conditions (high HR, low battery, injuries)

Examples:
Q: "What is status of ALPHA-1?" → "ALPHA-1 nominal. HR 86 normal. Battery 89% good."
Q: "Status of BRAVO-2?" → "BRAVO-2 warning. HR 145 critical high stress. Battery 25% critical RTB."
Q: "How near is enemy?" → "Enemy 78 meters northeast."
Q: "Cover me I'm moving" → "Roger. Enemy 78m. Move to cover."
Q: "Battery status?" → "ALPHA-1 89% good. CHARLIE-3 45% low RTB soon."
"""
    
    MAX_CONTEXT_LENGTH = 800  # Allow full payload details
    
    def build_prompt(self, telemetry: 'TelemetryData', 
                     assessment: 'ThreatAssessment',
                     context_store=None) -> str:
        """
        Construct prompt with COMPLETE payload data for intelligent Q&A.
        
        Args:
            telemetry: Parsed telemetry data
            assessment: Computed threat assessment
            context_store: Not used - LLM gets full current state instead
            
        Returns:
            Formatted prompt string for LLM inference
        """
        prompt_parts = [self.SYSTEM_INSTRUCTION]
        prompt_parts.append("\nCurrent Battlefield Data:")
        
        # Complete squad information - LLM will interpret status field
        prompt_parts.append("\nSquad Members:")
        for soldier in telemetry.squad:
            prompt_parts.append(
                f"- {soldier.callsign} (ID: {soldier.id})\n"
                f"  Position: ({soldier.lat:.4f}, {soldier.lng:.4f})\n"
                f"  Heart Rate: {soldier.heart_rate} bpm\n"
                f"  Battery: {soldier.battery}%\n"
                f"  Status: {soldier.status.upper()}"
            )
        
        # Enemy information with distance
        prompt_parts.append(
            f"\nEnemy:\n"
            f"- {telemetry.enemy.callsign}\n"
            f"  Position: ({telemetry.enemy.lat:.4f}, {telemetry.enemy.lng:.4f})\n"
            f"  Distance from primary soldier: {assessment.enemy_distance:.1f} meters\n"
            f"  Threat Level: {assessment.threat_level}"
        )
        
        # Hostage information with distance
        prompt_parts.append(
            f"\nHostage:\n"
            f"- {telemetry.hostage.callsign}\n"
            f"  Position: ({telemetry.hostage.lat:.4f}, {telemetry.hostage.lng:.4f})\n"
            f"  Distance from primary soldier: {assessment.hostage_distance:.1f} meters\n"
            f"  Risk Level: {assessment.hostage_risk}"
        )
        
        # Threat assessment summary
        prompt_parts.append(
            f"\nThreat Assessment:\n"
            f"- Primary Soldier: {assessment.primary_soldier_id}\n"
            f"- Squad Status: {assessment.squad_status}\n"
            f"- Risk Score: {assessment.risk_score:.2f}\n"
            f"- Soldier Stress: {assessment.soldier_stress}"
        )
        
        # User question/message
        if telemetry.voice_message:
            prompt_parts.append(
                f"\nQuestion from {telemetry.voice_message.unit}:\n"
                f"\"{telemetry.voice_message.message}\"\n"
                f"\nYour response:"
            )
        else:
            prompt_parts.append("\nProvide tactical guidance:")
        
        prompt = "\n".join(prompt_parts)
        
        # Log size
        estimated_tokens = len(prompt) // 4
        logger.debug(f"Prompt: {len(prompt)} chars, ~{estimated_tokens} tokens")
        
        return prompt
