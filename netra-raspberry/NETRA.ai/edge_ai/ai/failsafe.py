"""
Failsafe handler for rule-based tactical decisions.
"""
import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from edge_ai.ai.threat_analysis import ThreatAssessment

logger = logging.getLogger(__name__)


class FailsafeHandler:
    """
    Provides rule-based fallback decisions when AI inference fails.
    """
    
    def generate_fallback(self, assessment: 'ThreatAssessment') -> str:
        """
        Generate rule-based tactical decision from threat assessment.
        
        Args:
            assessment: Computed threat assessment
            
        Returns:
            Rule-based tactical recommendation
        """
        enemy_distance = assessment.enemy_distance
        
        # Rule-based decision logic
        if enemy_distance < 50:
            decision = "Immediate retreat recommended"
            reason = "enemy_distance < 50m"
        elif enemy_distance < 100:
            decision = "Take cover behind nearby structure"
            reason = "enemy_distance < 100m"
        else:
            decision = "Maintain current position and monitor"
            reason = "enemy_distance >= 100m"
        
        logger.warning(
            f"Failsafe activated: {decision} (reason: {reason}, "
            f"distance: {enemy_distance:.1f}m)"
        )
        
        return decision
