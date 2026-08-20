# Architecture

## Pattern
Client-only React 18 single-page app (SPA). No API layer or database. The same
React build is rendered in three shells:

1. **Web**: Vite dev server (`npm start`) or static `build/` (`npm run build`).
2. **Tauri 2** (primary desktop): OS webview (WebView2 on Windows) that serves
   `build/` directly (`src-tauri/tauri.conf.json` `frontendDist`). Provides the
   auto-updater and the embedded collaboration host.
3. **Electron** (legacy): serves `build/` over a localhost HTTP server on
   `127.0.0.1:45678` (`public/electron.js`). Provides the `clavstrats://` deep
   link handler.

The Tauri release pipeline is the shipping path (`release.yml`); Electron has no
CI release and its distinct features are limited to deep links.

## Layers
- UI (React components/pages): all rendering + interaction
- Hooks (`src/hooks`): state + persistence + collaboration (strats, editor
  history, viewport, Yjs collab, Tauri updater)
- Data (`src/data`): static definitions (maps, operators, gadgets, walls)
- Utils (`src/utils`): pure helpers (PNG export, wall detection, collab
  sync/invite, element ids/colors)
- Desktop shells (`public/electron.js`, `src-tauri/`): window + native features

## Persistence
Browser `localStorage` only. Keys:
- `clav-strats`: the strat list (array of strat objects)
- `clav-walls-v2`: custom wall data (auto-detected + hand-edited)
- `clav-lineups-v2`: saved lineups
- `clav-strat-folders`: playbook folder metadata
- `clav-callouts-v1`: reusable custom map callouts
- `clav-collab-url` / `clav-collab-name`: collab endpoint + display name
- `clav-tutorial-done`: tutorial dismissed flag

Strategy records use `schemaVersion: 2`. Older records are migrated on load and
import: missing side defaults to Defender, missing timeline data becomes an
empty timeline, lineups receive stable player-slot IDs, and legacy owned
elements are associated by color when possible. Reads guard against corrupt
JSON, and JSON export/import in the Library is the backup path.

## Collaboration
Yjs documents synced over WebSocket. Elements, lineups, metadata, and the
logical timeline are shared through separate maps. The client (`useCollab`,
`useEditorCollaboration`) and a server (`collab/server.js` for dev, or the
embedded Rust server in `src-tauri/src/collab_host.rs` behind a Cloudflare Quick
Tunnel for the desktop host). See `COLLAB.md`.

## Rules
- No business logic in JSX; keep it in hooks/utils.
- Static game data stays in `src/data`, never hard-coded in components.
- Canvas/export code must set `crossOrigin='anonymous'` on every image so
  Electron can keep `webSecurity` enabled.

## Data Flow
```
UI → React component → hook (state + localStorage) → re-render
                          └→ Yjs maps → WebSocket → peers (collab)
```
