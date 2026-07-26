# Live Collaboration

Clav.Strats can host a temporary live-editing session directly from the Tauri
desktop app. The host does not need to start a terminal, configure a server,
open a router port, or manually copy a tunnel URL.

## Normal workflow

1. Open a strategy in the Tauri desktop app.
2. Click **Start Live Collab**.
3. Wait until the status changes to **live**.
4. Click **Share code** and send the copied invitation code.
5. The teammate opens Clav.Strats, pastes the complete code into
   **invite code**, and clicks **Join**.

The invitation contains both the random room id and the temporary encrypted
WebSocket endpoint. The teammate does not need to change any server setting.

## What starts automatically

The host app starts:

- an embedded, Yjs-compatible WebSocket server bound only to `127.0.0.1` on a
  random free port;
- a Cloudflare Quick Tunnel that exposes that local server through a temporary
  `wss://*.trycloudflare.com` endpoint.

If `cloudflared` is already installed, the app uses it. Otherwise, the Windows
app downloads the official executable from Cloudflare's GitHub release on the
first session and caches it under the app's local data directory. The tunnel
process and embedded server stop when the host leaves the session or exits the
app.

No inbound firewall rule or router port forwarding is required. The host must
keep Clav.Strats open while teammates are connected.

## Architecture

```text
Host Tauri app
  ├─ embedded yrs-warp server on 127.0.0.1:<random>
  └─ cloudflared Quick Tunnel
       └─ wss://<random>.trycloudflare.com
            ├─ host Yjs client
            └─ teammate Yjs clients
```

Shared Yjs maps:

- `elements`: strategy canvas elements keyed by element id;
- `lineups`: lineups keyed by map/side context;
- `meta`: strategy name, side, floor, map, description, and tags;
- awareness: names, cursors, selected tool, and online presence.

## Invitation format

New invitations start with `CLAV1.` and contain a versioned Base64URL payload:

```json
{ "v": 1, "r": "<room>", "s": "wss://<tunnel>.trycloudflare.com" }
```

Legacy raw room codes and old `clavstrats://join/<room>` values are still
accepted, but they use the locally configured/default collaboration server.

## Browser development fallback

Automatic hosting requires Tauri because a browser cannot launch local
processes. Browser-only development can still use the standalone Node server:

```bash
npm run collab
npm start
```

Then open two browser windows with the same room query, for example:

```text
http://localhost:3000/#/editor?room=test-room
```

## Limits and security

- Cloudflare Quick Tunnels are temporary and have no uptime guarantee. A new
  public endpoint is generated for every hosted session.
- Anyone who has the invitation code can edit that room while the host is
  online. Invitation codes should only be sent to intended teammates.
- Room state lives in memory on the host. Each client still auto-saves its own
  local copy of the strategy.
- The embedded server listens on loopback only; it is not directly exposed to
  the LAN or internet.

## Verification

```bash
npm test -- --watchAll=false
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml quick_tunnel_syncs_two_yjs_clients_through_the_embedded_server -- --ignored
```
