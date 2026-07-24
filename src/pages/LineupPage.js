import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ATTACKERS, DEFENDERS } from '../data/operators';
import { PLAYER_COLORS, EXTENDED_COLORS, ALL_GADGETS, ROLES } from '../data/gadgets';
import { ALL_MAPS } from '../data/maps';
import { OpIcon } from '../components/editor/OpIcons';

// ── Storage ───────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'clav-lineups-v2';

function loadLineups() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function saveLineupsToStorage(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// Context key: mapId:side
const ctxKey = (mapId, side) => `${mapId || 'any'}:${side}`;

const EMPTY_PLAYER = (color) => ({
  name: '', color, operator: null, role: '', secondaryGadget: null,
});

const DEFAULT_PLAYERS = () => PLAYER_COLORS.map(c => EMPTY_PLAYER(c));

function newLineup(name = 'Lineup') {
  return { id: `lu-${Date.now()}-${Math.random().toString(36).slice(2)}`, name, players: DEFAULT_PLAYERS(), createdAt: new Date().toISOString() };
}

// ── Map options including "Universal" ─────────────────────────────────────────
const MAP_OPTIONS = [
  { id: 'any', name: '🌐 Universal (all maps)' },
  ...ALL_MAPS.map(m => ({ id: m.id, name: m.name })),
];

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LineupPage() {
  const navigate = useNavigate();
  const [allLineups, setAllLineups] = useState(loadLineups);
  const [selectedMap, setSelectedMap] = useState('any');
  const [side, setSide] = useState('attack');
  const [activeLineupIdx, setActiveLineupIdx] = useState(0);
  const [pickingFor, setPickingFor] = useState(null); // playerIdx
  const [opSearch, setOpSearch] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [nameEditing, setNameEditing] = useState(false);

  const key = ctxKey(selectedMap, side);
  const lineups = allLineups[key] || [];
  const activeLineup = lineups[activeLineupIdx] || null;

  // Keep activeIdx in bounds
  useEffect(() => {
    if (lineups.length === 0) setActiveLineupIdx(0);
    else if (activeLineupIdx >= lineups.length) setActiveLineupIdx(lineups.length - 1);
  }, [key]); // eslint-disable-line

  // Persist on every change
  useEffect(() => { saveLineupsToStorage(allLineups); }, [allLineups]);

  const updateLineups = useCallback((updater) => {
    setAllLineups(prev => {
      const cur = prev[key] || [];
      const next = typeof updater === 'function' ? updater(cur) : updater;
      return { ...prev, [key]: next };
    });
  }, [key]);

  const addLineup = () => {
    const lu = newLineup(`Lineup ${lineups.length + 1}`);
    updateLineups(cur => [...cur, lu]);
    setActiveLineupIdx(lineups.length); // will be the new last
  };

  const deleteLineup = (idx) => {
    updateLineups(cur => cur.filter((_, i) => i !== idx));
    setActiveLineupIdx(prev => Math.max(0, prev > idx ? prev - 1 : prev));
  };

  const updatePlayer = useCallback((pidx, field, val) => {
    updateLineups(cur => cur.map((lu, i) => i !== activeLineupIdx ? lu : {
      ...lu,
      players: lu.players.map((p, j) => j !== pidx ? p : { ...p, [field]: val }),
    }));
  }, [updateLineups, activeLineupIdx]);

  const updateLineupName = (name) => {
    updateLineups(cur => cur.map((lu, i) => i !== activeLineupIdx ? lu : { ...lu, name }));
  };

  const pickOperator = (op) => {
    if (pickingFor === null) return;
    updatePlayer(pickingFor, 'operator', op);
    updatePlayer(pickingFor, 'secondaryGadget', op?.secondaries?.[0] || null);
    setPickingFor(null);
    setOpSearch('');
  };

  const showSave = () => {
    setSaveMsg('Saved!');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const ops = side === 'attack' ? ATTACKERS : DEFENDERS;
  const filteredOps = ops.filter(o =>
    o.name.toLowerCase().includes(opSearch.toLowerCase()) ||
    o.role.toLowerCase().includes(opSearch.toLowerCase())
  );

  const selectedMapName = MAP_OPTIONS.find(m => m.id === selectedMap)?.name || selectedMap;

  return (
    <div style={{ padding: '32px 40px', minHeight: '100vh', maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: 2, color: 'var(--accent-gold)' }}>
          LINEUP BUILDER
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
          Per map & side · multiple lineups · auto-saved
        </p>
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Map selector */}
        <select
          value={selectedMap}
          onChange={e => { setSelectedMap(e.target.value); setActiveLineupIdx(0); }}
          className="topbar-select"
          style={{ minWidth: 220, fontSize: 14, padding: '8px 12px' }}
        >
          {MAP_OPTIONS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        {/* Side toggle */}
        <button
          className={`side-btn attack ${side === 'attack' ? 'active' : ''}`}
          style={{ padding: '8px 22px', fontSize: 14 }}
          onClick={() => { setSide('attack'); setActiveLineupIdx(0); }}
        >⚔ ATK</button>
        <button
          className={`side-btn defend ${side === 'defend' ? 'active' : ''}`}
          style={{ padding: '8px 22px', fontSize: 14 }}
          onClick={() => { setSide('defend'); setActiveLineupIdx(0); }}
        >🛡 DEF</button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {saveMsg && <span style={{ color: 'var(--accent-green)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>✓ {saveMsg}</span>}
          {selectedMap !== 'any' && activeLineup && (
            <button
              className="topbar-btn"
              style={{ borderColor: 'rgba(232,184,75,0.4)', color: 'var(--accent-gold)' }}
              onClick={() => {
                saveLineupsToStorage(allLineups);
                // Store lineup in strat context key so editor can pick it up
                const ctxKey = `${selectedMap}:${side}`;
                const existing = JSON.parse(localStorage.getItem('clav-strats') || '[]');
                // Navigate to editor with map pre-selected
                navigate(`/editor?map=${selectedMap}&lineup=${encodeURIComponent(JSON.stringify(activeLineup.players))}&side=${side}`);
              }}
              title="Create a strat with this lineup"
            >⬡ Open in Strat</button>
          )}
          <button
            onClick={() => { saveLineupsToStorage(allLineups); showSave(); }}
            className="topbar-btn save"
            style={{ padding: '7px 18px' }}
          >💾 Save</button>
        </div>
      </div>

      {/* Lineup tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {lineups.map((lu, idx) => (
          <div key={lu.id} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <button
              onClick={() => setActiveLineupIdx(idx)}
              style={{
                padding: '6px 14px', borderRadius: '4px 0 0 4px', cursor: 'pointer',
                background: idx === activeLineupIdx ? 'var(--accent-gold)' : 'var(--bg-panel)',
                color: idx === activeLineupIdx ? 'var(--bg-void)' : 'var(--text-secondary)',
                border: `1px solid ${idx === activeLineupIdx ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, letterSpacing: 0.5,
                borderRight: 'none',
              }}
            >
              {lu.name}
            </button>
            <button
              onClick={() => deleteLineup(idx)}
              style={{
                padding: '6px 8px', borderRadius: '0 4px 4px 0', cursor: 'pointer',
                background: idx === activeLineupIdx ? 'var(--accent-gold)' : 'var(--bg-panel)',
                color: idx === activeLineupIdx ? 'var(--bg-void)' : 'var(--text-muted)',
                border: `1px solid ${idx === activeLineupIdx ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
                fontSize: 12, lineHeight: 1,
              }}
              title="Delete lineup"
            >×</button>
          </div>
        ))}
        <button
          onClick={addLineup}
          style={{
            padding: '6px 14px', borderRadius: 4, cursor: 'pointer',
            background: 'transparent',
            color: 'var(--accent-gold)',
            border: '1px dashed var(--accent-gold)',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
          }}
        >+ Lineup</button>
      </div>

      {/* Active lineup */}
      {activeLineup ? (
        <>
          {/* Lineup name */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
            <input
              value={activeLineup.name}
              onChange={e => updateLineupName(e.target.value)}
              style={{
                background: 'var(--bg-panel)', border: '1px solid var(--border-accent)',
                color: 'var(--accent-gold)', fontFamily: 'var(--font-display)',
                fontSize: 18, fontWeight: 700, letterSpacing: 1,
                padding: '6px 12px', borderRadius: 4, outline: 'none', minWidth: 220,
              }}
              placeholder="Lineup Name..."
            />
            <span style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
              {selectedMapName} · {side === 'attack' ? '⚔ ATK' : '🛡 DEF'}
            </span>
          </div>

          {/* Players */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {activeLineup.players.map((player, pidx) => (
              <PlayerCard
                key={pidx}
                player={player}
                pidx={pidx}
                side={side}
                onPickOperator={() => setPickingFor(pidx)}
                onUpdate={(field, val) => updatePlayer(pidx, field, val)}
              />
            ))}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 16 }}>
          <div style={{ fontSize: 48, opacity: 0.3 }}>📋</div>
          <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: 18 }}>
            No lineup for {selectedMapName} · {side === 'attack' ? 'ATK' : 'DEF'}
          </div>
          <button onClick={addLineup} style={{ padding: '10px 28px', background: 'var(--accent-gold)', color: 'var(--bg-void)', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, letterSpacing: 1 }}>
            + Erstes Lineup erstellen
          </button>
        </div>
      )}

      {/* Operator picker modal */}
      {pickingFor !== null && activeLineup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setPickingFor(null); setOpSearch(''); }}>
          <div style={{ background: 'var(--bg-panel)', border: `1px solid ${activeLineup.players[pickingFor]?.color}88`, borderRadius: 12, padding: 20, width: 460, maxHeight: '72vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 14, color: activeLineup.players[pickingFor]?.color }}>
              {side === 'attack' ? '⚔ ATK' : '🛡 DEF'} — Choose operator
            </div>
            <input
              className="op-search" autoFocus
              placeholder="Search..." value={opSearch}
              onChange={e => setOpSearch(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            <div style={{ overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {filteredOps.map(op => (
                <div key={op.id} className="op-item" style={{ cursor: 'pointer', background: activeLineup.players[pickingFor]?.operator?.id === op.id ? activeLineup.players[pickingFor]?.color + '22' : undefined }}
                  onClick={() => pickOperator(op)}>
                  <OpIcon op={op} color={activeLineup.players[pickingFor]?.color || '#E8B84B'} />
                  <div className="op-info">
                    <div className="op-name">{op.name}</div>
                    <div className="op-role">{op.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Player Card ───────────────────────────────────────────────────────────────
function PlayerCard({ player, pidx, side, onPickOperator, onUpdate }) {
  const secondaries = player.operator?.secondaries?.length
    ? player.operator.secondaries
    : ALL_GADGETS.filter(g => g.category === 'utility').slice(0, 12);

  return (
    <div style={{ background: 'var(--bg-panel)', border: `2px solid ${player.color}33`, borderRadius: 10, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: player.color + '14', borderBottom: `1px solid ${player.color}33`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: player.color, flexShrink: 0 }} />
        <input
          value={player.name}
          onChange={e => onUpdate('name', e.target.value)}
          placeholder={`Player ${pidx + 1}`}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: 0.5 }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, maxWidth: 160 }}>
          {EXTENDED_COLORS.map(c => (
            <div key={c} onClick={() => onUpdate('color', c)}
              style={{ width: 13, height: 13, borderRadius: '50%', background: c, cursor: 'pointer', flexShrink: 0,
                border: player.color === c ? '2px solid white' : '2px solid transparent',
                boxShadow: player.color === c ? `0 0 4px ${c}` : 'none' }} />
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Operator */}
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4, letterSpacing: 1 }}>OPERATOR</div>
          <button onClick={onPickOperator} style={{ width: '100%', background: 'var(--bg-surface)', border: `1px solid ${player.operator ? player.color + '66' : 'var(--border-subtle)'}`, borderRadius: 5, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--text-primary)' }}>
            {player.operator ? (
              <>
                <OpIcon op={player.operator} color={player.color} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>{player.operator.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{player.operator.role}</span>
              </>
            ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>+ Choose operator</span>}
          </button>
        </div>

        {/* Signature gadget (auto, read-only) */}
        {player.operator?.gadget && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4, letterSpacing: 1 }}>SIGNATUR-GADGET</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg-surface)', border: `1px solid ${player.color}55`, borderRadius: 4 }}>
              <img src={player.operator.gadget.icon} alt={player.operator.gadget.label} style={{ width: 22, height: 22, objectFit: 'contain' }} />
              <span style={{ fontSize: 12, color: player.color, fontFamily: 'var(--font-mono)' }}>{player.operator.gadget.label}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>SIG</span>
            </div>
          </div>
        )}

        {/* Secondary gadget */}
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4, letterSpacing: 1 }}>
            SECONDARY {!player.operator && <span style={{ color: '#4A5568' }}>· choose operator first</span>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {secondaries.map(g => (
              <div key={g.id}
                onClick={() => onUpdate('secondaryGadget', player.secondaryGadget?.id === g.id ? null : g)}
                title={`${g.label}${g.count != null ? ` ×${g.count}` : ''}`}
                style={{
                  position: 'relative', width: 34, height: 34, borderRadius: 5,
                  background: player.secondaryGadget?.id === g.id ? player.color + '33' : 'var(--bg-surface)',
                  border: `1px solid ${player.secondaryGadget?.id === g.id ? player.color : 'var(--border-subtle)'}`,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4,
                  opacity: player.operator ? 1 : 0.4,
                }}>
                <img src={g.icon} alt={g.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                {g.count != null && (
                  <span style={{
                    position: 'absolute', bottom: 1, right: 2,
                    fontSize: 8, fontWeight: 700, fontFamily: 'var(--font-mono)',
                    color: player.secondaryGadget?.id === g.id ? player.color : 'var(--text-muted)',
                    lineHeight: 1, pointerEvents: 'none',
                  }}>×{g.count}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Role */}
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4, letterSpacing: 1 }}>ROLE</div>
          <select
            value={player.role || ''}
            onChange={e => onUpdate('role', e.target.value)}
            style={{ width: '100%', background: 'var(--bg-surface)', border: `1px solid ${player.role ? player.color + '66' : 'var(--border-subtle)'}`, color: player.role ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: 12, padding: '6px 8px', borderRadius: 4, outline: 'none' }}
          >
            <option value="">Choose role...</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
    </div>
    );
}