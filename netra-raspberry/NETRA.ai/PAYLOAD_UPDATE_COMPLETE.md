# Payload Format Update - Complete ✅

## 🎯 What Was Updated

The Edge AI Copilot codebase has been updated to handle the new squad-based telemetry payload with GPS coordinates.

---

## 📋 Changes Made

### 1. **Updated Data Models** (`mqtt/models.py`)
- ✅ Added `SquadMember` dataclass
- ✅ Added `Enemy` dataclass  
- ✅ Added `Hostage` dataclass
- ✅ Updated `TelemetryData` to handle squad arrays
- ✅ Implemented Haversine formula for GPS distance calculation
- ✅ Added helper methods:
  - `get_primary_soldier()` - Gets first squad member
  - `get_soldier_by_id()` - Gets specific soldier
  - `get_highest_risk_soldier()` - Gets most stressed soldier
  - `calculate_distance()` - GPS distance in meters

### 2. **Updated Threat Analysis** (`ai/threat_analysis.py`)
- ✅ Works with GPS coordinates (lat/lng)
- ✅ Analyzes squad status (nominal/warning/critical)
- ✅ Identifies primary soldier (highest risk)
- ✅ Added squad status factor to risk scoring
- ✅ Enhanced `ThreatAssessment` with:
  - `primary_soldier_id` - Callsign of analyzed soldier
  - `squad_status` - Overall squad status

### 3. **Updated Prompt Builder** (`ai/prompt_builder.py`)
- ✅ Uses squad information in prompts
- ✅ Includes primary soldier callsign
- ✅ Mentions squad size and status
- ✅ More contextual tactical information

### 4. **Updated Orchestrator** (`orchestrator.py`)
- ✅ Enhanced console output showing:
  - Tick number
  - Squad members with status icons (🟢🟡🔴)
  - Individual heart rates and battery levels
  - GPS coordinates
  - Primary soldier identification
  - Squad status

### 5. **Updated Test Script** (`test_system.py`)
- ✅ Uses new payload format in tests
- ✅ Tests squad-based telemetry
- ✅ Validates GPS coordinate handling

### 6. **Updated Documentation**
- ✅ `README.md` - New payload examples
- ✅ `PAYLOAD_FORMAT.md` - Complete payload specification
- ✅ Test commands updated

---

## 📡 New Payload Format

### Input (battlefield/sensor)

```json
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
    {
      "id": "bravo",
      "callsign": "BRAVO-2",
      "status": "warning",
      "heartRate": 108,
      "battery": 54,
      "lat": 12.9793,
      "lng": 77.5921
    }
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
  }
}
```

### Output (battlefield/ai-response)

```json
{
  "decision": "Take cover and assess situation",
  "risk_score": 0.87,
  "timestamp": 1778280852338,
  "latency_ms": 2450
}
```

---

## 🧪 Testing

### Run System Tests
```bash
python3 test_system.py
```

### Test with MQTT

**Terminal 1 - Subscribe:**
```bash
mosquitto_sub -t "battlefield/ai-response" -v
```

**Terminal 2 - Publish:**
```bash
mosquitto_pub -t "battlefield/sensor" -m '{
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
    {
      "id": "bravo",
      "callsign": "BRAVO-2",
      "status": "warning",
      "heartRate": 108,
      "battery": 54,
      "lat": 12.9793,
      "lng": 77.5921
    }
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
  }
}'
```

---

## 🎯 Key Features

### Multi-Soldier Support
- Handles squads of any size
- Tracks individual status, heart rate, battery
- Identifies highest-risk soldier automatically

### GPS Coordinates
- Real latitude/longitude coordinates
- Haversine formula for accurate distance calculation
- Distances in meters

### Enhanced Risk Analysis
- **Distance factor** (50%): Enemy proximity
- **Stress factor** (20%): Heart rate monitoring
- **Hostage factor** (15%): Hostage proximity to enemy
- **Squad factor** (15%): Overall squad status

### Status Tracking
- **Soldier status**: nominal, warning, critical
- **Squad status**: NOMINAL, WARNING, CRITICAL

---

## 📊 Console Output Example

```
======================================================================
📡 TELEMETRY RECEIVED
======================================================================
  Tick        : 42
  Timestamp   : 1778280852338
  Squad Size  : 2 members
    🟢 ALPHA-1: HR=82bpm, Battery=91%, Status=nominal
    🟡 BRAVO-2: HR=108bpm, Battery=54%, Status=warning
  Enemy       : HOSTILE at (12.9797, 77.5930)
  Hostage     : HOSTAGE (unknown) at (12.9796, 77.5928)
----------------------------------------------------------------------
🔍 THREAT ANALYSIS
  Primary     : BRAVO-2
  Distance    : 45.2m
  Threat Level: CRITICAL
  Risk Score  : 0.87
  Stress Level: HIGH
  Hostage Risk: ELEVATED
  Squad Status: WARNING
----------------------------------------------------------------------
🤖 AI DECISION
  Decision    : Take cover and assess situation
  Latency     : 2450ms
======================================================================
```

---

## ✅ Backward Compatibility

The system maintains backward compatibility by:
- Creating a `soldier` dict from the first squad member
- Supporting the old `environment` and `threat_level` fields (optional)
- Existing code that uses `telemetry.soldier` still works

---

## 🚀 Ready to Use

The codebase is now fully updated and ready to handle the new payload format!

**To run:**
```bash
# Activate virtual environment (if using)
source venv/bin/activate

# Run the copilot
python3 main.py
```

**To test:**
```bash
python3 test_system.py
```

---

## 📚 Documentation

- **PAYLOAD_FORMAT.md** - Complete payload specification
- **README.md** - Updated with new examples
- **test_system.py** - Updated test cases

---

**All changes complete!** 🎉
