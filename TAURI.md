# Clav.Strats as a Tauri app

Tauri wraps the existing React build in a tiny native window using the OS webview
(WebView2 on Windows) instead of bundling Chromium. Result: ~5–10 MB installer
instead of ~150 MB, and a built-in auto-updater. The React frontend is unchanged —
Electron and Tauri coexist in this repo.

## What was added

```
src-tauri/
├── Cargo.toml            Rust deps + release profile
├── build.rs              tauri build hook
├── tauri.conf.json       window, bundle, frontend = ../build
├── capabilities/
│   └── default.json      window permissions
└── src/
    ├── main.rs           desktop entrypoint
    └── lib.rs            app builder (shared desktop/mobile)
```

`package.json` gained a `tauri` script and the `@tauri-apps/cli` dev dependency.
Nothing about the Electron setup changed.

## Prerequisites (one time)

You already have these from AD HyperOptimize, but for reference:
- Rust toolchain: https://rustup.rs
- On Windows: "Microsoft Visual Studio C++ Build Tools" + WebView2 runtime
  (WebView2 ships with Windows 11 already).

## 1. Install JS deps

```bash
npm install          # pulls @tauri-apps/cli
```

## 2. Generate icons (required before the first build)

Tauri needs a set of icons. Point it at any square PNG (≥ 512×512) — your logo:

```bash
npm run tauri icon path\to\logo.png
```

This fills `src-tauri/icons/` with every size the bundler expects.

## 3. Develop

```bash
npm run tauri dev
```

Starts the CRA dev server (`npm start`) and opens the native window pointing at it,
with hot reload. Tip: set `BROWSER=none` in a `.env` so CRA doesn't also open a
browser tab.

## 4. Build the installer

```bash
npm run tauri build
```

Output: `src-tauri/target/release/bundle/nsis/Clav.Strats_1.0.0_x64-setup.exe`
(a proper installer that registers the app, ~5–10 MB).

This fixes the missing-images problem from the Electron portable build: Tauri
serves `build/` (blueprints, icons) natively — no custom localhost HTTP server.

---

## Auto-updater (already wired) — GitHub Releases flow

The updater is **already set up in code**: plugin registered in `lib.rs`, config in
`tauri.conf.json` (`plugins.updater` + `bundle.createUpdaterArtifacts`), permissions
in `capabilities/default.json`, and a startup check in `src/hooks/useTauriUpdater.js`
(prompts "Update x.y available — install now?" and relaunches). Installed apps poll
GitHub, verify the download against your public key, and self-update on one click.

You only have to do the setup below **once**, then repeat the release step per update.

### One-time setup

1. **Generate a signing key** (keep the private key + password secret):
   ```bash
   npm run tauri signer generate -- -w %USERPROFILE%\.tauri\clav-strats.key
   ```
   Copy the printed **public key**.

2. **Paste the public key** into `src-tauri/tauri.conf.json` →
   `plugins.updater.pubkey` (replace `PASTE_YOUR_TAURI_PUBLIC_KEY_HERE`).

3. **Set your GitHub repo** in the same file's `endpoints`. Create a **public**
   repo (releases must be publicly downloadable) — it can just hold releases:
   ```
   https://github.com/YOUR_GH_USER/clav-strats/releases/latest/download/latest.json
   ```
   The `releases/latest/download/...` path always resolves to your newest release,
   so the endpoint never changes.

4. `npm install` (pulls the two `@tauri-apps/plugin-*` frontend packages).

### Per release

1. Bump `version` in **both** `src-tauri/tauri.conf.json` and `package.json`.
2. Build with the signing key in env:
   ```bat
   set TAURI_SIGNING_PRIVATE_KEY=%USERPROFILE%\.tauri\clav-strats.key
   set TAURI_SIGNING_PRIVATE_KEY_PASSWORD=your-key-password
   npm run tauri build
   ```
   Output in `src-tauri\target\release\bundle\nsis\`:
   - `Clav.Strats_x.y.z_x64-setup.exe`
   - `Clav.Strats_x.y.z_x64-setup.exe.sig`  ← the signature
3. Write `latest.json` (paste the **contents** of the `.sig` file as `signature`):
   ```json
   {
     "version": "1.0.1",
     "notes": "What changed",
     "pub_date": "2026-07-24T00:00:00Z",
     "platforms": {
       "windows-x86_64": {
         "signature": "<contents of the .sig file>",
         "url": "https://github.com/YOUR_GH_USER/clav-strats/releases/download/v1.0.1/Clav.Strats_1.0.1_x64-setup.exe"
       }
     }
   }
   ```
4. On GitHub: **Releases → Draft new release**, tag `v1.0.1`, and upload
   **both** the `-setup.exe` and `latest.json` as assets. Publish.

Done — every installed app checks on next launch and offers the update.

### Fully automated (optional)

The `tauri-apps/tauri-action` GitHub Action does steps 2–4 for you (build, sign,
create the release, generate `latest.json`) on every tag push. Ask and I'll add the
workflow file + the secrets you need (`TAURI_SIGNING_PRIVATE_KEY`, its password).

---

## Optional: clavstrats:// deep links

Only needed if you want invite links to open the app (room codes already work
without it). Add:
```toml
tauri-plugin-deep-link = "2"
```
Register in `lib.rs`, declare the scheme under `plugins.deep-link` in
`tauri.conf.json`, and handle the URL to navigate to `#/editor?room=<id>`. See
https://v2.tauri.app/plugin/deep-linking/.

---

## Once Tauri is verified, drop Electron (optional)

When the Tauri build works end to end, you can delete `public/electron.js`,
`public/preload.js`, the `electron`/`electron-builder` devDeps, and the `electron`
/ `dist` scripts. Until then both stay — nothing is broken.
