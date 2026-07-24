# Architecture

## Pattern
Client-only single-page app. No backend, no API layer, no database.
React 18 (SPA) rendered inside an Electron shell for the desktop build.

## Layers
- UI (React components/pages) — all rendering + interaction
- Hooks (`src/hooks`) — state + persistence logic (editor history, viewport, strats)
- Data (`src/data`) — static definitions (maps, operators, gadgets, walls)
- Utils (`src/utils`) — pure helpers (PNG export, wall detection)
- Electron shell (`public/electron.js`) — serves the built app from a local
  HTTP server on 127.0.0.1:45678 and provides the window + IPC.

## Persistence
Browser `localStorage` only (key `clav-strats` for strats, `clav-walls-v2` for
custom walls). No server sync. JSON export/import in the Library is the backup path.
An optional local `drive-sync.json` endpoint exists in the Electron server but is
not wired into the UI.

## Rules
- No business logic in JSX; keep it in hooks/utils.
- Static game data stays in `src/data`, never hard-coded in components.
- Canvas/export code must set `crossOrigin='anonymous'` on every image so
  Electron can keep `webSecurity` enabled.

## Data Flow
User → React component → hook (state + localStorage) → re-render.
No network round-trips.
