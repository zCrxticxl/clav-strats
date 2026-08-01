# Clav.Strats

Cross-platform Rainbow Six Siege strategy planner with a map editor, a local strategy library, import/export, and optional live collaboration. Built with React and Tauri.

> **Status:** actively developed. Strategies are stored locally by default; collaboration is optional and requires a separately configured server.

## What it does

- Draw routes, zones, arrows, text, and tactical callouts on competitive-map blueprints.
- Place operators and gadgets, then save, search, filter, import, and export strategies.
- Work offline with local storage, or connect to a collaboration server for shared editing.
- Package the app as a Windows desktop app through Tauri.

## Quick start

### Web development

Requires Node.js 20+ and npm.

```bash
git clone https://github.com/zCrxticxl/clav-strats.git
cd clav-strats
cp .env.example .env
npm ci
npm start
```

The development server runs at `http://localhost:3000`.

### Desktop development

Install the Rust stable toolchain and the Tauri prerequisites for your operating system, then run:

```bash
npm run tauri dev
```

## Data and collaboration

Local mode stores strategies in the browser profile. Use JSON export before clearing browser data or moving to another device.

To enable collaboration, set `REACT_APP_COLLAB_URL` in `.env` to a trusted WebSocket endpoint, then start the collaboration service as documented in [COLLAB.md](COLLAB.md). Do not publish an unauthenticated collaboration endpoint.

## Quality checks

```bash
npm test -- --watchAll=false
npm run build
```

CI runs the test suite and production build for every pull request and push to `main`.

## Project documentation

- [Architecture](ARCHITECTURE.md)
- [Collaboration setup](COLLAB.md)
- [Tauri desktop build](TAURI.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## Credits

- Map blueprints: [r6maps.com](https://r6maps.com/) (community reference tool)
- Operator icons: [marcopixel/r6operators](https://github.com/marcopixel/r6operators) (CC BY 4.0)

## License and commercial use

Clav.Strats is source-available under the included [PolyForm Noncommercial License 1.0.0](LICENSE). Private and other non-commercial use is permitted. Commercial use, redistribution in paid offerings, managed-service use, and enterprise deployment require a separate written agreement; see [commercial licensing](COMMERCIAL-LICENSING.md).
