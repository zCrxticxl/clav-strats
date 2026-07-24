# Live Collaboration (Yjs)

Real-time co-editing of a strat: multiple people draw on the same blueprint in
parallel, with live cursors and presence. Built on **Yjs (CRDT)** + a
self-hosted **y-websocket** server. Access is between Electron desktop clients
via a `clavstrats://join/<room>` deep link.

## Architecture

```
Electron client A ─┐                     ┌─ Y.Doc (elements / lineups / meta)
Electron client B ─┼── wss:// ── nginx ──┤   awareness (cursors / presence)
Electron client C ─┘         (TLS)       └─ collab/server.js  (node + ws)
```

- `collab/server.js` — standalone y-websocket server, one `Y.Doc` per room.
- `src/hooks/useCollab.js` — client: connects, exposes shared maps + presence.
- `src/pages/EditorPage.js` — two-way sync of `elements`, `lineupsByContext`
  and meta (name/side/floor/map/tags) into Yjs; broadcasts the local cursor.
- `public/electron.js` — registers the `clavstrats://` protocol + single-instance
  handling so an invite link opens the room in the running app.

Shared state model: `elements` is a `Y.Map` keyed by element id (per-element
CRDT, so two people editing different elements never clobber each other).

## 1. Install deps

```bash
npm install          # pulls yjs, y-websocket, ws
```

## 2. Run the collab server

Local test:

```bash
npm run collab       # ws://localhost:1234
```

On your VPS (persistent, behind TLS):

```bash
# systemd unit: /etc/systemd/system/clav-collab.service
[Unit]
Description=Clav.Strats collab server
After=network.target

[Service]
WorkingDirectory=/opt/clav-strats
ExecStart=/usr/bin/node collab/server.js
Environment=PORT=1234
Restart=always
User=clav

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now clav-collab
```

nginx TLS termination → ws upstream:

```nginx
server {
  listen 443 ssl;
  server_name collab.clav-strats.com;

  ssl_certificate     /etc/letsencrypt/live/collab.clav-strats.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/collab.clav-strats.com/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:1234;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;
  }
}
```

## 3. Point the client at the server

The client reads `REACT_APP_COLLAB_URL` at build time. Default is
`ws://localhost:1234`. For production:

```bash
# .env  (project root, picked up by react-scripts)
REACT_APP_COLLAB_URL=wss://collab.clav-strats.com
```

Then rebuild: `npm run build` (or `npm run dist` for the packaged app).

## 4. Use it

1. Open a strat in the editor.
2. Click **👥 Live-Collab starten** (top-right bar). A room id is added to the URL.
3. Click **🔗 Invite** — the `clavstrats://join/<room>` link is copied.
4. Send it to teammates. Opening it launches/focuses their Clav.Strats app and
   joins the room. Everyone sees the same board, live cursors and presence.
5. **✕** leaves the session (goes back to solo/local editing).

## Testing locally with two clients

```bash
# terminal 1
npm run collab
# terminal 2
npm start                 # http://localhost:3000
```

Open two browser windows on `http://localhost:3000/#/editor?room=test123`
(deep links only work in the packaged Electron app; in the browser just share
the `?room=` URL). Draw in one — it appears in the other in real time.

## Notes / limits

- **Persistence:** rooms live in server memory only. When the last peer leaves
  and GC runs, the doc is dropped. Each client still auto-saves its own copy to
  localStorage, and you can JSON-export from the Library. For durable rooms, add
  `y-leveldb` persistence to `collab/server.js`.
- **Undo** stays local per user during a session (remote edits don't pollute
  your undo stack).
- **Element z-order** follows Y.Map insertion order; deleting + re-adding an
  element can shift its layer. Fine for tactical drawings; revisit if it bites.
- **Auth:** the server accepts any room id. Room ids are random and unguessable,
  but there is no login — anyone with the link can edit. Add a token check in
  `server.js` if you need access control.
- **End-to-end multiplayer was not run in this environment** (needs the VPS +
  two clients). Code compiles and the sync logic is guarded against the
  empty-joiner-wipes-doc race, but do a two-client smoke test before relying on it.
