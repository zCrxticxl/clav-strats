import { useEffect } from 'react';

// Checks for a Tauri update on startup and offers to install it.
// No-op outside the Tauri desktop app (e.g. plain browser / dev server).
export function useTauriUpdater() {
  useEffect(() => {
    // Only runs inside the Tauri webview.
    if (typeof window === 'undefined' || !window.__TAURI_INTERNALS__) return;
    let cancelled = false;

    (async () => {
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check();
        if (cancelled || !update?.available) return;

        const ok = window.confirm(
          `Update ${update.version} is available.\n\n${update.body || ''}\n\nInstall and restart now?`
        );
        if (!ok) return;

        await update.downloadAndInstall();
        const { relaunch } = await import('@tauri-apps/plugin-process');
        await relaunch();
      } catch (e) {
        // Network down, no release yet, etc. — fail silently.
        console.error('[updater]', e);
      }
    })();

    return () => { cancelled = true; };
  }, []);
}
