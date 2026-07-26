import React from 'react';
import { createCollabInvite } from '../../utils/collabInvite';

const initials = (name) => (name || '?').slice(0, 2).toUpperCase();

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
export function CollabBar({
  collab,
  room,
  inviteServerUrl,
  recovering = false,
  onStart,
  onJoin,
  onLeave,
  onToast,
}) {
  const [joinVal, setJoinVal] = React.useState('');
  const [starting, setStarting] = React.useState(false);
  const barStyle = {
    position: 'fixed', bottom: 96, right: 16, zIndex: 800,
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(8,10,14,0.95)', border: '1px solid var(--border-accent, #2a2f3a)',
    borderRadius: 10, padding: '7px 10px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
    fontFamily: 'var(--font-mono, monospace)', fontSize: 12,
  };

  if (!room) {
    const start = async () => {
      if (starting) return;
      setStarting(true);
      try {
        await onStart();
      } catch (error) {
        onToast?.(error?.message || String(error) || 'Live Collab could not be started');
      } finally {
        setStarting(false);
      }
    };
    const submitJoin = () => {
      if (!joinVal.trim()) return;
      try {
        onJoin(joinVal);
        setJoinVal('');
      } catch (error) {
        onToast?.(error?.message || String(error) || 'Invalid invitation code');
      }
    };
    return (
      <div style={barStyle}>
        <button className="topbar-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={start} disabled={starting} title="Automatically start a server and public tunnel">
          {starting ? 'Starting server & tunnel…' : '👥 Start Live Collab'}
        </button>
        <span style={{ color: 'var(--text-muted, #8a93a3)' }}>or</span>
        <input
          value={joinVal}
          onChange={e => setJoinVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submitJoin(); }}
          placeholder="invite code"
          style={{
            width: 150, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-mid, #2a2f3a)',
            borderRadius: 5, padding: '5px 8px', color: 'var(--text-primary, #e8edf2)',
            fontFamily: 'var(--font-mono, monospace)', fontSize: 12,
          }}
        />
        <button className="topbar-btn" onClick={submitJoin} title="Join using an invitation code">Join</button>
      </div>
    );
  }

  const invite = async () => {
    try {
      if (!collab.connected || collab.unreachable || recovering) {
        throw new Error('Wait until the collaboration tunnel is live before sharing.');
      }
      const code = createCollabInvite(room, inviteServerUrl || collab.serverUrl);
      await navigator.clipboard.writeText(code);
      onToast?.('Invitation copied — your teammate only needs to paste this code');
    } catch (error) {
      onToast?.(error?.message || 'Invitation could not be copied');
    }
  };

  const renameSelf = () => {
    const next = window.prompt('Your name (teammates see this):', collab.self?.name || '');
    if (next === null) return;
    collab.setUserName?.(next);
  };

  const dotColor = recovering ? '#4B9CE8' : collab.unreachable ? '#E84B4B' : collab.connected ? '#50E8A0' : '#E8B84B';
  const statusLabel = recovering
    ? 'repairing…'
    : collab.unreachable
    ? 'unreachable'
    : collab.connected ? (collab.synced ? 'live' : 'sync…') : 'connect…';
  const statusTitle = recovering
    ? 'The public tunnel stopped. A replacement is being started automatically.'
    : collab.unreachable
    ? `Cannot reach ${collab.serverUrl || 'the collaboration server'}. `
      + 'Invitation codes expire when the host closes the app — ask for a fresh one, '
      + 'or leave the session and start a new one.'
    : `Collaboration server: ${inviteServerUrl || collab.serverUrl || 'not connected'}`;

  return (
    <div style={barStyle}>
      <span title={statusTitle}
        style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, boxShadow: `0 0 6px ${dotColor}` }} />
      <span title={statusTitle} style={{ color: collab.unreachable && !recovering ? '#ff8080' : 'var(--text-muted, #8a93a3)' }}>
        {statusLabel}
      </span>

      {/* self + peer avatars — click your own to rename yourself */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {[{ clientId: 'self', user: collab.self }, ...collab.peers].map((p, i) => {
          const isSelf = p.clientId === 'self';
          return (
            <div key={p.clientId}
              onClick={isSelf ? renameSelf : undefined}
              title={isSelf ? `${p.user.name} (you) — click to rename` : p.user.name}
              style={{
                width: 22, height: 22, borderRadius: '50%', background: p.user.color,
                color: '#0b0d11', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 800, border: '1.5px solid #0b0d11',
                marginLeft: i === 0 ? 0 : -6,
                cursor: isSelf ? 'pointer' : 'default',
              }}>
              {initials(p.user.name)}
            </div>
          );
        })}
        <span style={{ marginLeft: 8, color: 'var(--text-muted, #8a93a3)' }}>{collab.peers.length + 1}</span>
      </div>

      <button className="topbar-btn" onClick={renameSelf}
        title="Change the name teammates see"
        style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        ✎ {collab.self?.name}
      </button>

      <button
        className="topbar-btn"
        onClick={invite}
        disabled={!collab.connected || collab.unreachable || recovering}
        title={collab.connected && !collab.unreachable && !recovering
          ? 'Copy the complete invitation code'
          : 'The invitation becomes available when the tunnel is live'}
      >
        🔗 Share code
      </button>
      <span style={{ color: 'var(--text-muted, #8a93a3)', letterSpacing: 1 }}>#{room}</span>
      <button className="topbar-btn" onClick={onLeave} title="Leave session"
        style={{ color: '#ff8080', borderColor: 'rgba(232,75,75,0.4)' }}>✕</button>
    </div>
  );
}
