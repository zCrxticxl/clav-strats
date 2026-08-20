# Project Overview

## Purpose
Clav.Strats: a tactical strategy builder for Rainbow Six Siege. Draw arrows,
routes, zones and place operators/gadgets on map blueprints, then save and
export the strats. Runs in the browser or as a desktop app (Tauri 2 primary,
Electron legacy), with optional live Yjs/WebSocket collaboration.

## Tech Stack
- Backend: none (client-only SPA); optional Yjs WebSocket collab server
- Frontend: React 18, react-router-dom (HashRouter)
- DB: none. Browser localStorage
- Desktop: Tauri 2 (Rust, Windows NSIS + auto-updater) and Electron + electron-builder (portable, legacy)

## Structure
- /src/pages      → routed screens (Home, Library, Editor, Lineup, WallEditor)
- /src/components → UI components (editor overlays, renderers, tutorial)
- /src/hooks      → state + persistence (useStrats, useEditorHistory, useEditorViewport, useCollab, useEditorCollaboration, useTauriUpdater)
- /src/data       → static game data (maps, operators, gadgets, walls)
- /src/utils      → pure helpers (exportPng, wallDetector, collabSync, collabInvite, …)
- /public         → index.html, Electron main (electron.js), assets
- /collab         → standalone Node WebSocket collab server
- /src-tauri      → Tauri 2 Rust backend + embedded collab host

## Entry Points
- web main:   src/index.js → src/App.js
- electron:   public/electron.js (serves build/ on 127.0.0.1:45678)
- tauri:      src-tauri/src/main.rs → src-tauri/src/lib.rs

## Data Flow
User → React component → hook (state + localStorage) → re-render; collab edits
also sync through Yjs maps over WebSocket.

## Rules
- No business logic in UI components. Keep it in hooks/utils.
- Static game data lives in /src/data, not inline in components.
- Keep functions small.
