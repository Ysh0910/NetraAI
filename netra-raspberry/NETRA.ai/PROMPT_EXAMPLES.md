# LLM Prompt Generation Examples

## How Prompts Are Built

The system constructs prompts in 3 parts:
1. **System Instruction**: Defines the AI's role
2. **Situation Context**: Battlefield status (squad, enemy, threat)
3. **Command/Question**: Either from voice message or general guidance request

---

## Sample Prompt 1: With Voice Message

### Input Telemetry:
```json
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
```

### Threat Analysis:
- Primary Soldier: ALPHA-1
- Enemy Distance: 78.5m
- Threat Level: MODERATE
- Squad Status: NOMINAL
- Hostage Risk: NORMAL

### Generated Prompt:
```
You are a battlefield tactical AI. Give one clear tactical command in a complete sentence.

Situation: Squad: 2 members, status nominal. Primary: ALPHA-1, HR 86bpm. Enemy: 78m away, threat moderate. Hostage: normal risk.

ALPHA-1 asks: "Cover me I'm moving"

Your response to ALPHA-1:
```

### Expected LLM Response:
```
Roger Alpha. Taking cover and monitoring your movement.
```

---

## Sample Prompt 2: Without Voice Message

### Input Telemetry:
```json
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
```

### Threat Analysis:
- Primary Soldier: ALPHA-1
- Enemy Distance: 180.2m
- Threat Level: LOW
- Squad Status: NOMINAL
- Hostage Risk: NORMAL

### Generated Prompt:
```
You are a battlefield tactical AI. Give one clear tactical command in a complete sentence.

Situation: Squad: 1 members, status nominal. Primary: ALPHA-1, HR 75bpm. Enemy: 180m away, threat low. Hostage: normal risk.

Provide tactical guidance:
```

### Expected LLM Response:
```
Maintain current position and monitor enemy movement.
```

---

## Sample Prompt 3: High Stress Situation with Voice

### Input Telemetry:
```json
{
  "timestamp": 1715247630000,
  "tick": 50,
  "squad": [
    {
      "id": "alpha",
      "callsign": "ALPHA-1",
      "lat": 12.9795,
      "lng": 77.5925,
      "heartRate": 135,
      "battery": 45.0,
      "status": "warning"
    },
    {
      "id": "bravo",
      "callsign": "BRAVO-2",
      "lat": 12.9793,
      "lng": 77.5923,
      "heartRate": 125,
      "battery": 30.0,
      "status": "critical"
    }
  ],
  "enemy": {
    "callsign": "HOSTILE-A",
    "lat": 12.9796,
    "lng": 77.5926
  },
  "hostage": {
    "callsign": "VICTIM-1",
    "lat": 12.9795,
    "lng": 77.5927
  },
  "voiceMessage": {
    "unit": "BRAVO-2",
    "message": "Need backup, taking fire",
    "timestamp": 1715247628000,
    "source": "radio"
  }
}
```

### Threat Analysis:
- Primary Soldier: ALPHA-1 (highest HR: 135bpm)
- Enemy Distance: 35.2m
- Threat Level: CRITICAL
- Squad Status: CRITICAL
- Hostage Risk: ELEVATED

### Generated Prompt:
```
You are a battlefield tactical AI. Give one clear tactical command in a complete sentence.

Situation: Squad: 2 members, status critical. Primary: ALPHA-1, HR 135bpm. Enemy: 35m away, threat critical. Hostage: elevated risk.

BRAVO-2 asks: "Need backup, taking fire"

Your response to BRAVO-2:
```

### Expected LLM Response:
```
Roger Bravo-2. ALPHA-1 moving to your position. Take cover immediately.
```

---

## Sample Prompt 4: Enemy Near Hostage

### Input Telemetry:
```json
{
  "timestamp": 1715247640000,
  "tick": 51,
  "squad": [
    {
      "id": "charlie",
      "callsign": "CHARLIE-3",
      "lat": 12.9792,
      "lng": 77.5928,
      "heartRate": 95,
      "battery": 88.6,
      "status": "nominal"
    }
  ],
  "enemy": {
    "callsign": "HOSTILE-A",
    "lat": 12.9793,
    "lng": 77.5929
  },
  "hostage": {
    "callsign": "VICTIM-1",
    "lat": 12.9793,
    "lng": 77.5930
  },
  "voiceMessage": {
    "unit": "CHARLIE-3",
    "message": "Enemy spotted moving towards hostage",
    "timestamp": 1715247638000,
    "source": "dashboard"
  }
}
```

### Threat Analysis:
- Primary Soldier: CHARLIE-3
- Enemy Distance: 15.8m (from hostage)
- Threat Level: HIGH
- Squad Status: NOMINAL
- Hostage Risk: ELEVATED

### Generated Prompt:
```
You are a battlefield tactical AI. Give one clear tactical command in a complete sentence.

Situation: Squad: 1 members, status nominal. Primary: CHARLIE-3, HR 95bpm. Enemy: 16m away, threat high. Hostage: elevated risk.

CHARLIE-3 asks: "Enemy spotted moving towards hostage"

Your response to CHARLIE-3:
```

### Expected LLM Response:
```
Copy Charlie-3. Intercept enemy before they reach hostage. Engage with caution.
```

---

## Prompt Structure Breakdown

### 1. System Instruction (Fixed)
```
You are a battlefield tactical AI. Give one clear tactical command in a complete sentence.
```

**Purpose**: Defines AI role and response format

---

### 2. Situation Context (Dynamic)
```
Situation: Squad: {count} members, status {status}. Primary: {callsign}, HR {heartrate}bpm. Enemy: {distance}m away, threat {level}. Hostage: {risk} risk.
```

**Variables**:
- `{count}`: Number of squad members (1-10)
- `{status}`: NOMINAL, WARNING, or CRITICAL
- `{callsign}`: Primary soldier's callsign
- `{heartrate}`: Primary soldier's heart rate (60-180 bpm)
- `{distance}`: Distance to enemy in meters (0-500m)
- `{level}`: LOW, MODERATE, HIGH, or CRITICAL
- `{risk}`: NORMAL or ELEVATED

---

### 3. Command/Question (Conditional)

**With Voice Message**:
```
{unit} asks: "{message}"

Your response to {unit}:
```

**Without Voice Message**:
```
Provide tactical guidance:
```

---

## Configuration

You can adjust prompt behavior in `edge_ai/ai/prompt_builder.py`:

```python
SYSTEM_INSTRUCTION = "You are a battlefield tactical AI. Give one clear tactical command in a complete sentence."
MAX_CONTEXT_LENGTH = 200  # Maximum context characters
```

And in `edge_ai/config.py`:

```python
MAX_TOKENS: int = 50        # Response length (30-100)
TEMPERATURE: float = 0.5    # Creativity (0.3-0.7)
```

---

## How It Works

1. **Receive telemetry** → Parse squad, enemy, hostage data
2. **Analyze threat** → Calculate distances, risk scores, threat levels
3. **Build context** → Create situation summary (max 200 chars)
4. **Add command** → Include voice message if present
5. **Send to LLM** → TinyLlama generates response
6. **Validate** → Clean and format the response
7. **Send back** → Publish via MQTT

---

## Tips for Better Responses

### Increase Response Length
```python
MAX_TOKENS: int = 75  # Longer responses
```

### More Creative Responses
```python
TEMPERATURE: float = 0.7  # More variety
```

### More Focused Responses
```python
TEMPERATURE: float = 0.3  # More consistent
```

### Adjust Context Detail
Edit `prompt_builder.py` to add/remove context fields:
```python
context_parts = [
    f"Squad: {len(telemetry.squad)} members, status {assessment.squad_status.lower()}.",
    f"Primary: {assessment.primary_soldier_id}, HR {primary_soldier.heart_rate}bpm.",
    f"Enemy: {assessment.enemy_distance:.0f}m away, threat {assessment.threat_level.lower()}.",
    f"Hostage: {assessment.hostage_risk.lower()} risk.",
    # Add more fields here if needed
]
```

---

## Summary

The prompt is built dynamically based on:
- ✅ **Battlefield situation** (squad status, distances, threats)
- ✅ **Voice message** (if present, becomes the main question)
- ✅ **Threat analysis** (risk scores, threat levels)
- ✅ **System role** (tactical AI providing commands)

The LLM receives a concise, focused prompt that includes all necessary context to generate an appropriate tactical response!
