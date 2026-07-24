# Clav.Strats — Rainbow Six Siege Strategy Builder

A full-featured tactical strategy builder for Rainbow Six Siege, inspired by Stratforge.gg and r6strat.com.

<a href="https://www.buymeacoffee.com/zCrxticxl"><img src="https://img.buymeacoffee.com/button-api/?text=donation for the work :)&emoji=&slug=zCrxticxl&button_colour=FF5F5F&font_colour=ffffff&font_family=Cookie&outline_colour=000000&coffee_colour=FFDD00" alt="Buy me a coffee" /></a>

## Features
- 🗺️ **Map Editor** — Draw arrows, routes, zones, and text on the competitive map pool
- 👤 **Operator Placement** — All R6 operators with icons from the community r6operators library
- 📂 **Strat Library** — Save, search, filter, and JSON export/import your strats locally
- 🏷️ **Tags & Metadata** — Side (ATK/DEF), tags, description per strat
- 💾 **Auto-Save** — All data stored in browser localStorage

## Competitive Map Pool
Bank · Border · Chalet · Clubhouse · Consulate · Fortress · Kafe Dostoyevsky · Nighthaven Labs

_Ranked maps (Oregon, Kanal, Coastline, etc.) are not shipped yet — blueprints
are added by dropping `.webp` files in `/public/blueprints/` and extending
`RANKED_MAPS` + `MAP_BLUEPRINTS` in `src/data/maps.js`._

## Local Setup

### Requirements
- Node.js 18+ (https://nodejs.org)
- npm (comes with Node.js)

### Installation

```bash
# 1. Navigate to the project folder
cd clav-strats

# 2. Install dependencies
npm install

# 3. Start local development server
npm start
```

The app will open automatically at http://localhost:3000

## Project Structure

```
clav-strats/
├── src/
│   ├── App.js           — Main app + navigation
│   ├── App.css          — Global styles (dark tactical theme)
│   ├── index.js         — React entry point
│   ├── data/
│   │   ├── maps.js      — All R6 maps + blueprint URLs
│   │   └── operators.js — All operators + icon URLs
│   ├── hooks/
│   │   └── useStrats.js — LocalStorage strat management
│   └── pages/
│       ├── HomePage.js  — Map selection landing page
│       ├── LibraryPage.js — Browse & search strats
│       └── EditorPage.js  — Full canvas editor
└── public/
    └── index.html
```

## Asset Credits
- **Map Blueprints**: r6maps.com (community reference tool)
- **Operator Icons**: github.com/marcopixel/r6operators (CC BY 4.0)

## Next Steps (Backend)
When ready to add a backend:
1. Node.js + Express API
2. PostgreSQL + Prisma for strat storage
3. User auth (JWT)
4. Share links
5. Docker + Nginx for VPS deployment

## Domain Setup (Later)
When deploying to your VPS, point `Clav.Strats.com` DNS A record to your server IP and configure Nginx to serve the built React app.
