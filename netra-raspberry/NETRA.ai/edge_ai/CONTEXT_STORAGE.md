# Context Storage System

## 📊 Overview

The Edge AI Copilot now includes a **context storage system** that saves all incoming telemetry data, threat assessments, and AI decisions for:
- Historical analysis
- Pattern recognition
- Future predictions
- Debugging and monitoring

---

## 🏗️ Architecture

### Storage Layers

1. **In-Memory Buffer** (Fast Access)
   - Circular buffer with configurable size (default: 100 items)
   - Instant access to recent context
   - Used for real-time pattern analysis

2. **Session Files** (Persistent Storage)
   - JSONL format (one JSON object per line)
   - One file per session
   - Automatic cleanup of old files

### Data Flow

```
Telemetry → Threat Analysis → AI Decision
                ↓
         Context Store
         /           \
    Memory Buffer   Session File
    (100 items)     (10,000 items)
```

---

## 📁 Storage Structure

```
storage/
└── context/
    ├── session_20241124_143022.jsonl  # Current session
    ├── session_20241124_120015.jsonl  # Previous session
    └── session_20241123_095530.jsonl  # Older session
```

### Entry Format

Each stored entry contains:

```json
{
  "timestamp": 1732452123456,
  "tick": 47,
  "stored_at": "2024-11-24T14:30:22.123456",
  
  "squad": [
    {
      "id": "alpha",
      "callsign": "ALPHA-1",
      "lat": 12.9795,
      "lng": 77.5925,
      "heartRate": 60,
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
    "risk_score": 0.87,
    "threat_level": "CRITICAL",
    "enemy_distance": 45.2,
    "soldier_stress": "HIGH",
    "hostage_risk": "ELEVATED",
    "primary_soldier_id": "ALPHA-1",
    "squad_status": "WARNING"
  },
  
  "decision": "Take cover and assess situation",
  "latency_ms": 2450
}
```

---

## 🔧 Configuration

Edit `config.py`:

```python
# Context Storage Settings
CONTEXT_STORAGE_DIR = "storage/context"
CONTEXT_MEMORY_ITEMS = 100      # Items in memory buffer
CONTEXT_FILE_ITEMS = 10000      # Items per session file
CONTEXT_RETENTION_DAYS = 7      # Days to keep old files
```

---

## 🔍 Querying Context Data

### Interactive Query Tool

```bash
python3 query_context.py
```

**Features:**
1. Show statistics (total entries, threat distribution, etc.)
2. Show recent entries
3. Show soldier history
4. Show threat patterns
5. Export data to JSON

### Programmatic Access

```python
from edge_ai.storage.context_store import ContextStore

# Initialize store
store = ContextStore()

# Get recent context
recent = store.get_recent_context(count=10)

# Get soldier history
history = store.get_soldier_history("ALPHA-1", count=5)

# Get threat patterns
critical_threats = store.get_threat_pattern("CRITICAL", count=10)

# Get statistics
stats = store.get_statistics()

# Build context summary for LLM
summary = store.build_context_summary(count=5)

# Export to JSON
store.export_to_json("backup.json")
```

---

## 📊 Use Cases

### 1. Pattern Analysis

Analyze historical threat patterns:

```python
# Get all CRITICAL threats
critical = store.get_threat_pattern("CRITICAL", count=50)

# Analyze common factors
avg_distance = sum(e['assessment']['enemy_distance'] for e in critical) / len(critical)
print(f"Average distance in CRITICAL threats: {avg_distance:.1f}m")
```

### 2. Soldier Monitoring

Track individual soldier performance:

```python
# Get soldier history
history = store.get_soldier_history("ALPHA-1", count=20)

# Analyze heart rate trends
heart_rates = [
    next(s['heartRate'] for s in e['squad'] if s['callsign'] == 'ALPHA-1')
    for e in history
]
print(f"Heart rate trend: {heart_rates}")
```

### 3. Decision Effectiveness

Analyze AI decision patterns:

```python
# Get recent decisions
recent = store.get_recent_context(count=100)

# Group by threat level
decisions_by_threat = {}
for entry in recent:
    level = entry['assessment']['threat_level']
    decision = entry['decision']
    decisions_by_threat.setdefault(level, []).append(decision)

# Analyze most common decisions per threat level
for level, decisions in decisions_by_threat.items():
    print(f"{level}: {len(set(decisions))} unique decisions")
```

### 4. Context-Aware Predictions

Use historical context in LLM prompts:

```python
# Build context summary
context_summary = store.build_context_summary(count=5)

# Include in prompt
prompt = f"{context_summary}\n\nCurrent situation: Enemy at 50m. Recommend action."
```

---

## 🧪 Testing

### Generate Test Data

```bash
# Run the copilot
python3 main.py

# Send test telemetry
mosquitto_pub -t "battlefield/sensor" -m '{...}'
```

### Query Stored Data

```bash
# Interactive query
python3 query_context.py

# Or programmatically
python3 -c "
from edge_ai.storage.context_store import ContextStore
store = ContextStore()
print(store.get_statistics())
"
```

---

## 📈 Statistics Example

```
======================================================================
CONTEXT STORE STATISTICS
======================================================================
  Total Entries    : 247
  Memory Usage     : 100/100
  Avg Risk Score   : 0.654
  Session File     : storage/context/session_20241124_143022.jsonl
  Oldest Entry     : 1732452000000
  Newest Entry     : 1732452123456

  Threat Distribution:
    CRITICAL     :  45 ( 18.2%)
    HIGH         :  89 ( 36.0%)
    MEDIUM       :  78 ( 31.6%)
    LOW          :  35 ( 14.2%)
======================================================================
```

---

## 🔄 Automatic Cleanup

Old session files are automatically cleaned up:

```python
# Cleanup files older than 7 days
deleted = store.cleanup_old_sessions(keep_days=7)
print(f"Deleted {deleted} old session files")
```

---

## 💾 Storage Requirements

### Memory Usage
- **Per Entry**: ~1-2 KB
- **100 Entries**: ~100-200 KB
- **Negligible impact** on Raspberry Pi

### Disk Usage
- **Per Entry**: ~1-2 KB
- **10,000 Entries**: ~10-20 MB
- **Per Day** (at 1 entry/sec): ~86-172 MB
- **7 Days**: ~600 MB - 1.2 GB

---

## 🎯 Future Enhancements

Potential additions:
- [ ] SQLite database for complex queries
- [ ] Time-series analysis
- [ ] Anomaly detection
- [ ] Predictive modeling
- [ ] Real-time dashboards
- [ ] Pattern-based alerts

---

## 📝 API Reference

### ContextStore Methods

| Method | Description |
|--------|-------------|
| `store_telemetry()` | Store telemetry with assessment and decision |
| `get_recent_context()` | Get N most recent entries |
| `get_context_by_timerange()` | Get entries in time range |
| `get_soldier_history()` | Get history for specific soldier |
| `get_threat_pattern()` | Get entries with specific threat level |
| `get_statistics()` | Get storage statistics |
| `build_context_summary()` | Build text summary for LLM |
| `cleanup_old_sessions()` | Delete old session files |
| `export_to_json()` | Export data to JSON file |

---

## 🔒 Security Considerations

- **File Permissions**: Session files are created with default permissions
- **Data Sensitivity**: Contains tactical battlefield data
- **Encryption**: Not implemented (add if needed)
- **Access Control**: File system level only

---

## 🚀 Quick Start

1. **Context is stored automatically** when copilot runs
2. **Query data** with `python3 query_context.py`
3. **Export data** for analysis
4. **Use in predictions** via `build_context_summary()`

---

**Context storage is now active!** 📊
