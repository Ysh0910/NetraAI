# Context Storage & Historical Data Usage Guide

## 📚 Overview

The Edge AI Copilot stores **every telemetry event** with its AI decision for future reference and pattern analysis. Currently, this data is stored but **NOT yet used in prompts**. This guide shows how it works and how to enable historical context.

---

## 🗄️ How Data is Stored

### Storage Layers

1. **In-Memory Buffer** (Fast Access)
   - Circular buffer with last 100 entries
   - Instant access for recent history
   - Lost on restart

2. **Session Files** (Persistent)
   - JSONL format (one JSON per line)
   - Stored in `storage/context/session_YYYYMMDD_HHMMSS.jsonl`
   - Survives restarts
   - Auto-cleanup after 7 days

### What Gets Stored

Every telemetry event stores:
```json
{
  "timestamp": 1715247600000,
  "tick": 47,
  "stored_at": "2026-05-09T16:30:45.123456",
  
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
  
  "assessment": {
    "risk_score": 0.72,
    "threat_level": "MODERATE",
    "enemy_distance": 78.5,
    "soldier_stress": "NORMAL",
    "hostage_risk": "NORMAL",
    "primary_soldier_id": "ALPHA-1",
    "squad_status": "NOMINAL"
  },
  
  "decision": "Roger Alpha. Taking cover and monitoring your movement.",
  "latency_ms": 1450
}
```

---

## 🔍 Current Status

### ✅ What's Working:
- Data is being stored automatically
- In-memory buffer keeps last 100 entries
- Session files persist data to disk
- Query methods available for analysis

### ❌ What's NOT Enabled Yet:
- Historical context is **NOT included in LLM prompts**
- Previous decisions are **NOT considered** for new responses
- Pattern analysis is **NOT used** for predictions

---

## 🚀 How to Enable Historical Context

### Option 1: Add Recent History to Prompts (Simple)

Update `edge_ai/ai/prompt_builder.py`:

```python
def build_prompt(self, telemetry: 'TelemetryData', 
                 assessment: 'ThreatAssessment',
                 context_store=None) -> str:
    """Build prompt with optional historical context."""
    
    # Get primary soldier info
    primary_soldier = telemetry.get_primary_soldier()
    
    # Build current situation context
    context_parts = [
        f"Squad: {len(telemetry.squad)} members, status {assessment.squad_status.lower()}.",
        f"Primary: {assessment.primary_soldier_id}, HR {primary_soldier.heart_rate}bpm.",
        f"Enemy: {assessment.enemy_distance:.0f}m away, threat {assessment.threat_level.lower()}.",
        f"Hostage: {assessment.hostage_risk.lower()} risk.",
    ]
    
    # Add recent history if available
    if context_store:
        recent = context_store.get_recent_context(count=3)
        if recent:
            history_parts = []
            for entry in recent:
                history_parts.append(
                    f"Previous: Threat {entry['assessment']['threat_level']}, "
                    f"decided '{entry['decision']}'"
                )
            context_parts.append(" ".join(history_parts))
    
    context = " ".join(context_parts)
    
    # Rest of prompt building...
```

**Example Prompt with History:**
```
You are a battlefield tactical AI. Give one clear tactical command in a complete sentence.

Situation: Squad: 2 members, status nominal. Primary: ALPHA-1, HR 86bpm. Enemy: 78m away, threat moderate. Hostage: normal risk. Previous: Threat LOW, decided 'Maintain position and monitor.' Previous: Threat MODERATE, decided 'Take cover behind structure.'

ALPHA-1 asks: "Cover me I'm moving"

Your response to ALPHA-1:
```

---

### Option 2: Add Soldier-Specific History (Advanced)

Track individual soldier patterns:

```python
def build_prompt_with_soldier_history(self, telemetry, assessment, context_store):
    """Build prompt with soldier-specific history."""
    
    primary_soldier = telemetry.get_primary_soldier()
    
    # Get this soldier's recent history
    soldier_history = context_store.get_soldier_history(
        primary_soldier.callsign, 
        count=5
    )
    
    # Analyze soldier's stress trend
    if len(soldier_history) >= 3:
        hr_values = [
            s['heartRate'] 
            for entry in soldier_history 
            for s in entry['squad'] 
            if s['callsign'] == primary_soldier.callsign
        ]
        
        if hr_values[-1] > hr_values[0] + 20:
            stress_trend = "increasing stress"
        elif hr_values[-1] < hr_values[0] - 20:
            stress_trend = "decreasing stress"
        else:
            stress_trend = "stable"
        
        context_parts.append(f"Soldier trend: {stress_trend}.")
    
    # Rest of prompt building...
```

**Example with Soldier History:**
```
Situation: Squad: 1 members, status nominal. Primary: ALPHA-1, HR 135bpm. Enemy: 35m away, threat critical. Hostage: elevated risk. Soldier trend: increasing stress.

ALPHA-1 asks: "Need backup"

Your response to ALPHA-1:
```

---

### Option 3: Pattern-Based Predictions (Expert)

Use historical patterns to predict outcomes:

```python
def build_prompt_with_patterns(self, telemetry, assessment, context_store):
    """Build prompt with pattern analysis."""
    
    # Find similar past situations
    similar_threats = context_store.get_threat_pattern(
        assessment.threat_level, 
        count=5
    )
    
    if similar_threats:
        # Analyze what worked before
        successful_decisions = [
            entry['decision'] 
            for entry in similar_threats
            if entry['assessment']['risk_score'] < 0.5  # Low risk after decision
        ]
        
        if successful_decisions:
            context_parts.append(
                f"Past successful actions in {assessment.threat_level} threat: "
                f"{', '.join(set(successful_decisions[:3]))}."
            )
    
    # Rest of prompt building...
```

---

## 📊 Query Historical Data

### Get Recent Context
```python
# Get last 10 entries
recent = context_store.get_recent_context(count=10)

for entry in recent:
    print(f"Tick {entry['tick']}: {entry['decision']}")
```

### Get Soldier History
```python
# Get ALPHA-1's last 5 events
history = context_store.get_soldier_history("ALPHA-1", count=5)

for entry in history:
    soldier = next(s for s in entry['squad'] if s['callsign'] == "ALPHA-1")
    print(f"HR: {soldier['heartRate']}, Status: {soldier['status']}")
```

### Get Threat Patterns
```python
# Get last 10 CRITICAL threat situations
critical = context_store.get_threat_pattern("CRITICAL", count=10)

for entry in critical:
    print(f"Decision: {entry['decision']}, Risk: {entry['assessment']['risk_score']}")
```

### Get Statistics
```python
stats = context_store.get_statistics()
print(f"Total entries: {stats['total_entries']}")
print(f"Average risk: {stats['avg_risk_score']}")
print(f"Threat distribution: {stats['threat_distribution']}")
```

**Example Output:**
```
Total entries: 47
Average risk: 0.58
Threat distribution: {'LOW': 15, 'MODERATE': 20, 'HIGH': 8, 'CRITICAL': 4}
```

---

## 🛠️ Implementation Steps

### Step 1: Update Orchestrator

Modify `edge_ai/orchestrator.py` to pass context store to prompt builder:

```python
# Step 2: Build prompt with historical context
prompt = self.prompt_builder.build_prompt(
    telemetry, 
    assessment,
    context_store=self.context_store  # Add this
)
```

### Step 2: Update Prompt Builder

Modify `edge_ai/ai/prompt_builder.py` to accept and use context:

```python
def build_prompt(self, telemetry, assessment, context_store=None):
    # Add historical context logic here
    pass
```

### Step 3: Test

```bash
cd edge_ai
python main.py
```

Send multiple telemetry messages and observe how the AI uses historical context.

---

## 📈 Benefits of Historical Context

### 1. **Continuity**
- AI remembers previous decisions
- Avoids contradicting itself
- Maintains consistent strategy

### 2. **Pattern Recognition**
- Learns what works in similar situations
- Adapts to squad behavior patterns
- Predicts enemy movements

### 3. **Personalization**
- Tracks individual soldier stress levels
- Adjusts commands based on soldier history
- Recognizes fatigue patterns

### 4. **Improved Decisions**
- Context-aware recommendations
- Learns from past outcomes
- Better tactical planning

---

## 🔧 Configuration

Edit `edge_ai/config.py`:

```python
# Context Storage Settings
CONTEXT_MEMORY_ITEMS: int = 100      # In-memory buffer size
CONTEXT_FILE_ITEMS: int = 10000      # Max items per file
CONTEXT_RETENTION_DAYS: int = 7      # Days to keep old files
CONTEXT_IN_PROMPTS: bool = True      # Enable historical context
CONTEXT_HISTORY_COUNT: int = 3       # Number of past events to include
```

---

## 📁 File Locations

- **Session files**: `storage/context/session_YYYYMMDD_HHMMSS.jsonl`
- **Query tool**: `edge_ai/query_context.py`
- **Context store**: `edge_ai/storage/context_store.py`

---

## 🧪 Testing Context Storage

### View Stored Data
```bash
cd edge_ai
python query_context.py
```

### Export Data
```python
from edge_ai.storage.context_store import ContextStore

store = ContextStore()
store.export_to_json("context_export.json")
```

### Analyze Patterns
```python
# Get statistics
stats = store.get_statistics()
print(stats)

# Get recent decisions
recent = store.get_recent_context(10)
for entry in recent:
    print(f"{entry['tick']}: {entry['decision']}")
```

---

## 🎯 Summary

### Current State:
- ✅ Data is being stored automatically
- ✅ Query methods available
- ❌ NOT used in prompts yet

### To Enable:
1. Update `prompt_builder.py` to accept `context_store`
2. Add historical context to prompt
3. Update `orchestrator.py` to pass context store
4. Test with multiple telemetry messages

### Benefits:
- Better continuity
- Pattern recognition
- Personalized responses
- Improved tactical decisions

The infrastructure is ready - you just need to enable it in the prompt builder! 🚀
