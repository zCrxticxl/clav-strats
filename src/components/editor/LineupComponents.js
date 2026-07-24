import { useState, useEffect } from 'react';
import { ATTACKERS, DEFENDERS } from '../../data/operators';
import { PLAYER_COLORS, EXTENDED_COLORS, ALL_GADGETS, ROLES } from '../../data/gadgets';
import { MiniOpIcon, StripOpIcon } from './OpIcons';

// ── LineupPanel (collapsed sidebar section) ───────────────────────────────────
export function LineupPanel({ side, lineup, onChange }) {
  const [open, setOpen]           = useState(false);
  const [pickingFor, setPickingFor] = useState(null);
  const [opSearch, setOpSearch]   = useState('');
  const ops      = side === 'attack' ? ATTACKERS : DEFENDERS;
  const filtered = ops.filter(o => o.name.toLowerCase().includes(opSearch.toLowerCase()));

  const update   = (idx, field, val) =>
    onChange(lineup.map((p, i) => i === idx ? { ...p, [field]: val } : p));
  const pickOperator = (idx, op) =>
    onChange(lineup.map((p, i) => i === idx ? { ...p, operator: op, gadget: op?.gadget || p.gadget } : p));

  return (
    <div className="sidebar-section" style={{ borderTop: '2px solid var(--border-accent)' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0 }}>
        <div className="sidebar-section-title" style={{ margin: 0 }}>👥 Lineup</div>
        <span style={{ color: 'var(--accent-gold)', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lineup.map((player, idx) => (
            <div key={idx} style={{ background: 'var(--bg-panel)', border: `1px solid ${player.color}44`, borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ background: player.color + '18', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: player.color, flexShrink: 0 }} />
                <input
                  value={player.name} onChange={e => update(idx, 'name', e.target.value)}
                  placeholder={`Player ${idx + 1}`}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, maxWidth: 140 }}>
                  {EXTENDED_COLORS.map(c => (
                    <div key={c} onClick={() => update(idx, 'color', c)}
                      style={{ width: 11, height: 11, borderRadius: '50%', background: c, cursor: 'pointer', flexShrink: 0,
                        border: player.color === c ? '2px solid white' : '1px solid transparent',
                        boxShadow: player.color === c ? `0 0 4px ${c}` : 'none' }} />
                  ))}
                </div>
              </div>
              <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button onClick={() => { setPickingFor(idx); setOpSearch(''); }}
                  style={{ background: 'var(--bg-surface)', border: `1px solid ${player.operator ? player.color + '55' : 'var(--border-subtle)'}`, borderRadius: 4, padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--text-primary)', width: '100%' }}>
                  {player.operator ? (
                    <>
                      <MiniOpIcon op={player.operator} color={player.color} />
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600 }}>{player.operator.name}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{player.operator.role}</span>
                    </>
                  ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>+ Operator</span>}
                </button>
                <select value={player.role} onChange={e => update(idx, 'role', e.target.value)}
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: player.role ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: 11, padding: '4px 8px', borderRadius: 4, outline: 'none', width: '100%' }}>
                  <option value="">Choose role...</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {player.operator?.gadget && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-surface)', border: `1px solid ${player.color}55`, borderRadius: 4, padding: '3px 6px' }}>
                    <img src={player.operator.gadget.icon} alt={player.operator.gadget.label} style={{ width: 18, height: 18, objectFit: 'contain' }} />
                    <span style={{ fontSize: 10, color: player.color, fontFamily: 'var(--font-mono)', flex: 1 }}>{player.operator.gadget.label}</span>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>SIG</span>
                  </div>
                )}
                <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>SECONDARY</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(player.operator?.secondaries?.length ? player.operator.secondaries : ALL_GADGETS.filter(g => g.category === 'utility')).map(g => (
                    <div key={g.id} onClick={() => update(idx, 'secondaryGadget', player.secondaryGadget?.id === g.id ? null : g)} title={g.label}
                      style={{ width: 26, height: 26, borderRadius: 4, background: player.secondaryGadget?.id === g.id ? player.color + '33' : 'var(--bg-surface)', border: `1px solid ${player.secondaryGadget?.id === g.id ? player.color : 'var(--border-subtle)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 2 }}>
                      <img src={g.icon} alt={g.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pickingFor !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setPickingFor(null)}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-mid)', borderRadius: 12, padding: 20, width: 440, maxHeight: '65vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 12, color: lineup[pickingFor]?.color }}>
              Operator — {side === 'attack' ? '⚔ ATK' : '🛡 DEF'}
            </div>
            <input className="op-search" style={{ width: '100%', marginBottom: 10 }} autoFocus
              placeholder="Search..." value={opSearch} onChange={e => setOpSearch(e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {filtered.map(op => (
                <div key={op.id} className="op-item" style={{ cursor: 'pointer' }}
                  onClick={() => { pickOperator(pickingFor, op); setPickingFor(null); }}>
                  <MiniOpIcon op={op} color={lineup[pickingFor]?.color || '#E8B84B'} />
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

// ── GadgetSlot — must be defined outside LineupStrip to avoid remount-on-render ─
function GadgetSlot({ gadget, color, isSig, placed, onDragStart, onDragEnd }) {
  if (!gadget) return null;
  const total     = gadget.count ?? 99;
  const remaining = total - placed;
  const depleted  = remaining <= 0;
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <div className="lineup-strip-gadget"
        draggable={!depleted}
        title={`${gadget.label}${total < 99 ? ` · ${remaining}/${total} left` : ''}`}
        style={{ cursor: depleted ? 'not-allowed' : 'grab', borderColor: depleted ? '#E84B4B88' : isSig ? color + '88' : 'var(--border-subtle)', opacity: depleted ? 0.45 : 1 }}
        onDragStart={depleted ? e => e.preventDefault() : onDragStart}
        onDragEnd={onDragEnd}>
        <img src={gadget.icon} alt={gadget.label} />
      </div>
      {total < 99 && (
        <span style={{
          position: 'absolute', bottom: -1, right: -1,
          background: depleted ? '#E84B4B' : remaining <= 1 ? '#E87B4B' : 'rgba(8,10,14,0.9)',
          color: '#fff',
          fontSize: 8, fontFamily: 'var(--font-mono)', fontWeight: 700,
          lineHeight: 1, padding: '1px 2px', borderRadius: 2,
          border: `1px solid ${depleted ? '#E84B4B' : color + '55'}`,
          pointerEvents: 'none', minWidth: 10, textAlign: 'center',
        }}>{remaining}</span>
      )}
    </div>
  );
}

// ── LineupStrip (bottom bar of canvas) ───────────────────────────────────────
export function LineupStrip({ lineup, side, onEdit, onDragGadget, gadgetCounts = {}, onSelectPlayer, selectedPlayerIdx }) {
  const stop = e => e.stopPropagation();
  const dragGadget = (e, gadget, color) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/x-clav-gadget', JSON.stringify({ gadget, color }));
    if (onDragGadget) onDragGadget(gadget, color);
  };
  const dragOp = (e, op, color, sideArg) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/x-clav-operator', JSON.stringify({ op, color, side: sideArg }));
    if (onDragGadget) onDragGadget({ __op: op }, color);
  };
  const onDragEnd = () => onDragGadget && onDragGadget(null, null);

  return (
    <div className="lineup-strip"
      onMouseDown={stop} onMouseUp={stop} onMouseMove={stop} onClick={stop}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); }}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}>
      {lineup.map((player, idx) => {
        const empty = !player.operator;
        const isSelected = selectedPlayerIdx === idx;
        return (
          <div key={idx}
            data-lineup-idx={idx}
            className={`lineup-strip-card${empty ? ' empty' : ''}${isSelected ? ' selected-player' : ''}`}
            onClick={() => { onSelectPlayer && onSelectPlayer(idx, player.color); }}
            onDoubleClick={() => onEdit(idx)}
            style={{
              borderColor: isSelected ? player.color : empty ? 'var(--border-subtle)' : player.color + '55',
              borderStyle: empty ? 'dashed' : 'solid',
              boxShadow: isSelected ? `0 0 10px ${player.color}66` : 'none',
              background: isSelected ? player.color + '18' : undefined,
            }}
            title={empty ? 'Click to choose' : 'Click: edit · Drag icons to map'}>
            <div className="lineup-strip-op"
              draggable={!empty}
              onDragStart={!empty ? e => dragOp(e, player.operator, player.color, side) : undefined}
              onDragEnd={!empty ? onDragEnd : undefined}
              style={{ border: `2px solid ${player.color}`, width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, background: 'rgba(8,10,14,0.85)', cursor: empty ? 'pointer' : 'grab' }}>
              {empty
                ? <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: player.color }}>{idx + 1}</span>
                : <StripOpIcon op={player.operator} color={player.color} />}
            </div>
            <div className="lineup-strip-info">
              <div className="lineup-strip-name" style={{ color: empty ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                {player.operator ? player.operator.name : `Player ${idx + 1}`}
              </div>
              <div className="lineup-strip-role">
                {player.operator ? player.operator.role : 'Click to choose'}
              </div>
              {player.backups?.length > 0 && (
                <div style={{ display: 'flex', gap: 2, marginTop: 2 }}
                  title={`Backups: ${player.backups.map(b => b.name).join(', ')}`}>
                  {player.backups.slice(0, 4).map(b => (
                    <img key={b.id} src={b.icon} alt={b.name}
                      style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'contain', opacity: 0.85, border: `1px solid ${player.color}66`, background: 'rgba(8,10,14,0.85)' }} />
                  ))}
                </div>
              )}
            </div>
            {!empty && (
              <div className="lineup-strip-gadgets" onClick={e => e.stopPropagation()}>
                {player.operator?.gadget && (
                  <GadgetSlot
                    gadget={player.operator.gadget}
                    color={player.color}
                    isSig
                    placed={gadgetCounts[`${player.color}:${player.operator.gadget.id}`] || 0}
                    onDragStart={e => dragGadget(e, player.operator.gadget, player.color)}
                    onDragEnd={onDragEnd}
                  />
                )}
                {player.secondaryGadget && (
                  <GadgetSlot
                    gadget={player.secondaryGadget}
                    color={player.color}
                    isSig={false}
                    placed={gadgetCounts[`${player.color}:${player.secondaryGadget.id}`] || 0}
                    onDragStart={e => dragGadget(e, player.secondaryGadget, player.color)}
                    onDragEnd={onDragEnd}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── LineupConfigModal (full operator config overlay) ──────────────────────────
export function LineupConfigModal({ idx, lineup, side, onClose, onChange }) {
  const player  = lineup[idx];
  const ops     = side === 'attack' ? ATTACKERS : DEFENDERS;
  const [search, setSearch] = useState('');

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered   = ops.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));
  const update     = (field, val) => onChange(lineup.map((p, i) => i === idx ? { ...p, [field]: val } : p));
  // Picking a primary op also removes it from the backup bench (no duplicates).
  const pickOp     = op => onChange(lineup.map((p, i) => i === idx ? { ...p, operator: op, gadget: op?.gadget || null, secondaryGadget: op?.secondaries?.[0] || null, backups: (p.backups || []).filter(b => b.id !== op.id) } : p));
  const toggleBackup = op => onChange(lineup.map((p, i) => i === idx
    ? { ...p, backups: (p.backups || []).some(b => b.id === op.id) ? (p.backups || []).filter(b => b.id !== op.id) : [...(p.backups || []), op] }
    : p));
  const removeBackup = id => onChange(lineup.map((p, i) => i === idx ? { ...p, backups: (p.backups || []).filter(b => b.id !== id) } : p));
  const secondaries = player.operator?.secondaries?.length
    ? player.operator.secondaries
    : ALL_GADGETS.filter(g => g.category === 'utility');

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-panel)', border: `1px solid ${player.color}88`, borderRadius: 12, width: 520, maxHeight: '82vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12, background: player.color + '14' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: player.color }} />
          <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>
            Player {idx + 1} · {side === 'attack' ? '⚔ ATK' : '🛡 DEF'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 6, letterSpacing: 1 }}>NAME</div>
            <input value={player.name || ''} onChange={e => update('name', e.target.value)}
              placeholder={`Player ${idx + 1}`}
              style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, padding: '7px 10px', borderRadius: 4, outline: 'none' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 6, letterSpacing: 1 }}>COLOR</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {EXTENDED_COLORS.map(c => (
                <div key={c} onClick={() => update('color', c)}
                  style={{ width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer', flexShrink: 0,
                    border: player.color === c ? '2.5px solid white' : '2px solid transparent',
                    boxShadow: player.color === c ? `0 0 6px ${c}` : 'none',
                    transform: player.color === c ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.1s' }} />
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 6, letterSpacing: 1 }}>
              OPERATOR <span style={{ opacity: 0.7 }}>· ☆ = add backup (ban protection)</span>
            </div>
            {player.backups?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>BENCH:</span>
                {player.backups.map(b => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: player.color + '18', border: `1px solid ${player.color}55`, borderRadius: 4, padding: '2px 4px 2px 6px' }}>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 600 }}>{b.name}</span>
                    <button onClick={() => removeBackup(b.id)} title="Remove backup"
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <input className="op-search" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
              {filtered.map(op => {
                const isPrimary = player.operator?.id === op.id;
                const isBackup  = player.backups?.some(b => b.id === op.id);
                return (
                  <div key={op.id} className="op-item"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: isPrimary ? player.color + '22' : undefined, borderColor: isPrimary ? player.color : isBackup ? player.color + '66' : undefined }}>
                    <div onClick={() => pickOp(op)} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, cursor: 'pointer' }}>
                      <MiniOpIcon op={op} color={player.color} />
                      <div className="op-info">
                        <div className="op-name">{op.name}</div>
                        <div className="op-role">{op.role}</div>
                      </div>
                    </div>
                    {!isPrimary && (
                      <button onClick={e => { e.stopPropagation(); toggleBackup(op); }}
                        title={isBackup ? 'Remove backup' : 'Add as backup (ban protection)'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 4px', color: isBackup ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                        {isBackup ? '★' : '☆'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {player.operator?.gadget && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 6, letterSpacing: 1 }}>SIGNATURE</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg-surface)', border: `1px solid ${player.color}55`, borderRadius: 4 }}>
                <img src={player.operator.gadget.icon} alt={player.operator.gadget.label} style={{ width: 24, height: 24, objectFit: 'contain' }} />
                <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12, color: player.color }}>{player.operator.gadget.label}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>SIG</span>
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 6, letterSpacing: 1 }}>SECONDARY (1×)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {secondaries.map(g => (
                <div key={g.id}
                  onClick={() => update('secondaryGadget', player.secondaryGadget?.id === g.id ? null : g)}
                  title={g.label}
                  style={{ width: 36, height: 36, borderRadius: 4, background: player.secondaryGadget?.id === g.id ? player.color + '33' : 'var(--bg-surface)', border: `1px solid ${player.secondaryGadget?.id === g.id ? player.color : 'var(--border-subtle)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}>
                  <img src={g.icon} alt={g.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 6, letterSpacing: 1 }}>ROLE</div>
            <select value={player.role || ''} onChange={e => update('role', e.target.value)}
              style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, padding: '6px 10px', borderRadius: 4, outline: 'none' }}>
              <option value="">Choose role...</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
