# Project Overview

## Purpose
Clav.Strats — a tactical strategy builder for Rainbow Six Siege: draw arrows,
routes, zones and place operators/gadgets on map blueprints, then save and
export the strats. Runs in the browser or as an Electron desktop app.

## Tech Stack
- Backend: none (client-only)
- Frontend: React 18, react-router-dom (HashRouter)
- DB: none — browser localStorage
- Other: Electron 28 desktop shell, electron-builder (portable Windows build)

## Structure
- /src/pages      → routed screens (Home, Library, Editor, Lineup, WallEditor)
- /src/components → UI components (editor overlays, tutorial)
- /src/hooks      → state + persistence (useStrats, useEditorHistory, useEditorViewport)
- /src/data       → static game data (maps, operators, gadgets, walls)
- /src/utils      → pure helpers (exportPng, wallDetector)
- /public         → index.html, Electron main (electron.js), assets

## Entry Points
- web main:   src/index.js → src/App.js
- electron:   public/electron.js (main process, serves build/ on 127.0.0.1:45678)

## Data Flow
User → React component → hook (state + localStorage) → re-render. No API/DB.

## Rules
- No business logic in UI components — keep it in hooks/utils.
- Static game data lives in /src/data, not inline in components.
- Keep functions small.
