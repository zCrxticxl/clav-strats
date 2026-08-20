const { app, BrowserWindow, dialog } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, '../build');
const PORT = 45678;

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
};

let mainWin = null;

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = req.url.split('?')[0];

      // Static file serving. Normalize the path and confine it to BUILD_DIR so
      // a crafted request (e.g. /../../secret) can't escape the build folder.
      let safePath;
      try {
        safePath = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
      } catch {
        // Malformed percent-encoding (e.g. /%zz) is rejected instead of crashing.
        res.writeHead(400); res.end('Bad Request'); return;
      }
      let filePath = path.join(BUILD_DIR, safePath);
      if (!filePath.startsWith(BUILD_DIR) || !path.extname(filePath) || !fs.existsSync(filePath)) {
        filePath = path.join(BUILD_DIR, 'index.html');
      }
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });

    server.on('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function createWindow() {
  try {
    await startServer();
  } catch (e) {
    dialog.showErrorBox(
      'Clav.Strats',
      `Could not start the local server on port ${PORT} (is another copy running?)\n\n${e.message}`
    );
    app.quit();
    return;
  }

  mainWin = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    title: 'Clav.Strats',
    icon: path.join(__dirname, 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // webSecurity stays ON: canvas export loads remote icons/blueprints with
      // crossOrigin='anonymous' and those hosts send Access-Control-Allow-Origin,
      // so the canvas is never tainted and PNG export still works.
      webSecurity: true,
    },
    backgroundColor: '#080A0E',
  });

  mainWin.loadURL(`http://127.0.0.1:${PORT}`);
  mainWin.setMenuBarVisibility(false);

  // F12 toggles DevTools (menu is hidden, so guarantee an accelerator for debugging)
  mainWin.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') mainWin.webContents.toggleDevTools();
  });
}

// ── Deep link: clavstrats://join/<roomId> ──────────────────────────────────
const PROTOCOL = 'clavstrats';

function roomFromDeepLink(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/^clavstrats:\/\/join\/([\w-]+)/i);
  return m ? m[1] : null;
}

function openRoom(roomId) {
  if (!roomId) return;
  const target = `http://127.0.0.1:${PORT}/#/editor?room=${encodeURIComponent(roomId)}`;
  if (mainWin) {
    if (mainWin.isMinimized()) mainWin.restore();
    mainWin.focus();
    mainWin.loadURL(target);
  }
}

// Register as the default handler for clavstrats:// (dev needs argv hint on win)
if (process.defaultApp && process.argv.length >= 2) {
  app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

// Single instance: forward a deep link from a second launch to the running app
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  // Room requested at cold start (Windows/Linux pass the URL in argv)
  let pendingRoom = roomFromDeepLink(process.argv.find(a => a.startsWith(`${PROTOCOL}://`)));

  app.on('second-instance', (_e, argv) => {
    const url = argv.find(a => a.startsWith(`${PROTOCOL}://`));
    const room = roomFromDeepLink(url);
    if (room) openRoom(room);
    else if (mainWin) { if (mainWin.isMinimized()) mainWin.restore(); mainWin.focus(); }
  });

  // macOS delivers deep links via open-url
  app.on('open-url', (event, url) => {
    event.preventDefault();
    const room = roomFromDeepLink(url);
    if (mainWin) openRoom(room);
    else pendingRoom = room;
  });

  app.whenReady().then(async () => {
    await createWindow();
    if (pendingRoom && mainWin) {
      mainWin.webContents.once('did-finish-load', () => openRoom(pendingRoom));
    }
  });

  app.on('window-all-closed', () => app.quit());
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
