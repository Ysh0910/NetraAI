# MQTT Payload Format

## 📡 Input: Telemetry Data

**Topic**: `battlefield/sensor`

### Complete Example (with Voice Message)

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

### Field Descriptions

#### Root Level
- **`tick`** (integer, required): Sequence number for this telemetry update
- **`timestamp`** (integer, required): Unix timestamp in milliseconds
- **`squad`** (array, required): Array of squad member objects (minimum 1)
- **`enemy`** (object, required): Enemy position and info
- **`hostage`** (object, required): Hostage position and info
- **`voiceMessage`** (object, optional): Voice command from a unit

#### Squad Member Object
- **`id`** (string, required): Unique identifier (e.g., "alpha", "bravo")
- **`callsign`** (string, required): Radio callsign (e.g., "ALPHA-1")
- **`status`** (string, required): Member status
  - `"nominal"` - Normal operation
  - `"warning"` - Caution required
  - `"critical"` - Immediate attention needed
- **`heartRate`** (integer, required): Heart rate in beats per minute
- **`battery`** (integer, required): Battery percentage (0-100)
- **`lat`** (float, required): Latitude (GPS coordinate)
- **`lng`** (float, required): Longitude (GPS coordinate)

#### Enemy Object
- **`callsign`** (string, required): Enemy identifier
- **`lat`** (float, required): Latitude (GPS coordinate)
- **`lng`** (float, required): Longitude (GPS coordinate)

#### Hostage Object
- **`callsign`** (string, required): Hostage identifier
- **`lat`** (float, required): Latitude (GPS coordinate)
- **`lng`** (float, required): Longitude (GPS coordinate)

#### Voice Message Object (Optional)
- **`unit`** (string, required): Callsign of the speaking unit
- **`message`** (string, required): The voice command/message
- **`timestamp`** (integer, required): When the message was sent (Unix timestamp in ms)
- **`source`** (string, required): Source of the message (e.g., "dashboard", "radio")

---

## 📤 Output: AI Response

**Topic**: `battlefield/ai-response`

### Example (with Voice Context)

```json
{
  "timestamp": 1715247612000,
  "source": "NETRA-EdgeAI",
  "type": "ai_response",
  "decision": "Roger that Alpha. Taking cover and monitoring your movement.",
  "context": {
    "risk_score": 0.72,
    "threat_level": "elevated",
    "latency_ms": 1450,
    "replying_to_unit": "ALPHA-1",
    "replying_to_message": "Cover me I'm moving",
    "original_timestamp": 1715247595000
  }
}
```

### Example (without Voice Context)

```json
{
  "timestamp": 1715247620000,
  "source": "NETRA-EdgeAI",
  "type": "ai_response",
  "decision": "Maintain current position and monitor enemy movement.",
  "context": {
    "risk_score": 0.25,
    "threat_level": "low",
    "latency_ms": 1150
  }
}
```

### Field Descriptions

#### Root Level
- **`timestamp`** (integer): Current timestamp (Unix timestamp in ms)
- **`source`** (string): Always "NETRA-EdgeAI"
- **`type`** (string): Always "ai_response"
- **`decision`** (string): Tactical recommendation from AI
- **`context`** (object): Metadata about the response

#### Context Object
- **`risk_score`** (float): Normalized risk score (0.0 to 1.0)
- **`threat_level`** (string): Threat assessment
  - `"low"` - Minimal threat
  - `"moderate"` - Caution advised
  - `"elevated"` - Heightened alert
  - `"critical"` - Immediate action required
- **`latency_ms`** (integer): Processing time in milliseconds
- **`replying_to_unit`** (string, optional): Unit being replied to (if voice message present)
- **`replying_to_message`** (string, optional): Original message (if voice message present)
- **`original_timestamp`** (integer, optional): Timestamp of original voice message (if present)

---

## 🧪 Test Commands

### Subscribe to Responses
```bash
mosquitto_sub -t "battlefield/ai-response" -v
```

### Send Test Telemetry (with Voice Message)
```bash
mosquitto_pub -t "battlefield/sensor" -m '{
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
    "message": "Cover me I'\''m moving",
    "timestamp": 1715247595000,
    "source": "dashboard"
  }
}'
```

### Send Test Telemetry (without Voice Message)
```bash
mosquitto_pub -t "battlefield/sensor" -m '{
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
}'
```

---

## 📊 How It Works

1. **Telemetry Reception**: System receives squad telemetry via MQTT
2. **Voice Message Detection**: Checks for optional voice message from units
3. **Primary Soldier Selection**: Identifies highest-risk soldier (highest heart rate)
4. **Distance Calculation**: Uses Haversine formula to calculate GPS distances
5. **Threat Analysis**: 
   - Enemy distance from primary soldier
   - Squad status (nominal/warning/critical)
   - Hostage proximity to enemy
   - Soldier stress levels (heart rate)
6. **Risk Scoring**: Weighted formula considering:
   - Distance factor (50%)
   - Stress factor (20%)
   - Hostage factor (15%)
   - Squad status factor (15%)
7. **Prompt Building**: 
   - Includes situation context
   - Adds voice message if present
   - Instructs AI to respond to speaking unit
8. **AI Decision**: LLM generates tactical recommendation
9. **Response Publishing**: Decision sent back via MQTT with context metadata

---

## 🎯 Key Features

- ✅ **Multi-soldier support**: Handles squads of any size
- ✅ **GPS coordinates**: Real-world latitude/longitude
- ✅ **Squad status tracking**: Individual member status monitoring
- ✅ **Battery monitoring**: Track equipment power levels
- ✅ **Voice message support**: Units can send voice commands
- ✅ **Contextual responses**: AI responds directly to speaking units
- ✅ **Automatic primary selection**: Identifies highest-risk soldier
- ✅ **Haversine distance**: Accurate GPS-based distance calculation
- ✅ **Conversation tracking**: Response includes original message context

---

## 💬 Voice Message Examples

### Example 1: Unit Requesting Support
**Input:**
```json
"voiceMessage": {
  "unit": "ALPHA-1",
  "message": "Need backup, taking fire",
  "timestamp": 1715247600000,
  "source": "radio"
}
```

**AI Response:**
```
"Roger Alpha-1. BRAVO-2 moving to your position. Hold your ground."
```

### Example 2: Unit Reporting Enemy
**Input:**
```json
"voiceMessage": {
  "unit": "CHARLIE-3",
  "message": "Enemy spotted moving towards hostage",
  "timestamp": 1715247610000,
  "source": "dashboard"
}
```

**AI Response:**
```
"Copy Charlie-3. Intercept enemy before they reach hostage. ALPHA-1 provide cover."
```

### Example 3: Unit Requesting Orders
**Input:**
```json
"voiceMessage": {
  "unit": "BRAVO-2",
  "message": "What's my next move",
  "timestamp": 1715247620000,
  "source": "dashboard"
}
```

**AI Response:**
```
"Bravo-2, advance to grid 12.9795, 77.5925 and secure the perimeter."
```

---

## 📝 Notes

- All GPS coordinates use decimal degrees format
- Distances are calculated in meters using Haversine formula
- Heart rate thresholds: >120 bpm = HIGH stress
- Distance thresholds: <100m = CRITICAL threat
- Squad status: Any "critical" member = CRITICAL squad status
- Primary soldier: Member with highest heart rate (most stressed)
