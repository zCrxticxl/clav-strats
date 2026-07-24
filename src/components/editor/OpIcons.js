import { useState } from 'react';

export function OpIcon({ op, color }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="op-icon">
      {failed
        ? <div className="op-icon-fallback" style={{ background: color + '22', color }}>{op.name[0]}</div>
        : <img src={op.icon} alt={op.name} draggable={false} onError={() => setFailed(true)} />}
    </div>
  );
}

export function OpImg({ op, color }) {
  const [failed, setFailed] = useState(false);
  if (failed) return (
    <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color }}>
      {op.name[0]}
    </span>
  );
  return (
    <img
      src={op.icon} alt={op.name} draggable={false}
      style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
      onError={() => setFailed(true)}
    />
  );
}

export function MiniOpIcon({ op, color }) {
  const [failed, setFailed] = useState(false);
  return (
    <div style={{
      width: 22, height: 22, borderRadius: '50%',
      border: `2px solid ${color}`, background: 'var(--bg-deep)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0,
    }}>
      {failed
        ? <span style={{ fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, color }}>{op.name[0]}</span>
        : <img src={op.icon} alt={op.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={() => setFailed(true)} />}
    </div>
  );
}

export function StripOpIcon({ op, color }) {
  const [failed, setFailed] = useState(false);
  if (!op) return null;
  return failed
    ? <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color }}>{op.name[0]}</span>
    : <img src={op.icon} alt={op.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={() => setFailed(true)} />;
}
