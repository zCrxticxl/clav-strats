import React, { useState, useEffect } from 'react';

const STEPS = [
  {
    title: 'Welcome to CLAV.STRATS',
    icon: '⬡',
    text: 'Plan your Rainbow Six Siege strategies with interactive map blueprints. This quick tutorial walks you through the key features.',
  },
  {
    title: 'Select a Map & Strat',
    icon: '🗺',
    text: 'Click the map button in the top bar to pick a map. Switch floors using the tabs above the map. Strats are saved automatically.',
  },
  {
    title: 'Drawing Tools',
    icon: '✏️',
    text: 'On the left you\'ll find all tools: arrows for routes, zones for areas, operator tokens, reinforcements for walls, barricades for doors. All have keyboard shortcuts (A, Z, O, F, B...).',
  },
  {
    title: 'Lineup',
    icon: '👥',
    text: 'The lineup bar at the bottom shows your team. Click a player to select them — everything you place after will use their color. Double-click to edit their operator and gadgets.',
  },
  {
    title: 'Lineup Creator',
    icon: '📋',
    text: 'In the Lineup Creator (top nav) you can save full team lineups with operators, gadgets and roles. Load them directly into the strat editor with one click.',
  },
  {
    title: 'Export & Library',
    icon: '📷',
    text: 'Export to PNG with lineup panel via the 📷 button. The Library shows all saved strats with preview, filters, sorting and duplication. Good luck!',
  },
];

const STORAGE_KEY = 'clav-tutorial-done';

export default function Tutorial() {
  const [open, setOpen]  = useState(false);
  const [step, setStep]  = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) setOpen(true);
  }, []);

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
    setStep(0);
  };

  if (!open) return (
    <button
      onClick={() => { setStep(0); setOpen(true); }}
      style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 8000,
        width: 38, height: 38, borderRadius: '50%',
        background: 'var(--bg-panel)', border: '1px solid var(--border-mid)',
        color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; e.currentTarget.style.color = 'var(--accent-gold)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
      title="Open tutorial"
    >?</button>
  );

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={finish}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-accent)',
        borderRadius: 14, padding: 36, maxWidth: 440, width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', gap: 6, marginBottom: 24, justifyContent: 'center' }}>
          {STEPS.map((_, i) => (
            <div key={i} onClick={() => setStep(i)} style={{
              width: i === step ? 20 : 6, height: 6, borderRadius: 3,
              background: i === step ? 'var(--accent-gold)' : i < step ? 'rgba(232,184,75,0.4)' : 'var(--border-mid)',
              cursor: 'pointer', transition: 'all 0.2s',
            }} />
          ))}
        </div>

        <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 16 }}>{s.icon}</div>

        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--accent-gold)', textAlign: 'center', marginBottom: 12, letterSpacing: 0.5 }}>
          {s.title}
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, textAlign: 'center', marginBottom: 28 }}>
          {s.text}
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              style={{ padding: '8px 20px', background: 'none', border: '1px solid var(--border-mid)', borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
              ← Back
            </button>
          )}
          {!isLast ? (
            <button onClick={() => setStep(s => s + 1)}
              style={{ padding: '8px 24px', background: 'var(--accent-gold)', border: 'none', borderRadius: 6, color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
              Next →
            </button>
          ) : (
            <button onClick={finish}
              style={{ padding: '8px 24px', background: 'var(--accent-gold)', border: 'none', borderRadius: 6, color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
              Let's go! ⬡
            </button>
          )}
        </div>

        <button onClick={finish} style={{ display: 'block', margin: '14px auto 0', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
          Skip tutorial
        </button>
      </div>
    </div>
  );
}
