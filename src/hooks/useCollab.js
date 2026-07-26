import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// Base URL of the Yjs websocket server. Priority:
//   1. runtime override in localStorage (set automatically by hosting/joining),
//   2. REACT_APP_COLLAB_URL baked at build time,
//   3. local dev server.
export const COLLAB_URL_KEY = 'clav-collab-url';
export function getCollabUrl() {
  try {
    const override = localStorage.getItem(COLLAB_URL_KEY);
    if (override) return override;
  } catch { /* ignore */ }
  return process.env.REACT_APP_COLLAB_URL || 'ws://localhost:1234';
}

export function setCollabUrl(serverUrl) {
  try {
    const value = String(serverUrl || '').trim().replace(/\/$/, '');
    if (value) localStorage.setItem(COLLAB_URL_KEY, value);
    else localStorage.removeItem(COLLAB_URL_KEY);
  } catch { /* ignore */ }
}

// How long to wait before telling the user the endpoint looks dead.
export const UNREACHABLE_AFTER_MS = 8000;

const NAMES  = ['Ash', 'Thatcher', 'Jäger', 'Bandit', 'Mute', 'Thermite', 'Zofia', 'Ela'];
const COLORS = ['#E8B84B', '#4B9CE8', '#50E8A0', '#E84B4B', '#B04BE8', '#E8734B', '#41D6C3', '#F25C9A'];

// Display name shown to teammates. Persisted so it survives restarts.
export const COLLAB_NAME_KEY = 'clav-collab-name';
export const MAX_COLLAB_NAME_LENGTH = 24;

export function normalizeCollabName(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_COLLAB_NAME_LENGTH);
}

export function getStoredCollabName() {
  try {
    return normalizeCollabName(localStorage.getItem(COLLAB_NAME_KEY)) || null;
  } catch { return null; }
}

export function storeCollabName(name) {
  try {
    const value = normalizeCollabName(name);
    if (value) localStorage.setItem(COLLAB_NAME_KEY, value);
    else localStorage.removeItem(COLLAB_NAME_KEY);
  } catch { /* ignore */ }
}

function randomUser() {
  const i = Math.floor(Math.random() * NAMES.length);
  return {
    name: getStoredCollabName() || `${NAMES[i]}-${Math.floor(Math.random() * 900 + 100)}`,
    color: COLORS[i % COLORS.length],
  };
}

/**
 * useCollab — connects to a Yjs room and exposes shared maps + presence.
 *
 * @param {string|null} roomId  active room id, or null/'' for solo (no connection)
 * @param {string|null} serverUrlOverride endpoint selected by hosting/joining
 * @returns {{
 *   enabled: boolean,
 *   connected: boolean,
 *   self: {name,color},
 *   peers: Array<{clientId,user,cursor,tool}>,
 *   yElements: Y.Map|null,   // element-id -> element JSON
 *   yLineups:  Y.Map|null,   // ctxKey -> players JSON
 *   yMeta:     Y.Map|null,   // name/side/floor/map/description/tags
 *   ydoc: Y.Doc|null,
 *   setPresence: (partial) => void,
 * }}
 */
export function useCollab(roomId, serverUrlOverride = null) {
  const enabled = !!roomId;
  const serverUrl = String(serverUrlOverride || getCollabUrl()).trim().replace(/\/$/, '');
  const [self, setSelf] = useState(randomUser);
  const selfRef = useRef(self);
  selfRef.current = self;

  const docRef      = useRef(null);
  const provRef     = useRef(null);
  const [connected, setConnected] = useState(false);
  const [synced, setSynced]       = useState(false);
  const [peers, setPeers]         = useState([]);
  // y-websocket retries forever and stays silent about it. Without this the UI
  // would sit on "connecting…" indefinitely when the endpoint is dead — e.g. an
  // expired Cloudflare Quick Tunnel whose hostname no longer resolves.
  const [unreachable, setUnreachable] = useState(false);
  const [, forceTick]             = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const url = serverUrl;
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(url, `clav-strat-${roomId}`, ydoc);

    // Handlers are declared up front so teardown can always detach them, even if
    // setup throws before they are wired up.
    let unreachableTimer = null;
    let onStatus = null;
    let onSync = null;
    let onAwareness = null;
    let destroyed = false;

    const clearUnreachableTimer = () => {
      if (unreachableTimer !== null) {
        clearTimeout(unreachableTimer);
        unreachableTimer = null;
      }
    };
    const armUnreachableTimer = () => {
      clearUnreachableTimer();
      unreachableTimer = setTimeout(() => {
        if (!destroyed && !provider.wsconnected) setUnreachable(true);
      }, UNREACHABLE_AFTER_MS);
    };

    // If anything below throws, React never receives the cleanup — the provider
    // would then reconnect forever with no way to stop it (an invisible zombie
    // socket until the page is reloaded). So teardown is callable at any point.
    const teardown = () => {
      destroyed = true;
      clearUnreachableTimer();
      if (onAwareness) provider.awareness.off('change', onAwareness);
      if (onStatus) provider.off('status', onStatus);
      if (onSync) provider.off('sync', onSync);
      provider.destroy();
      ydoc.destroy();
      docRef.current = null;
      provRef.current = null;
      setConnected(false);
      setSynced(false);
      setUnreachable(false);
      setPeers([]);
    };

    try {
      docRef.current  = ydoc;
      provRef.current = provider;
      setUnreachable(false);

      armUnreachableTimer();

      provider.awareness.setLocalStateField('user', selfRef.current);

      onStatus = ({ status }) => {
        const isConnected = status === 'connected';
        setConnected(isConnected);
        if (isConnected) {
          clearUnreachableTimer();
          setUnreachable(false);
        } else {
          setSynced(false);
          armUnreachableTimer();
        }
      };
      provider.on('status', onStatus);

      // 'sync' fires once the initial room state has been received — only then is
      // it safe to push local state, otherwise an empty joiner could wipe the doc.
      onSync = (isSynced) => setSynced(isSynced);
      provider.on('sync', onSync);

      onAwareness = () => {
        const states = [];
        provider.awareness.getStates().forEach((state, clientId) => {
          if (clientId === provider.awareness.clientID) return;
          if (!state.user) return;
          states.push({ clientId, user: state.user, cursor: state.cursor || null, tool: state.tool || null });
        });
        setPeers(states);
      };
      provider.awareness.on('change', onAwareness);

      forceTick(n => n + 1); // re-render so consumers pick up the now-ready maps
    } catch (error) {
      teardown();
      throw error;
    }

    return teardown;
  }, [enabled, roomId, serverUrl]);

  const setPresence = useCallback((partial) => {
    const aw = provRef.current?.awareness;
    if (!aw) return;
    for (const [k, v] of Object.entries(partial)) aw.setLocalStateField(k, v);
  }, []);

  // Rename yourself so teammates can tell who is who. Persists and broadcasts
  // immediately; an empty name falls back to the generated one.
  const setUserName = useCallback((name) => {
    const value = normalizeCollabName(name);
    setSelf(previous => {
      const next = { ...previous, name: value || previous.name };
      selfRef.current = next;
      provRef.current?.awareness?.setLocalStateField('user', next);
      return next;
    });
    storeCollabName(value);
  }, []);

  const ydoc = docRef.current;
  return {
    enabled,
    connected,
    synced,
    unreachable,
    serverUrl: enabled ? serverUrl : null,
    self,
    setUserName,
    peers,
    ydoc,
    yElements: ydoc ? ydoc.getMap('elements') : null,
    yLineups:  ydoc ? ydoc.getMap('lineups')  : null,
    yMeta:     ydoc ? ydoc.getMap('meta')     : null,
    setPresence,
  };
}
