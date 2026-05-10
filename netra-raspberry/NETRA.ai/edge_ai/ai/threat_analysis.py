"""
Threat analysis engine for battlefield telemetry.
"""
import logging
import math
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from edge_ai.mqtt.models import TelemetryData

logger = logging.getLogger(__name__)


@dataclass
class ThreatAssessment:
    """
    Represents the result of threat analysis.
    
    Attributes:
        risk_score: Normalized risk score (0.0 to 1.0)
        threat_level: Classification (CRITICAL, HIGH, MEDIUM, LOW)
        enemy_distance: Distance from soldier to enemy in meters
        hostage_distance: Distance from primary soldier to hostage in meters
        soldier_stress: Soldier stress state (HIGH, NORMAL)
        hostage_risk: Hostage risk level (ELEVATED, NORMAL)
        primary_soldier_id: ID of the primary soldier being analyzed
        squad_status: Overall squad status summary
        high_stress: Boolean indicating if soldier is under high stress
    """
    risk_score: float
    threat_level: str
    enemy_distance: float
    hostage_distance: float
    soldier_stress: str
    hostage_risk: str
    primary_soldier_id: str
    squad_status: str
    high_stress: bool


class ThreatAnalyzer:
    """
    Analyzes battlefield telemetry to compute threat levels and risk scores.
    Works with GPS coordinates and squad-based telemetry.
    """
    
    def __init__(self, critical_distance: int, stress_heart_rate: int, 
                 hostage_risk_distance: int):
        """
        Initialize threat analyzer with configurable thresholds.
        
        Args:
            critical_distance: Distance threshold for CRITICAL threat (meters)
            stress_heart_rate: Heart rate threshold for HIGH stress (bpm)
            hostage_risk_distance: Distance threshold for ELEVATED hostage risk (meters)
        """
        self.critical_distance = critical_distance
        self.stress_heart_rate = stress_heart_rate
        self.hostage_risk_distance = hostage_risk_distance
    
    def analyze(self, telemetry: 'TelemetryData') -> ThreatAssessment:
        """
        Compute threat assessment from telemetry data.
        
        Args:
            telemetry: Parsed telemetry data
            
        Returns:
            ThreatAssessment with computed metrics
        """
        # Get primary soldier (highest risk or first in squad)
        primary_soldier = telemetry.get_highest_risk_soldier()
        
        # Calculate distance from primary soldier to enemy using GPS coordinates
        enemy_distance = telemetry.calculate_distance(
            primary_soldier.lat, primary_soldier.lng,
            telemetry.enemy.lat, telemetry.enemy.lng
        )
        
        # Calculate hostage distance from primary soldier
        hostage_distance = telemetry.calculate_distance(
            primary_soldier.lat, primary_soldier.lng,
            telemetry.hostage.lat, telemetry.hostage.lng
        )
        
        # Calculate hostage distance from enemy
        hostage_enemy_distance = telemetry.calculate_distance(
            telemetry.hostage.lat, telemetry.hostage.lng,
            telemetry.enemy.lat, telemetry.enemy.lng
        )
        
        # Classify threat level based on enemy distance
        if enemy_distance < self.critical_distance:
            threat_level = "CRITICAL"
        elif enemy_distance < self.critical_distance * 1.5:
            threat_level = "HIGH"
        elif enemy_distance < self.critical_distance * 2:
            threat_level = "MEDIUM"
        else:
            threat_level = "LOW"
        
        # Determine soldier stress state
        high_stress = primary_soldier.heart_rate > self.stress_heart_rate
        soldier_stress = "HIGH" if high_stress else "NORMAL"
        
        # Determine hostage risk
        hostage_risk = "ELEVATED" if hostage_enemy_distance < self.hostage_risk_distance else "NORMAL"
        
        # Analyze squad status
        squad_status = self._analyze_squad_status(telemetry.squad)
        
        # Compute normalized risk score (0.0 to 1.0)
        # Formula: distance_factor (50%) + stress_factor (20%) + hostage_factor (15%) + squad_factor (15%)
        distance_factor = max(0.0, 1.0 - (enemy_distance / 200.0))
        stress_factor = 1.0 if primary_soldier.heart_rate > self.stress_heart_rate else 0.0
        hostage_factor = 1.0 if hostage_enemy_distance < self.hostage_risk_distance else 0.0
        
        # Squad factor: consider number of warning/critical status members
        warning_count = sum(1 for s in telemetry.squad if s.status == "warning")
        critical_count = sum(1 for s in telemetry.squad if s.status == "critical")
        squad_factor = min(1.0, (warning_count * 0.3 + critical_count * 0.7) / len(telemetry.squad))
        
        risk_score = (distance_factor * 0.5) + (stress_factor * 0.2) + (hostage_factor * 0.15) + (squad_factor * 0.15)
        risk_score = min(1.0, max(0.0, risk_score))  # Clamp to [0, 1]
        
        logger.info(
            f"Threat Analysis: soldier={primary_soldier.callsign}, "
            f"distance={enemy_distance:.1f}m, threat={threat_level}, "
            f"stress={soldier_stress}, hostage_risk={hostage_risk}, "
            f"squad={squad_status}, risk_score={risk_score:.2f}"
        )
        
        return ThreatAssessment(
            risk_score=risk_score,
            threat_level=threat_level,
            enemy_distance=enemy_distance,
            hostage_distance=hostage_distance,
            soldier_stress=soldier_stress,
            hostage_risk=hostage_risk,
            primary_soldier_id=primary_soldier.callsign,
            squad_status=squad_status,
            high_stress=high_stress
        )
    
    def _analyze_squad_status(self, squad) -> str:
        """
        Analyze overall squad status.
        
        Args:
            squad: List of SquadMember objects
            
        Returns:
            Status string (CRITICAL, WARNING, NOMINAL)
        """
        critical_count = sum(1 for s in squad if s.status == "critical")
        warning_count = sum(1 for s in squad if s.status == "warning")
        
        if critical_count > 0:
            return "CRITICAL"
        elif warning_count > 0:
            return "WARNING"
        else:
            return "NOMINAL"
