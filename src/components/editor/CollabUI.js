import React from 'react';
import { COLLAB_URL_KEY, getCollabUrl } from '../../hooks/useCollab';

const initials = (name) => (name || '?').slice(0, 2).toUpperCase();

// Prompt for the collab server URL and store it (runtime override, no rebuild).
function editServerUrl(onToast) {
  const current = getCollabUrl();
  const next = window.prompt(
    'Collab server URL (e.g. wss://your-tunnel.trycloudflare.com or ws://localhost:1234):',
    current,
  );
  if (next == null) return;
  const val = next.trim();
  try {
    if (val) localStorage.setItem(COLLAB_URL_KEY, val);
    else localStorage.removeItem(COLLAB_URL_KEY);
    onToast?.('Server saved — restart the session');
  } catch { /* ignore */ }
}

// Remote peer cursors, rendered inside the %-coordinate canvas container.
export function CollabCursors({ peers }) {
  return (
    <>
      {peers.filter(p => p.cursor).map(p => (
        <div key={p.clientId}
          style={{
            position: 'absolute', left: `${p.cursor.x}%`, top: `${p.cursor.y}%`,
            transform: 'translate(-2px,-2px)', pointerEvents: 'none', zIndex: 500,
            transition: 'left 0.06s linear, top 0.06s linear',
          }}>
          <svg width="18" height="18" viewBox="0 0 18 18" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}>
            <path d="M2 2 L2 14 L6 10 L9 16 L11 15 L8 9 L14 9 Z" fill={p.user.color} stroke="#0b0d11" strokeWidth="1" />
          </svg>
          <div style={{
            marginTop: 1, marginLeft: 6, padding: '1px 5px', borderRadius: 3,
            background: p.user.color, color: '#0b0d11', fontSize: 9, fontWeight: 700,
            fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'nowrap',
          }}>
            {p.user.name}
          </div>
        </div>
      ))}
    </>
  );
}

// Floating collaboration control: start a session, join, show peers, invite, leave.
export function CollabBar({ collab, room, onStart, onJoin, onLeave, onToast }) {
  const [joinVal, setJoinVal] = React.useState('');
  const barStyle = {
    position: 'fixed', bottom: 96, right: 16, zIndex: 800,
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(8,10,14,0.95)', border: '1px solid var(--border-accent, #2a2f3a)',
    borderRadius: 10, padding: '7px 10px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
    fontFamily: 'var(--font-mono, monospace)', fontSize: 12,
  };

  if (!room) {
    const submitJoin = () => { if (joinVal.trim()) { onJoin(joinVal); setJoinVal(''); } };
    return (
      <div style={barStyle}>
        <button className="topbar-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={onStart} title="Start a live session and invite teammates">
          👥 Start Live Collab
        </button>
        <span style={{ color: 'var(--text-muted, #8a93a3)' }}>or</span>
        <input
          value={joinVal}
          onChange={e => setJoinVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submitJoin(); }}
          placeholder="room code"
          style={{
            width: 100, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-mid, #2a2f3a)',
            borderRadius: 5, padding: '5px 8px', color: 'var(--text-primary, #e8edf2)',
            fontFamily: 'var(--font-mono, monospace)', fontSize: 12,
          }}
        />
        <button className="topbar-btn" onClick={submitJoin} title="Join a room by its code">Join</button>
        <button className="topbar-btn" onClick={() => editServerUrl(onToast)} title="Set collab server URL">⚙</button>
      </div>
    );
  }

  const invite = () => {
    try {
      navigator.clipboard.writeText(room);
      onToast?.('Room code copied — share it, teammates paste it in Join');
    } catch {
      window.prompt('Room code (share with teammates):', room);
    }
  };

  const dotColor = collab.connected ? '#50E8A0' : '#E8B84B';
  const statusLabel = collab.connected ? (collab.synced ? 'live' : 'sync…') : 'connect…';

  return (
    <div style={barStyle}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, boxShadow: `0 0 6px ${dotColor}` }} />
      <span style={{ color: 'var(--text-muted, #8a93a3)' }}>{statusLabel}</span>

      {/* self + peer avatars */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {[{ clientId: 'self', user: collab.self }, ...collab.peers].map((p, i) => (
          <div key={p.clientId}
            title={p.clientId === 'self' ? `${p.user.name} (you)` : p.user.name}
            style={{
              width: 22, height: 22, borderRadius: '50%', background: p.user.color,
              color: '#0b0d11', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 800, border: '1.5px solid #0b0d11',
              marginLeft: i === 0 ? 0 : -6,
            }}>
            {initials(p.user.name)}
          </div>
        ))}
        <span style={{ marginLeft: 8, color: 'var(--text-muted, #8a93a3)' }}>{collab.peers.length + 1}</span>
      </div>

      <button className="topbar-btn" onClick={invite} title="Copy room code to share">🔗 Share code</button>
      <button className="topbar-btn" onClick={() => editServerUrl(onToast)} title="Set collab server URL">⚙</button>
      <span style={{ color: 'var(--text-muted, #8a93a3)', letterSpacing: 1 }}>#{room}</span>
      <button className="topbar-btn" onClick={onLeave} title="Leave session"
        style={{ color: '#ff8080', borderColor: 'rgba(232,75,75,0.4)' }}>✕</button>
    </div>
  );
}
