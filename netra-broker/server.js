/**
 * Netra Tactical Dashboard - MQTT Broker
 *
 * Exposes:
 *   - TCP MQTT  on port 1883 (backend microservices)
 *   - WS  MQTT  on port 8080 (browser / Next.js frontend)
 *
 * Logs client connect/disconnect events and pretty-prints JSON
 * payloads published on `tactical/prototype`. Malformed JSON is
 * logged as a warning and never crashes the broker.
 */

const { Aedes } = require('aedes');
const net = require('net');
const http = require('http');
const WebSocket = require('ws');
const { createWebSocketStream } = require('ws');

const TCP_PORT = 1883;
const WS_PORT = 8080;
const TARGET_TOPIC = 'tactical/prototype';

const ts = () => new Date().toISOString();
const log = (...args) => console.log(`[${ts()}]`, ...args);
const warn = (...args) => console.warn(`[${ts()}] [WARN]`, ...args);
const err = (...args) => console.error(`[${ts()}] [ERROR]`, ...args);

let aedes;
let tcpServer;
let httpServer;

async function main() {
  aedes = await Aedes.createBroker();

  /* --------------------------- TCP server --------------------------- */
  tcpServer = net.createServer(aedes.handle);
  tcpServer.on('error', (e) => err('TCP server error:', e.message));
  tcpServer.listen(TCP_PORT, () => {
    log(`MQTT (TCP) broker listening on port ${TCP_PORT}`);
  });

  /* ----------------------- HTTP + WebSocket ------------------------ */
  httpServer = http.createServer((req, res) => {
    // CORS headers allow the browser (Next.js on :3000) to upgrade to WS on :8080
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
    });
    res.end('Netra MQTT broker - WebSocket endpoint\n');
  });
  
  // Create WebSocket server attached to HTTP server
  const wss = new WebSocket.Server({ server: httpServer });
  
  wss.on('connection', (ws, req) => {
    // Pass only the duplex stream — aedes.handle does not accept a second argument
    const stream = createWebSocketStream(ws);
    aedes.handle(stream);
  });
  
  wss.on('error', (e) => err('WebSocket server error:', e.message));
  
  httpServer.on('error', (e) => err('HTTP server error:', e.message));
  httpServer.listen(WS_PORT, () => {
    log(`MQTT (WebSocket) broker listening on port ${WS_PORT}`);
  });

  attachAedesEvents();
}

main().catch((e) => {
  err('Failed to start broker:', e && e.stack ? e.stack : e);
  process.exit(1);
});

function attachAedesEvents() {

/* ---------------------------- Aedes events --------------------------- */
aedes.on('client', (client) => {
  log(`CONNECT  -> client "${client ? client.id : 'unknown'}" connected`);
});

aedes.on('clientDisconnect', (client) => {
  log(`DISCONNECT -> client "${client ? client.id : 'unknown'}" disconnected`);
});

aedes.on('clientError', (client, e) => {
  warn(`client "${client ? client.id : 'unknown'}" error:`, e.message);
});

aedes.on('connectionError', (client, e) => {
  warn(`connection error from "${client ? client.id : 'unknown'}":`, e.message);
});

aedes.on('subscribe', (subscriptions, client) => {
  const topics = subscriptions.map((s) => s.topic).join(', ');
  log(`SUBSCRIBE -> "${client ? client.id : 'unknown'}" -> [${topics}]`);
});

aedes.on('unsubscribe', (subscriptions, client) => {
  log(`UNSUBSCRIBE -> "${client ? client.id : 'unknown'}" -> [${subscriptions.join(', ')}]`);
});

aedes.on('publish', (packet, client) => {
  if (!client) return; // ignore broker-internal $SYS messages
  if (packet.topic !== TARGET_TOPIC) {
    log(`PUBLISH  -> "${client.id}" -> ${packet.topic} (${packet.payload.length} bytes)`);
    return;
  }

  const raw = packet.payload ? packet.payload.toString('utf8') : '';
  try {
    const data = JSON.parse(raw);
    log(`PUBLISH  -> "${client.id}" -> ${packet.topic}:`);
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    warn(
      `Malformed JSON on "${packet.topic}" from "${client.id}":`,
      e.message,
      '| raw payload:',
      raw
    );
  }
});

}

/* --------------------- Process-level safety nets --------------------- */
process.on('uncaughtException', (e) => {
  err('uncaughtException:', e && e.stack ? e.stack : e);
});

process.on('unhandledRejection', (reason) => {
  err('unhandledRejection:', reason);
});

const shutdown = (signal) => {
  log(`Received ${signal}, shutting down gracefully...`);
  aedes.close(() => {
    tcpServer.close(() => {
      httpServer.close(() => {
        log('Broker shut down cleanly.');
        process.exit(0);
      });
    });
  });
  // Force exit if cleanup hangs.
  setTimeout(() => process.exit(1), 5000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
