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

const NAMES  = ['Ash', 'Thatcher', 'Jäger', 'Bandit', 'Mute', 'Thermite', 'Zofia', 'Ela'];
const COLORS = ['#E8B84B', '#4B9CE8', '#50E8A0', '#E84B4B', '#B04BE8', '#E8734B', '#41D6C3', '#F25C9A'];

function randomUser() {
  const i = Math.floor(Math.random() * NAMES.length);
  return { name: `${NAMES[i]}-${Math.floor(Math.random() * 900 + 100)}`, color: COLORS[i % COLORS.length] };
}

/**
 * useCollab — connects to a Yjs room and exposes shared maps + presence.
 *
 * @param {string|null} roomId  active room id, or null/'' for solo (no connection)
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
export function useCollab(roomId) {
  const enabled = !!roomId;
  const selfRef = useRef(null);
  if (!selfRef.current) selfRef.current = randomUser();

  const docRef      = useRef(null);
  const provRef     = useRef(null);
  const [connected, setConnected] = useState(false);
  const [synced, setSynced]       = useState(false);
  const [peers, setPeers]         = useState([]);
  const [, forceTick]             = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(getCollabUrl(), `clav-strat-${roomId}`, ydoc);
    docRef.current  = ydoc;
    provRef.current = provider;

    provider.awareness.setLocalStateField('user', selfRef.current);

    const onStatus = ({ status }) => setConnected(status === 'connected');
    provider.on('status', onStatus);

    // 'sync' fires once the initial room state has been received — only then is
    // it safe to push local state, otherwise an empty joiner could wipe the doc.
    const onSync = (isSynced) => setSynced(isSynced);
    provider.on('sync', onSync);

    const onAwareness = () => {
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

    return () => {
      provider.awareness.off('change', onAwareness);
      provider.off('status', onStatus);
      provider.off('sync', onSync);
      provider.destroy();
      ydoc.destroy();
      docRef.current = null;
      provRef.current = null;
      setConnected(false);
      setSynced(false);
      setPeers([]);
    };
  }, [enabled, roomId]);

  const setPresence = useCallback((partial) => {
    const aw = provRef.current?.awareness;
    if (!aw) return;
    for (const [k, v] of Object.entries(partial)) aw.setLocalStateField(k, v);
  }, []);

  const ydoc = docRef.current;
  return {
    enabled,
    connected,
    synced,
    self: selfRef.current,
    peers,
    ydoc,
    yElements: ydoc ? ydoc.getMap('elements') : null,
    yLineups:  ydoc ? ydoc.getMap('lineups')  : null,
    yMeta:     ydoc ? ydoc.getMap('meta')     : null,
    setPresence,
  };
}
