"""
Context storage for telemetry data and AI decisions.
Stores historical data for pattern analysis and future predictions.
"""
import json
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional
from collections import deque

logger = logging.getLogger(__name__)


class ContextStore:
    """
    Stores telemetry data and AI decisions for context-aware predictions.
    
    Features:
    - In-memory circular buffer for recent data
    - JSON file persistence for historical data
    - Automatic cleanup of old data
    - Query interface for pattern analysis
    """
    
    def __init__(self, storage_dir: str = "storage/context", 
                 max_memory_items: int = 100,
                 max_file_items: int = 10000):
        """
        Initialize context store.
        
        Args:
            storage_dir: Directory to store context files
            max_memory_items: Maximum items to keep in memory
            max_file_items: Maximum items to keep in file
        """
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
        self.max_memory_items = max_memory_items
        self.max_file_items = max_file_items
        
        # In-memory circular buffer for fast access
        self.memory_buffer = deque(maxlen=max_memory_items)
        
        # Current session file
        self.session_file = self.storage_dir / f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jsonl"
        
        logger.info(f"Context store initialized: {self.storage_dir}")
        logger.info(f"Memory buffer: {max_memory_items} items")
        logger.info(f"Session file: {self.session_file}")
    
    def store_telemetry(self, telemetry, assessment, decision: str, 
                       latency_ms: int) -> None:
        """
        Store telemetry data with AI decision and assessment.
        
        Args:
            telemetry: TelemetryData object
            assessment: ThreatAssessment object
            decision: AI-generated decision text
            latency_ms: Processing latency in milliseconds
        """
        try:
            # Create context entry
            entry = {
                "timestamp": telemetry.timestamp,
                "tick": telemetry.tick,
                "stored_at": datetime.now().isoformat(),
                
                # Squad data
                "squad": [
                    {
                        "id": soldier.id,
                        "callsign": soldier.callsign,
                        "lat": soldier.lat,
                        "lng": soldier.lng,
                        "heartRate": soldier.heart_rate,
                        "battery": soldier.battery,
                        "status": soldier.status
                    }
                    for soldier in telemetry.squad
                ],
                
                # Enemy data
                "enemy": {
                    "callsign": telemetry.enemy.callsign,
                    "lat": telemetry.enemy.lat,
                    "lng": telemetry.enemy.lng
                },
                
                # Hostage data
                "hostage": {
                    "callsign": telemetry.hostage.callsign,
                    "lat": telemetry.hostage.lat,
                    "lng": telemetry.hostage.lng
                },
                
                # Voice message (if present)
                "voice_message": None,
                
                # Threat assessment
                "assessment": {
                    "risk_score": assessment.risk_score,
                    "threat_level": assessment.threat_level,
                    "enemy_distance": assessment.enemy_distance,
                    "hostage_distance": assessment.hostage_distance,
                    "soldier_stress": assessment.soldier_stress,
                    "hostage_risk": assessment.hostage_risk,
                    "primary_soldier_id": assessment.primary_soldier_id,
                    "squad_status": assessment.squad_status,
                    "high_stress": assessment.high_stress
                },
                
                # AI decision
                "decision": decision,
                "latency_ms": latency_ms
            }
            
            # Add voice message if present
            if telemetry.voice_message:
                entry["voice_message"] = {
                    "unit": telemetry.voice_message.unit,
                    "message": telemetry.voice_message.message,
                    "timestamp": telemetry.voice_message.timestamp,
                    "source": telemetry.voice_message.source
                }
            
            # Store in memory buffer
            self.memory_buffer.append(entry)
            
            # Append to session file
            with open(self.session_file, 'a') as f:
                f.write(json.dumps(entry) + '\n')
            
            logger.debug(f"Stored context entry: tick={telemetry.tick}, timestamp={telemetry.timestamp}")
            
        except Exception as e:
            logger.error(f"Failed to store context: {e}")
    
    def get_recent_context(self, count: int = 10) -> List[Dict]:
        """
        Get most recent context entries from memory.
        
        Args:
            count: Number of recent entries to retrieve
            
        Returns:
            List of context entries (most recent first)
        """
        return list(self.memory_buffer)[-count:][::-1]
    
    def get_context_by_timerange(self, start_timestamp: int, 
                                 end_timestamp: int) -> List[Dict]:
        """
        Get context entries within a time range.
        
        Args:
            start_timestamp: Start timestamp (inclusive)
            end_timestamp: End timestamp (inclusive)
            
        Returns:
            List of context entries in time range
        """
        return [
            entry for entry in self.memory_buffer
            if start_timestamp <= entry['timestamp'] <= end_timestamp
        ]
    
    def get_soldier_history(self, soldier_id: str, count: int = 10) -> List[Dict]:
        """
        Get historical data for a specific soldier.
        
        Args:
            soldier_id: Soldier callsign or ID
            count: Number of entries to retrieve
            
        Returns:
            List of entries containing this soldier
        """
        history = []
        for entry in reversed(self.memory_buffer):
            for soldier in entry['squad']:
                if soldier['id'] == soldier_id or soldier['callsign'] == soldier_id:
                    history.append(entry)
                    break
            if len(history) >= count:
                break
        return history
    
    def get_threat_pattern(self, threat_level: str, count: int = 10) -> List[Dict]:
        """
        Get historical entries with specific threat level.
        
        Args:
            threat_level: Threat level to filter (CRITICAL, HIGH, MEDIUM, LOW)
            count: Number of entries to retrieve
            
        Returns:
            List of entries with matching threat level
        """
        return [
            entry for entry in list(self.memory_buffer)[-count*2:]
            if entry['assessment']['threat_level'] == threat_level
        ][:count]
    
    def get_statistics(self) -> Dict:
        """
        Get statistics about stored context.
        
        Returns:
            Dictionary with statistics
        """
        if not self.memory_buffer:
            return {
                "total_entries": 0,
                "memory_usage": 0,
                "avg_risk_score": 0.0,
                "threat_distribution": {}
            }
        
        entries = list(self.memory_buffer)
        
        # Calculate statistics
        total = len(entries)
        avg_risk = sum(e['assessment']['risk_score'] for e in entries) / total
        
        # Threat level distribution
        threat_dist = {}
        for entry in entries:
            level = entry['assessment']['threat_level']
            threat_dist[level] = threat_dist.get(level, 0) + 1
        
        return {
            "total_entries": total,
            "memory_usage": len(self.memory_buffer),
            "memory_capacity": self.max_memory_items,
            "avg_risk_score": round(avg_risk, 3),
            "threat_distribution": threat_dist,
            "session_file": str(self.session_file),
            "oldest_timestamp": entries[0]['timestamp'] if entries else None,
            "newest_timestamp": entries[-1]['timestamp'] if entries else None
        }
    
    def build_context_summary(self, count: int = 5) -> str:
        """
        Build a text summary of recent context for LLM prompts.
        
        Args:
            count: Number of recent entries to summarize
            
        Returns:
            Text summary of recent context
        """
        recent = self.get_recent_context(count)
        
        if not recent:
            return "No historical context available."
        
        summary_parts = [f"Recent history ({len(recent)} entries):"]
        
        for i, entry in enumerate(recent, 1):
            summary_parts.append(
                f"{i}. Tick {entry['tick']}: "
                f"Threat {entry['assessment']['threat_level']}, "
                f"Risk {entry['assessment']['risk_score']:.2f}, "
                f"Decision: {entry['decision']}"
            )
        
        return " ".join(summary_parts)
    
    def cleanup_old_sessions(self, keep_days: int = 7) -> int:
        """
        Clean up old session files.
        
        Args:
            keep_days: Number of days to keep
            
        Returns:
            Number of files deleted
        """
        deleted = 0
        cutoff = datetime.now().timestamp() - (keep_days * 86400)
        
        for file in self.storage_dir.glob("session_*.jsonl"):
            if file.stat().st_mtime < cutoff:
                file.unlink()
                deleted += 1
                logger.info(f"Deleted old session file: {file.name}")
        
        return deleted
    
    def export_to_json(self, output_file: str) -> None:
        """
        Export all memory buffer data to a JSON file.
        
        Args:
            output_file: Output file path
        """
        data = {
            "exported_at": datetime.now().isoformat(),
            "total_entries": len(self.memory_buffer),
            "entries": list(self.memory_buffer)
        }
        
        with open(output_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        logger.info(f"Exported {len(self.memory_buffer)} entries to {output_file}")
