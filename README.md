# Clav.Strats: Rainbow Six Siege Strategy Builder

A tactical strategy builder for Rainbow Six Siege.

<a href="https://www.buymeacoffee.com/zCrxticxl"><img src="https://img.buymeacoffee.com/button-api/?text=donation for the work :)&emoji=&slug=zCrxticxl&button_colour=FF5F5F&font_colour=ffffff&font_family=Cookie&outline_colour=000000&coffee_colour=FFDD00" alt="Buy me a coffee" /></a>

## Features
- 🗺️ **Map Editor**: Draw arrows, routes, zones, text, operators, gadgets,
  reinforcements, barricades, rotates, headlines, feetlines, and vertical holes.
- 👤 **Operators & Gadgets**: Full R6 operator roster (community r6operators icons)
  plus gadget placement with wall/opening markers and per-player loadout limits.
- 🧱 **Wall Detection**: Auto-detects walls, doors, and hatches from blueprints;
  walls can also be edited in the dedicated Wall Editor.
- 📂 **Strat Library**: Save, search, filter, sort, duplicate, and JSON
  export/import your strats locally.
- 🏷️ **Tags & Metadata**: Side (ATK/DEF), tags, and description per strat.
- 💾 **Auto-Save**: Data is stored in browser `localStorage`.
- 👥 **Live Collaboration**: Real-time co-editing over Yjs/WebSocket, with
   automatic hosting from the Tauri desktop app (see `COLLAB.md`).
- ⏱️ **Strategy Timeline**: Persisted coordinated movement plans with shared
  playback, WebM export, and sampled GIF export.
- ✅ **Playbook Workflow**: Strategy folders, assigned phase tasks, live utility
  accounting, and reusable map callouts.

## Competitive Map Pool
Bank · Border · Chalet · Clubhouse · Consulate · Fortress · Kafe Dostoyevsky · Nighthaven Labs

_Ranked maps (Oregon, Kanal, Coastline, etc.) are not shipped yet. Blueprints
are added by dropping `.webp` files in `/public/blueprints/` and extending
`RANKED_MAPS` + `MAP_BLUEPRINTS` in `src/data/maps.js`._

## Platforms
- **Web**: `npm start` (dev) / `npm run build` (static `build/`).
- **Tauri 2 (primary desktop)**: Windows NSIS installer with a signed
  auto-updater (`src-tauri/`). See `TAURI.md`.
- **Electron (legacy)**: portable Windows build (`public/electron.js`,
  `electron-builder`). Kept for the `clavstrats://` deep-link handler.

## Local Setup

### Requirements
- Node.js 18+
- npm
- Rust toolchain (only for the Tauri build)

### Installation

```bash
npm install
npm start
```

The app opens at http://localhost:3000.

### Scripts

| Script | Purpose |
|---|---|
| `npm start` | Vite dev server |
| `npm run build` | Production build → `build/` |
| `npm test` | Jest test suite |
| `npm run collab` | Standalone Yjs collaboration server (dev fallback) |
| `npm run electron` | Run the Electron shell |
| `npm run tauri dev` / `npm run tauri build` | Tauri dev / Windows installer |
| `npm run verify:updater` | Verify the published Tauri update signature |

## Project Structure

```
clav-strats/
├── src/
│   ├── App.js              : routes + navigation (HashRouter)
│   ├── pages/              : Home, Library, Editor, Lineup, WallEditor
│   ├── components/         : editor overlays, renderers, tutorial
│   ├── hooks/              : useStrats, useEditorHistory, useEditorViewport,
│   │                          useCollab, useEditorCollaboration, useTauriUpdater
│   ├── data/               : maps, operators, gadgets, walls
│   └── utils/              : collab sync/invite, PNG export, wall detection, …
├── collab/server.js        : standalone Yjs WebSocket server
├── public/electron.js      : legacy Electron main process
└── src-tauri/              : Tauri 2 backend (Rust) + embedded collab host
```

## Asset Credits
- **Map Blueprints**: r6maps.com (community reference tool)
- **Operator Icons**: github.com/marcopixel/r6operators (CC BY 4.0)
