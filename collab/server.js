#!/usr/bin/env node
// Standalone Yjs collaboration server for Clav.Strats.
// Rooms are keyed by the websocket path (clav-strat-<id>), one Y.Doc per room.
// Run:  node collab/server.js   (PORT / HOST via env, defaults 1234 / 0.0.0.0)
//
// Behind nginx terminate TLS and proxy wss:// -> this ws:// port (see COLLAB.md).

const http = require('http');
const { WebSocketServer } = require('ws');
const { setupWSConnection, docs } = require('y-websocket/bin/utils');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT) || 1234;

// Rooms are `clav-strat-<id>` where <id> is the client's `^[A-Za-z0-9_-]{1,64}$`
// token. Keep the bound generous but finite so anonymous clients cannot mint
// unbounded room names or push the path into filesystem-like shapes.
const ROOM_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;
// Cap the payload of a single websocket frame to bound per-connection memory.
const MAX_PAYLOAD = 20 * 1024 * 1024; // 20 MB
// How long to keep an empty room's document before releasing it.
const EMPTY_ROOM_TTL_MS = 5000;

function roomNameFrom(req) {
  return (req.url || '/').slice(1).split('?')[0] || 'default';
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200); res.end('ok'); return; }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Clav.Strats collab server\n');
});

const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD });

wss.on('connection', (conn, req) => {
  // docName = url path without leading slash -> one shared doc per room
  const docName = roomNameFrom(req);
  setupWSConnection(conn, req, { docName, gc: true });

  // y-websocket only destroys a document once empty when a persistence layer is
  // configured; without one every room ever visited would leak its Y.Doc +
  // Awareness forever. Release empty rooms here after a short grace period.
  conn.on('close', () => {
    setTimeout(() => {
      const doc = docs.get(docName);
      if (doc && doc.conns.size === 0) {
        doc.destroy();
        docs.delete(docName);
      }
    }, EMPTY_ROOM_TTL_MS);
  });
});

server.on('upgrade', (req, socket, head) => {
  const docName = roomNameFrom(req);
  if (!ROOM_PATTERN.test(docName)) {
    socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

server.on('error', (error) => {
  console.error('[collab] server error:', error);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`[collab] Yjs websocket server on ws://${HOST}:${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT',  () => server.close(() => process.exit(0)));
