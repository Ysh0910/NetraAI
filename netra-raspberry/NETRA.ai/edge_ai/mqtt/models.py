"""
Data models for telemetry parsing and validation.
"""
import json
import logging
import math
from dataclasses import dataclass, field
from typing import Optional, List

logger = logging.getLogger(__name__)


@dataclass
class SquadMember:
    """Represents a squad member"""
    id: str
    callsign: str
    status: str
    heart_rate: int
    battery: int
    lat: float
    lng: float


@dataclass
class Enemy:
    """Represents enemy position"""
    callsign: str
    lat: float
    lng: float


@dataclass
class Hostage:
    """Represents hostage position"""
    callsign: str
    lat: float
    lng: float
    status: str = "unknown"  # Optional, defaults to unknown


@dataclass
class VoiceMessage:
    """Represents a voice message from a unit"""
    unit: str
    message: str
    timestamp: int
    source: str


@dataclass
class TelemetryData:
    """
    Represents battlefield telemetry data received via MQTT.
    
    Payload format:
    {
      "tick": 42,
      "timestamp": 1778280852338,
      "squad": [
        {
          "id": "alpha",
          "callsign": "ALPHA-1",
          "status": "nominal",
          "heartRate": 82,
          "battery": 91,
          "lat": 12.9795,
          "lng": 77.5924
        },
        ...
      ],
      "enemy": {
        "callsign": "HOSTILE",
        "lat": 12.9797,
        "lng": 77.5930
      },
      "hostage": {
        "callsign": "HOSTAGE",
        "status": "unknown",
        "lat": 12.9796,
        "lng": 77.5928
      },
      "voiceMessage": {
        "unit": "ALPHA-1",
        "message": "Cover me I'm moving",
        "timestamp": 1715247595000,
        "source": "dashboard"
      }
    }
    """
    tick: int
    timestamp: int
    squad: List[SquadMember]
    enemy: Enemy
    hostage: Hostage
    voice_message: Optional[VoiceMessage] = field(default=None)
    
    # Computed fields for backward compatibility
    soldier: dict = field(default=None)  # Primary soldier (first squad member)
    environment: str = "urban"
    threat_level: str = "unknown"

    @staticmethod
    def from_json(payload: str) -> Optional['TelemetryData']:
        """Parse JSON payload into TelemetryData object."""
        try:
            data = json.loads(payload)

            # Validate required fields
            required_fields = ['tick', 'timestamp', 'squad', 'enemy', 'hostage']
            for field in required_fields:
                if field not in data:
                    logger.error(f"Missing required field: {field}")
                    return None

            # Validate squad
            if not isinstance(data['squad'], list) or len(data['squad']) == 0:
                logger.error("Squad must be a non-empty list")
                return None

            # Parse squad members
            squad_members = []
            for member in data['squad']:
                try:
                    squad_member = SquadMember(
                        id=member['id'],
                        callsign=member['callsign'],
                        status=member['status'],
                        heart_rate=int(member['heartRate']),
                        battery=int(member['battery']),
                        lat=float(member['lat']),
                        lng=float(member['lng'])
                    )
                    squad_members.append(squad_member)
                except (KeyError, ValueError) as e:
                    logger.error(f"Invalid squad member data: {e}")
                    return None

            # Parse enemy
            try:
                enemy = Enemy(
                    callsign=data['enemy']['callsign'],
                    lat=float(data['enemy']['lat']),
                    lng=float(data['enemy']['lng'])
                )
            except (KeyError, ValueError) as e:
                logger.error(f"Invalid enemy data: {e}")
                return None

            # Parse hostage
            try:
                hostage = Hostage(
                    callsign=data['hostage']['callsign'],
                    lat=float(data['hostage']['lat']),
                    lng=float(data['hostage']['lng']),
                    status=data['hostage'].get('status', 'unknown')  # Optional
                )
            except (KeyError, ValueError) as e:
                logger.error(f"Invalid hostage data: {e}")
                return None

            # Parse voice message (optional)
            voice_message = None
            if 'voiceMessage' in data and data['voiceMessage'] is not None:
                logger.info(f"Voice message field found in payload")
                try:
                    vm_data = data['voiceMessage']
                    # Validate all required fields exist
                    if all(key in vm_data for key in ['unit', 'message', 'timestamp', 'source']):
                        voice_message = VoiceMessage(
                            unit=vm_data['unit'],
                            message=vm_data['message'],
                            timestamp=int(vm_data['timestamp']),
                            source=vm_data['source']
                        )
                        logger.info(f"✅ Voice message parsed: from {voice_message.unit}: {voice_message.message}")
                    else:
                        logger.warning("Voice message missing required fields, ignoring")
                        logger.warning(f"Voice message data: {vm_data}")
                except (KeyError, ValueError, TypeError) as e:
                    logger.warning(f"Invalid voice message data: {e}")
                    # Continue without voice message
            else:
                logger.debug("No voiceMessage field in payload")

            # Create telemetry object
            telemetry = TelemetryData(
                tick=int(data['tick']),
                timestamp=int(data['timestamp']),
                squad=squad_members,
                enemy=enemy,
                hostage=hostage,
                voice_message=voice_message
            )
            
            # Create soldier dict for backward compatibility (use first squad member)
            primary_soldier = squad_members[0]
            telemetry.soldier = {
                'x': primary_soldier.lat,
                'y': primary_soldier.lng,
                'heart_rate': primary_soldier.heart_rate,
                'id': primary_soldier.id,
                'callsign': primary_soldier.callsign,
                'status': primary_soldier.status,
                'battery': primary_soldier.battery
            }

            return telemetry

        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}. Payload: {payload[:100]}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error parsing telemetry: {e}")
            import traceback
            traceback.print_exc()
            return None

    @staticmethod
    def from_dict(data: dict) -> Optional['TelemetryData']:
        """Create TelemetryData from dictionary (for testing)."""
        return TelemetryData.from_json(json.dumps(data))
    
    def calculate_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """
        Calculate distance between two GPS coordinates in meters using Haversine formula.
        
        Args:
            lat1, lng1: First coordinate
            lat2, lng2: Second coordinate
            
        Returns:
            Distance in meters
        """
        # Earth radius in meters
        R = 6371000
        
        # Convert to radians
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lng = math.radians(lng2 - lng1)
        
        # Haversine formula
        a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        distance = R * c
        return distance
    
    def get_primary_soldier(self) -> SquadMember:
        """Get the primary soldier (first squad member)."""
        return self.squad[0]
    
    def get_soldier_by_id(self, soldier_id: str) -> Optional[SquadMember]:
        """Get a specific soldier by ID."""
        for soldier in self.squad:
            if soldier.id == soldier_id:
                return soldier
        return None
    
    def get_highest_risk_soldier(self) -> SquadMember:
        """Get the soldier with highest heart rate (most stressed)."""
        return max(self.squad, key=lambda s: s.heart_rate)
