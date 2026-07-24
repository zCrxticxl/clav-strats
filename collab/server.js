#!/usr/bin/env node
// Standalone Yjs collaboration server for Clav.Strats.
// Rooms are keyed by the websocket path (clav-strat-<id>), one Y.Doc per room.
// Run:  node collab/server.js   (PORT / HOST via env, defaults 1234 / 0.0.0.0)
//
// Behind nginx terminate TLS and proxy wss:// -> this ws:// port (see COLLAB.md).

const http = require('http');
const { WebSocketServer } = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT) || 1234;

const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200); res.end('ok'); return; }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Clav.Strats collab server\n');
});

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (conn, req) => {
  // docName = url path without leading slash -> one shared doc per room
  const docName = (req.url || '/').slice(1).split('?')[0] || 'default';
  setupWSConnection(conn, req, { docName, gc: true });
});

server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

server.listen(PORT, HOST, () => {
  console.log(`[collab] Yjs websocket server on ws://${HOST}:${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT',  () => server.close(() => process.exit(0)));
