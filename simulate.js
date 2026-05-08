'use strict';

const mqtt = require('mqtt');

// ─────────────────────────────────────────────────────────────
//  SECTION 1 — MAP & ZONE DEFINITIONS
// ─────────────────────────────────────────────────────────────

const ZONES = {
  GLOBAL_MAP: {
    minLat: 12.9700, maxLat: 12.9800,
    minLng: 77.5900, maxLng: 77.6000,
  },
  COMMAND_CENTER: {
    // Northern half — safer zone
    minLat: 12.9750, maxLat: 12.9800,
    minLng: 77.5900, maxLng: 77.6000,
  },
  HOSTILE_TERRITORY: {
    // Southern half — active combat zone
    minLat: 12.9700, maxLat: 12.9750,
    minLng: 77.5900, maxLng: 77.6000,
  },
};

// ─────────────────────────────────────────────────────────────
//  SECTION 2 — UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────

// Box-Muller transform — produces Gaussian (bell-curve) distributed noise
function gaussianNoise(scale = 1) {
  let u1, u2;
  do { u1 = Math.random(); } while (u1 === 0);
  u2 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z * scale;
}

// Snaps a value back to [min, max] if it exceeds the boundary
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Approximate distance in meters between two GPS coordinates (flat-earth, valid < 1km)
function distanceMeters(lat1, lng1, lat2, lng2) {
  const metersPerDegLat = 111000;
  const metersPerDegLng = 111000 * Math.cos((lat1 * Math.PI) / 180);
  const dLat = (lat2 - lat1) * metersPerDegLat;
  const dLng = (lng2 - lng1) * metersPerDegLng;
  return Math.round(Math.sqrt(dLat * dLat + dLng * dLng));
}

// ─────────────────────────────────────────────────────────────
//  SECTION 3 — SOLDIER CLASS (DIGITAL TWIN ENTITY)
// ─────────────────────────────────────────────────────────────

class Soldier {
  constructor(id, lat, lng, assignedZone) {
    this.id           = id;
    this.lat          = lat;
    this.lng          = lng;
    this.heartRate    = 72 + Math.floor(Math.random() * 10);
    this.battery      = 95 + Math.floor(Math.random() * 6);
    this.assignedZone = assignedZone;
    this.trustScore   = 1.0;

    // Sensor drift state
    this._jammed      = false;
    this._driftLat    = 0;
    this._driftLng    = 0;

    // Casualty flag
    this._casualty    = false;
  }

  // Called once per second — advances position, HR, battery, and drift
  tick() {
    if (this._casualty) return;

    const zone = ZONES[this.assignedZone];

    // Gaussian random walk — scale ≈ 5.5 meters per step
    this.lat += gaussianNoise(0.00005);
    this.lng += gaussianNoise(0.00005);

    // Clamp to assigned zone boundary
    this.lat = clamp(this.lat, zone.minLat, zone.maxLat);
    this.lng = clamp(this.lng, zone.minLng, zone.maxLng);

    // Heart rate fluctuation ±2 bpm, clamped to physiological range
    this.heartRate += Math.round(gaussianNoise(2));
    this.heartRate = clamp(this.heartRate, 55, 130);

    // Battery drains ~0.01% per second
    this.battery = Math.max(0, parseFloat((this.battery - 0.01).toFixed(2)));

    // Accumulate GPS drift if sensor is jammed
    if (this._jammed) {
      this._driftLat += gaussianNoise(0.00003);
      this._driftLng += gaussianNoise(0.00003);
    }
  }

  // Returns the serializable state — reported GPS includes drift if jammed
  toJSON() {
    return {
      id:           this.id,
      lat:          parseFloat((this.lat + this._driftLat).toFixed(6)),
      lng:          parseFloat((this.lng + this._driftLng).toFixed(6)),
      heartRate:    this._casualty ? 0 : this.heartRate,
      battery:      this.battery,
      assignedZone: this.assignedZone,
      trustScore:   parseFloat(this.trustScore.toFixed(2)),
      status:       this._casualty ? 'CASUALTY' : this._jammed ? 'SENSOR_JAMMED' : 'ACTIVE',
    };
  }

  // ── Command Handlers ──────────────────────────────────────

  cmdRedeploy(newZone) {
    if (!ZONES[newZone]) {
      console.warn(`[WARN] Unknown zone: ${newZone}. Ignoring redeploy for ${this.id}.`);
      return;
    }
    console.log(`[CMD] ${this.id} redeployed from ${this.assignedZone} → ${newZone}`);
    this.assignedZone = newZone;
  }

  cmdCasualty() {
    console.log(`[CMD] ${this.id} marked as CASUALTY.`);
    this._casualty = true;
    this.heartRate = 0;
    this.trustScore = 0.0;
  }

  cmdJamSensor() {
    console.log(`[CMD] ${this.id} sensor JAMMED. Initiating drift.`);
    this._jammed = true;
    this.trustScore = 0.2;
  }
}

// ─────────────────────────────────────────────────────────────
//  SECTION 4 — SQUAD INITIALIZATION
// ─────────────────────────────────────────────────────────────

// Alpha & Bravo → COMMAND_CENTER (north), Charlie & Delta → HOSTILE_TERRITORY (south)
const squad = {
  Alpha:   new Soldier('Alpha',   12.9780, 77.5920, 'COMMAND_CENTER'),
  Bravo:   new Soldier('Bravo',   12.9760, 77.5970, 'COMMAND_CENTER'),
  Charlie: new Soldier('Charlie', 12.9720, 77.5930, 'HOSTILE_TERRITORY'),
  Delta:   new Soldier('Delta',   12.9710, 77.5980, 'HOSTILE_TERRITORY'),
};

// ─────────────────────────────────────────────────────────────
//  SECTION 5 — MQTT CLIENT & RESILIENCE
// ─────────────────────────────────────────────────────────────

const BROKER_URL = 'mqtt://localhost:1883';

const client = mqtt.connect(BROKER_URL, {
  clientId:        'NETRA_SimulationEngine_v2',
  reconnectPeriod: 3000,   // retry every 3s on disconnect
  connectTimeout:  10000,  // give up connecting after 10s, then retry
  keepalive:       30,     // PINGREQ every 30s to keep TCP alive
  clean:           true,
  will: {
    // Last Will — broker publishes this automatically if we crash
    topic:   'tactical/system/status',
    payload: JSON.stringify({ source: 'SimulationEngine', status: 'OFFLINE', ts: Date.now() }),
    qos:     1,
    retain:  true,
  },
});

// ─────────────────────────────────────────────────────────────
//  SECTION 6 — MQTT EVENT HANDLERS
// ─────────────────────────────────────────────────────────────

let simulationInterval = null;

client.on('connect', () => {
  console.log('[NETRA] ✓ Connected to MQTT Broker at', BROKER_URL);

  client.publish(
    'tactical/system/status',
    JSON.stringify({ source: 'SimulationEngine', status: 'ONLINE', ts: Date.now() }),
    { qos: 1, retain: true }
  );

  client.subscribe('tactical/commands', { qos: 1 }, (err) => {
    if (err) {
      console.error('[NETRA] Failed to subscribe to tactical/commands:', err.message);
    } else {
      console.log('[NETRA] ✓ Subscribed to tactical/commands');
    }
  });

  // Start the 1Hz loop only once — guard against duplicate intervals on reconnect
  if (!simulationInterval) {
    simulationInterval = setInterval(simulationTick, 1000);
    console.log('[NETRA] ✓ Simulation loop started at 1 Hz');
  }
});

client.on('reconnect', () => {
  console.log('[NETRA] ↻ Attempting to reconnect to broker...');
});

client.on('offline', () => {
  // Simulation keeps running locally — state stays fresh, publishes resume on reconnect
  console.warn('[NETRA] ✗ Client is offline. Simulation continues locally, will sync on reconnect.');
});

client.on('error', (err) => {
  console.error('[NETRA] MQTT Error:', err.message);
});

client.on('close', () => {
  console.warn('[NETRA] Connection closed.');
});

// ─────────────────────────────────────────────────────────────
//  SECTION 7 — COMMAND HANDLER (SUBSCRIBER)
// ─────────────────────────────────────────────────────────────

// Expected command format on topic 'tactical/commands':
//   { "command": "redeploy",   "target": "Alpha",   "zone": "HOSTILE_TERRITORY" }
//   { "command": "casualty",   "target": "Charlie" }
//   { "command": "jam_sensor", "target": "Bravo" }
client.on('message', (topic, messageBuffer) => {
  if (topic !== 'tactical/commands') return;

  let cmd;
  try {
    cmd = JSON.parse(messageBuffer.toString());
  } catch (e) {
    console.error('[CMD] Malformed command payload — not valid JSON:', messageBuffer.toString());
    return;
  }

  const { command, target, zone } = cmd;

  if (!target || !squad[target]) {
    console.warn(`[CMD] Unknown target soldier: "${target}". Valid targets: ${Object.keys(squad).join(', ')}`);
    return;
  }

  const soldier = squad[target];

  switch (command) {
    case 'redeploy':   soldier.cmdRedeploy(zone); break;
    case 'casualty':   soldier.cmdCasualty();     break;
    case 'jam_sensor': soldier.cmdJamSensor();    break;
    default:
      console.warn(`[CMD] Unknown command: "${command}"`);
  }
});

// ─────────────────────────────────────────────────────────────
//  SECTION 8 — THE SIMULATION TICK (1 Hz GAME LOOP)
// ─────────────────────────────────────────────────────────────

function simulationTick() {
  // 1. Advance all soldiers
  for (const soldier of Object.values(squad)) {
    soldier.tick();
  }

  // 2. Build payload
  const payload = {
    timestamp: Date.now(),
    tick:      ++simulationTick._count,
    squad:     Object.values(squad).map(s => s.toJSON()),
  };

  // 3. Publish — QoS 0 (fire-and-forget) is correct for high-frequency telemetry
  if (client.connected) {
    client.publish(
      'tactical/squad/telemetry',
      JSON.stringify(payload),
      { qos: 0 }
    );
  }

  // 4. Console summary
  const alpha   = squad.Alpha.toJSON();
  const charlie = squad.Charlie.toJSON();
  console.log(
    `[TICK ${String(payload.tick).padStart(4, '0')}]` +
    ` Alpha HR:${alpha.heartRate} Bat:${alpha.battery}%` +
    ` | Charlie HR:${charlie.heartRate} Status:${charlie.status}` +
    ` | Broker: ${client.connected ? 'CONNECTED' : 'OFFLINE'}`
  );
}

// Static counter on the function object — avoids a global variable
simulationTick._count = 0;

// ─────────────────────────────────────────────────────────────
//  SECTION 9 — GRACEFUL SHUTDOWN
// ─────────────────────────────────────────────────────────────

// Ctrl+C → stop loop → publish SHUTDOWN → clean disconnect (prevents false Last Will trigger)
process.on('SIGINT', () => {
  console.log('\n[NETRA] Shutdown signal received. Cleaning up...');

  if (simulationInterval) clearInterval(simulationInterval);

  client.publish(
    'tactical/system/status',
    JSON.stringify({ source: 'SimulationEngine', status: 'SHUTDOWN', ts: Date.now() }),
    { qos: 1, retain: true },
    () => {
      client.end(false, {}, () => {
        console.log('[NETRA] Disconnected cleanly. Goodbye.');
        process.exit(0);
      });
    }
  );
});
