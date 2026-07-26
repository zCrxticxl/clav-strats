import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useStrats } from '../hooks/useStrats';
import { useEditorHistory } from '../hooks/useEditorHistory';
import { useEditorViewport } from '../hooks/useEditorViewport';
import { useCollab } from '../hooks/useCollab';
import { CollabBar, CollabCursors } from '../components/editor/CollabUI';
import { ALL_MAPS, MAP_BLUEPRINTS } from '../data/maps';
import { ATTACKERS, DEFENDERS } from '../data/operators';
import { PLAYER_COLORS, EXTENDED_COLORS, ALL_GADGETS, ROLES, GADGETS } from '../data/gadgets';

import { MAP_WALLS } from '../data/walls';
import { exportStratAsPNG } from '../utils/exportPng';
import { detectWalls } from '../utils/wallDetector';
import { OpIcon, OpImg } from '../components/editor/OpIcons';
import { InteractiveWall } from '../components/editor/InteractiveWall';
import { LineupStrip, LineupConfigModal } from '../components/editor/LineupComponents';

const WALL_STORAGE_KEY = 'clav-walls-v2';

const DRAW_TOOLS = [
  { id: 'select',        label: 'Select',    emoji: '↖', shortcut: 'V' },
  { id: 'arrow',         label: 'Arrow',     emoji: '→', shortcut: 'A' },
  { id: 'route',         label: 'Route',     emoji: '⇢', shortcut: 'W' },
  { id: 'zone',          label: 'Zone',      emoji: '⬡', shortcut: 'Z' },
  { id: 'operator',      label: 'Op',        emoji: '👤', shortcut: 'O' },
  { id: 'reinforcement', label: 'Reinforce', emoji: '🧱', shortcut: 'F' },
  { id: 'barricade',     label: 'Barricade', emoji: '🚧', shortcut: 'B' },
  { id: 'rotate',        label: 'Rotate',    emoji: '⤿', shortcut: 'Y' },
  { id: 'headline',      label: 'Headline',  emoji: '═', shortcut: 'H' },
  { id: 'feetline',      label: 'Feetline',  emoji: '_', shortcut: 'L' },
  { id: 'gadget',        label: 'Gadget',    emoji: '🎒', shortcut: 'G' },
  { id: 'text',          label: 'Text',      emoji: 'T',  shortcut: 'T' },
  { id: 'eraser',        label: 'Erase',     emoji: '⌫', shortcut: 'E' },
];

const TOOL_SHORTCUTS = DRAW_TOOLS.reduce((acc, t) => {
  acc[t.shortcut.toLowerCase()] = t.id;
  return acc;
}, {});


const DEFAULT_LINEUP = PLAYER_COLORS.map((c, i) => ({
  name: `Player ${i + 1}`, color: c, operator: null, role: '', gadget: null, secondaryGadget: null, backups: [],
}));

function makeDragGhost(iconSrc, color) {
  const wrap = document.createElement('div');
  wrap.style.cssText = `position:fixed;top:-200px;left:-200px;width:44px;height:44px;background:rgba(8,10,14,0.92);border:2px solid ${color};border-radius:8px;padding:4px;box-sizing:border-box;pointer-events:none;`;
  const img = document.createElement('img');
  img.src = iconSrc;
  img.style.cssText = 'width:100%;height:100%;object-fit:contain;';
  wrap.appendChild(img);
  document.body.appendChild(wrap);
  setTimeout(() => { try { document.body.removeChild(wrap); } catch {} }, 100);
  return wrap;
}

function Toast({ msg }) {
  return msg ? <div className="toast">✓ {msg}</div> : null;
}

function findNearestWall(pt, walls, maxDist) {
  let best = null, bestD = maxDist;
  for (const w of walls) {
    if (w.type !== 'wall' && w.type !== 'hatch') continue;
    const d = Math.hypot(pt.x - w.x, pt.y - w.y);
    if (d < bestD) { bestD = d; best = w; }
  }
  return best;
}

// ── Export Modal ──────────────────────────────────────────────────────────────
function ExportModal({ floors, selectedFloor, onClose, onExport }) {
  const [withLineup, setWithLineup] = React.useState(true);
  const [withMeta,   setWithMeta]   = React.useState(true);
  const [selFloors,  setSelFloors]  = React.useState([selectedFloor].filter(Boolean));

  const toggle = (f) => setSelFloors(prev =>
    prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
  );
  const allSelected = floors.length > 0 && selFloors.length === floors.length;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={onClose}>
      <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-accent)', borderRadius:12, padding:28, minWidth:340, boxShadow:'0 16px 48px rgba(0,0,0,0.7)' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, letterSpacing:2, color:'var(--accent-gold)', marginBottom:20 }}>📷 PNG EXPORT</div>

        {/* Floor selection */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--text-muted)', letterSpacing:1, marginBottom:8 }}>FLOORS</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:6 }}>
            <button onClick={() => setSelFloors(allSelected ? [] : [...floors])}
              style={{ fontSize:11, padding:'4px 10px', borderRadius:4, border:`1px solid ${allSelected ? 'var(--accent-gold)' : 'var(--border-subtle)'}`, background: allSelected ? 'rgba(232,184,75,0.12)' : 'var(--bg-panel)', color: allSelected ? 'var(--accent-gold)' : 'var(--text-muted)', cursor:'pointer' }}>
              Alle
            </button>
            {floors.map(f => {
              const active = selFloors.includes(f);
              const isCurrent = f === selectedFloor;
              return (
                <button key={f} onClick={() => toggle(f)}
                  style={{ fontSize:11, padding:'4px 10px', borderRadius:4, border:`1px solid ${active ? 'var(--accent-gold)' : 'var(--border-subtle)'}`, background: active ? 'rgba(232,184,75,0.12)' : 'var(--bg-panel)', color: active ? 'var(--accent-gold)' : 'var(--text-muted)', cursor:'pointer', position:'relative' }}>
                  {f}{isCurrent ? ' ●' : ''}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>● = current floor</div>
        </div>

        {/* Options */}
        <div style={{ marginBottom:20, display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--text-muted)', letterSpacing:1, marginBottom:2 }}>OPTIONS</div>
          {[
            { label: 'Show lineup',    val: withLineup, set: setWithLineup },
            { label: 'Show strat info', val: withMeta,   set: setWithMeta   },
          ].map(({ label, val, set }) => (
            <label key={label} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:13, color: val ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              <div onClick={() => set(v => !v)}
                style={{ width:18, height:18, borderRadius:4, border:`1.5px solid ${val ? 'var(--accent-gold)' : 'var(--border-mid)'}`, background: val ? 'rgba(232,184,75,0.2)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, cursor:'pointer' }}>
                {val && <span style={{ color:'var(--accent-gold)', fontSize:12, fontWeight:900 }}>✓</span>}
              </div>
              {label}
            </label>
          ))}
        </div>

        <button
          className="topbar-btn save"
          disabled={selFloors.length === 0}
          style={{ width:'100%', padding:'11px', fontSize:13, opacity: selFloors.length === 0 ? 0.4 : 1 }}
          onClick={() => onExport({ floors: selFloors, withLineup, withMeta })}>
          📷 {selFloors.length > 1 ? `${selFloors.length} PNGs export` : 'Export PNG'}
        </button>
        <button style={{ marginTop:10, width:'100%', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:12 }}
          onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// ── Map Picker ────────────────────────────────────────────────────────────────
function MapPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = ALL_MAPS.find(m => m.id === value);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="topbar-btn"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, minWidth: 160,
          borderColor: open ? 'var(--accent-gold)' : value ? 'rgba(232,184,75,0.4)' : 'rgba(232,75,75,0.5)',
          color: value ? 'var(--accent-gold)' : '#ff8080',
          fontWeight: 600, fontSize: 12, letterSpacing: 1,
          background: value ? 'rgba(232,184,75,0.06)' : 'rgba(232,75,75,0.06)',
        }}
      >
        {current?.preview && (
          <img src={current.preview} alt="" style={{ width: 28, height: 18, objectFit: 'cover', borderRadius: 2, opacity: 0.85 }} />
        )}
        <span>{current ? current.name : '⚠ SELECT MAP'}</span>
        <span style={{ marginLeft: 'auto', opacity: 0.5 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 999, marginTop: 4,
          background: 'var(--bg-deep)', border: '1px solid var(--border-accent)',
          borderRadius: 8, padding: 10, width: 340,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
          <div style={{ gridColumn: '1/-1', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 2, color: 'var(--text-muted)', paddingBottom: 4 }}>
            COMPETITIVE
          </div>
          {ALL_MAPS.filter(m => m.type === 'competitive').map(m => (
            <button key={m.id} onClick={() => { onChange(m.id); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                background: value === m.id ? 'rgba(232,184,75,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${value === m.id ? 'rgba(232,184,75,0.4)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                color: value === m.id ? 'var(--accent-gold)' : 'var(--text-primary)',
                fontSize: 12, fontWeight: value === m.id ? 700 : 400, transition: 'all 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,184,75,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = value === m.id ? 'rgba(232,184,75,0.12)' : 'rgba(255,255,255,0.03)'}
            >
              {m.preview && <img src={m.preview} alt="" style={{ width: 36, height: 24, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />}
              <span>{m.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Editor ───────────────────────────────────────────────────────────────
export default function EditorPage() {
  const { stratId } = useParams();
  const [sp, setSp] = useSearchParams();
  // Handle ?lineup= param from LineupPage
  const spLineup = sp.get('lineup');
  const spSide   = sp.get('side');
  const navigate    = useNavigate();
  const { saveStrat, strats } = useStrats();

  // ── viewport ────────────────────────────────────────────────────────────
  const { containerRef, vpRef, vpState, startPan, resetView } = useEditorViewport();

  // ── draw state ──────────────────────────────────────────────────────────
  const [isDrawing, setIsDrawing]     = useState(false);
  const [currentPath, setCurrentPath] = useState(null);
  const [marquee, setMarquee]         = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [routeDraft, setRouteDraft]   = useState(null); // { points:[], color, width } — click-to-add waypoints
  const [routeCursor, setRouteCursor] = useState(null); // live preview point to cursor
  const routeDraftRef = useRef(null);
  const drawStartRef = useRef(null);
  const dragRef      = useRef(null);

  // ── strat ──────────────────────────────────────────────────────────────
  const [stratName, setStratName]         = useState('Untitled Strat');
  const [selectedMap, setSelectedMap]     = useState(sp.get('map') || '');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [side, setSide]                   = useState(spSide || 'attack');
  const [description, setDescription]     = useState('');
  const [tags, setTags]                   = useState([]);
  const [tagInput, setTagInput]           = useState('');
  const [editorState, setEditorState, history] = useEditorHistory({ elements: [], lineupsByContext: {} });
  const elements          = editorState.elements;
  const lineupsByContext  = editorState.lineupsByContext;

  const setElements = useCallback((updater, opts) => {
    setEditorState(prev => ({ ...prev, elements: typeof updater === 'function' ? updater(prev.elements) : updater }), opts);
  }, [setEditorState]);

  const setLineupsByContext = useCallback((updater) => {
    setEditorState(prev => ({ ...prev, lineupsByContext: typeof updater === 'function' ? updater(prev.lineupsByContext) : updater }));
  }, [setEditorState]);

  // ── collaboration (Yjs) ──────────────────────────────────────────────────
  const room   = sp.get('room') || null;
  const collab = useCollab(room);
  const applyingRemoteRef = useRef(false); // guards elements/lineups remote apply
  const metaApplyingRef   = useRef(false); // guards meta remote apply
  const canPushRef        = useRef(false); // only push local->remote after initial sync
  const cursorThrottleRef = useRef(0);

  const lineupCtxKey = `${selectedMap || 'none'}:${side}`;
  const lineup       = lineupsByContext[lineupCtxKey] || DEFAULT_LINEUP;
  const setLineup    = useCallback((next) => {
    setLineupsByContext(prev => {
      const current = prev[lineupCtxKey] || DEFAULT_LINEUP;
      const updated = typeof next === 'function' ? next(current) : next;
      return { ...prev, [lineupCtxKey]: updated };
    });
  }, [lineupCtxKey, setLineupsByContext]);

  // ── editor UI ──────────────────────────────────────────────────────────
  const [showGrid, setShowGrid]             = useState(false);
  const [exporting, setExporting]           = useState(false);
  const [exportModal, setExportModal]       = useState(false);
  const [selectedPlayerIdx, setSelectedPlayerIdx] = useState(null);
  const [lineupPickerOpen, setLineupPickerOpen] = useState(false);
  const [activeTool, setActiveTool]         = useState('arrow');
  const [activeColor, setActiveColor]       = useState(PLAYER_COLORS[0]);
  const [strokeWidth, setStrokeWidth]       = useState(3);
  const [opSearch, setOpSearch]             = useState('');
  const [pendingOp, setPendingOp]           = useState(null);
  const [pendingGadget, setPendingGadget]   = useState(null);
  const [rotateOrient, setRotateOrient]     = useState('h');
  const [zoneMode] = ['rect']; // rect only
  const [gadgetCat, setGadgetCat]           = useState('all');
  const [lineupEditIdx, setLineupEditIdx]   = useState(null);
  const [draggingGadget, setDraggingGadget] = useState(null);
  const draggingRef                         = useRef(null);
  const [dragPreview, setDragPreview]       = useState(null);
  const [opDrag, setOpDrag]                 = useState(null); // { op, color, clientX, clientY }
  const opDragRef                           = useRef(null);
  // always-current refs so the global mouseup handler isn't stale
  const sideRef        = useRef(side);
  const floorRef       = useRef(selectedFloor);
  const mapRef         = useRef(selectedMap);
  const [toast, setToast]                   = useState('');
  const [textInput, setTextInput]           = useState({ active: false, x: 0, y: 0, val: '' });
  const [customWalls, setCustomWalls]       = useState(() => {
    try {
      const saved = localStorage.getItem(WALL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [detectingWalls, setDetectingWalls] = useState(false);
  const [snapHover, setSnapHover]           = useState(null);
  const [imgAspect, setImgAspect]           = useState(null);

  const wallCacheRef        = useRef(new Map());
  const hoveredWallIdRef    = useRef(null);
  const autoStratIdRef      = useRef(null); // tracks auto-save ID without changing URL
  const hoveredElIdRef      = useRef(null);
  const isDrawingRef        = useRef(false);
  const canvasInnerRef = useRef(null);
  const blueprintRef   = useRef(null);

  const visibleElements = elements.filter(e =>
    (!e.floor  || e.floor  === selectedFloor) &&
    (!e.mapId  || e.mapId  === selectedMap)
  );
  // Count reinforcements across ALL floors of this strat (max 10 is per-strat, not per-floor)
  const reinforceCount  = elements.filter(e => e.type === 'reinforcement' && (!e.mapId || e.mapId === selectedMap)).length;

  // Gadget placement counts per player color+gadget for lineup strip display.
  // Counted across ALL floors of this map (limits are per-strat, not per-floor).
  const gadgetCounts = useMemo(() => {
    const counts = {};
    elements.forEach(el => {
      if (el.type !== 'gadget') return;
      if (el.mapId && el.mapId !== selectedMap) return;
      const key = `${el.color}:${el.gadget?.id}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [elements, selectedMap]);

  // ── inject lineup from URL param (coming from LineupPage) ──────────────
  useEffect(() => {
    if (!spLineup) return;
    try {
      const players = JSON.parse(decodeURIComponent(spLineup));
      const key = `${sp.get('map') || selectedMap}:${spSide || 'attack'}`;
      setLineupsByContext(prev => ({ ...prev, [key]: players }));
    } catch {}
  }, []); // eslint-disable-line

  // ── load strat — only when stratId changes, NOT on every strats update ──
  const stratsRef = useRef(strats);
  useEffect(() => { stratsRef.current = strats; });
  useEffect(() => { autoStratIdRef.current = null; }, [stratId]);

  useEffect(() => {
    if (!stratId) return;
    const s = stratsRef.current.find(x => x.id === stratId);
    if (!s) return;
    setStratName(s.name || 'Untitled Strat');
    setSelectedMap(s.mapId || '');
    setSelectedFloor(s.floor || '');
    setSide(s.side || 'attack');
    setDescription(s.description || '');
    setTags(s.tags || []);
    let lbc = {};
    if (s.lineupsByContext) lbc = s.lineupsByContext;
    else if (s.lineup) lbc = { [`${s.mapId || 'none'}:${s.side || 'attack'}`]: s.lineup };
    history.reset({ elements: s.elements || [], lineupsByContext: lbc });
  }, [stratId]); // eslint-disable-line

  useEffect(() => {
    if (!selectedMap) return;
    const m = ALL_MAPS.find(x => x.id === selectedMap);
    if (m && !m.floors.includes(selectedFloor)) setSelectedFloor(m.floors[0]);
  }, [selectedMap]); // eslint-disable-line

  // Sync lineup from LineupPage storage when map/side changes and no lineup exists yet
  useEffect(() => {
    if (!selectedMap) return;
    const key = `${selectedMap}:${side}`;
    if (lineupsByContext[key]) return;
    try {
      const saved = JSON.parse(localStorage.getItem('clav-lineups-v2') || '{}');
      const lineups = saved[key];
      if (lineups?.length > 0 && lineups[0].players) {
        setLineupsByContext(prev => ({ ...prev, [key]: lineups[0].players }));
      }
    } catch {}
  }, [selectedMap, side]); // eslint-disable-line

  useEffect(() => { setPendingOp(null); }, [side]);

  // Keep refs in sync so global handlers are never stale
  useEffect(() => { sideRef.current = side; }, [side]);
  useEffect(() => { floorRef.current = selectedFloor; }, [selectedFloor]);
  useEffect(() => { mapRef.current = selectedMap; }, [selectedMap]);

  // Global mouse handlers for operator custom drag (attached once)
  useEffect(() => {
    const onMove = e => {
      if (!opDragRef.current) return;
      setOpDrag(prev => prev ? { ...prev, clientX: e.clientX, clientY: e.clientY } : null);
    };
    const onUp = e => {
      const drag = opDragRef.current;
      if (!drag) return;
      opDragRef.current = null;
      setOpDrag(null);

      // Check if dropped on a lineup card
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const card = target?.closest('[data-lineup-idx]');
      if (card) {
        const idx = parseInt(card.getAttribute('data-lineup-idx'));
        setLineup(prev => prev.map((p, i) => i === idx
          ? { ...p, operator: drag.op, gadget: drag.op?.gadget || null, secondaryGadget: drag.op?.secondaries?.[0] || null }
          : p
        ));
        return;
      }

      const inner = canvasInnerRef.current;
      if (!inner) return;
      const rect = inner.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setElements(prev => [...prev, {
        id: Date.now(), type: 'operator',
        op: drag.op, x, y,
        side: sideRef.current, color: drag.color,
        floor: floorRef.current, mapId: mapRef.current,
      }]);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp, true);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp, true); };
  }, []); // eslint-disable-line

  const showToast = useCallback(m => {
    setToast(m);
    setTimeout(() => setToast(''), 2500);
  }, []);

  const currentMap = ALL_MAPS.find(m => m.id === selectedMap);
  const mapImage   = MAP_BLUEPRINTS[selectedMap]?.[selectedFloor] ?? null;

  // ── Auto-detect walls ────────────────────────────────────────────────────
  // Always run detection — even for maps with manual wall positions — so we
  // can enrich manual walls with real pixel-accurate w/h dimensions.
  useEffect(() => {
    if (!mapImage || !selectedMap || !selectedFloor) return;
    if (customWalls[selectedMap]?.[selectedFloor]) return;

    const cached = wallCacheRef.current.get(mapImage);
    if (cached) {
      setCustomWalls(prev => ({
        ...prev,
        [selectedMap]: { ...(prev[selectedMap] || {}), [selectedFloor]: cached },
      }));
      return;
    }

    let cancelled = false;
    const hasManual = MAP_WALLS[selectedMap]?.[selectedFloor]?.some(w => w.type === 'wall' || w.type === 'hatch');
    // For manual-wall maps only run a lightweight pass (no hatch detection needed — just dims)
    setDetectingWalls(!hasManual);
    detectWalls(mapImage, { hatches: !hasManual })
      .then(({ walls, doors, hatches }) => {
        if (cancelled) return;
        const all = [...walls, ...doors, ...hatches];
        wallCacheRef.current.set(mapImage, all);
        setCustomWalls(prev => ({
          ...prev,
          [selectedMap]: { ...(prev[selectedMap] || {}), [selectedFloor]: all },
        }));
      })
      .catch(err => console.warn('[EditorPage] wall detection failed:', err))
      .finally(() => { if (!cancelled) setDetectingWalls(false); });

    return () => { cancelled = true; };
  }, [mapImage, selectedMap, selectedFloor]); // eslint-disable-line

  // Persist walls to localStorage
  useEffect(() => {
    try { localStorage.setItem(WALL_STORAGE_KEY, JSON.stringify(customWalls)); } catch {}
  }, [customWalls]);

  const reDetectWalls = useCallback(async () => {
    if (!mapImage || !selectedMap || !selectedFloor) return;
    wallCacheRef.current.delete(mapImage);
    setCustomWalls(prev => {
      const m = { ...(prev[selectedMap] || {}) };
      delete m[selectedFloor];
      return { ...prev, [selectedMap]: m };
    });
    setDetectingWalls(true);
    try {
      const { walls, doors, hatches } = await detectWalls(mapImage, { hatches: true });
      const all = [...walls, ...doors, ...hatches];
      wallCacheRef.current.set(mapImage, all);
      setCustomWalls(prev => ({
        ...prev,
        [selectedMap]: { ...(prev[selectedMap] || {}), [selectedFloor]: all },
      }));
      showToast(`Detected: ${walls.length} Walls · ${doors.length} Doors · ${hatches.length} Hatches`);
    } catch {
      showToast('Detection failed');
    } finally {
      setDetectingWalls(false);
    }
  }, [mapImage, selectedMap, selectedFloor, showToast]);

  const filteredOps = (side === 'attack' ? ATTACKERS : DEFENDERS).filter(o =>
    o.name.toLowerCase().includes(opSearch.toLowerCase()) ||
    o.role.toLowerCase().includes(opSearch.toLowerCase())
  );

  // MAP_WALLS (manually placed) always wins over auto-detected customWalls
  const interactiveWalls = useMemo(() => {
    const manual = MAP_WALLS[selectedMap]?.[selectedFloor] || [];
    const auto   = customWalls[selectedMap]?.[selectedFloor] || [];
    if (manual.length === 0) return auto;

    // Enrich manual walls/hatches with pixel-accurate w/h from nearest detected entry of same type+orientation.
    // Doors/windows are intentionally excluded: detector gives wall-thickness as one dim, not opening size.
    const enriched = manual.map(m => {
      if (m.w != null && m.h != null) return m;
      if (m.type !== 'wall' && m.type !== 'hatch' && m.type !== 'softwall') return m;
      const candidates = auto.filter(a => a.type === m.type && a.horizontal === m.horizontal && a.w != null && a.h != null);
      const nearest = candidates.reduce((best, a) => {
        const d = Math.hypot(a.x - m.x, a.y - m.y);
        return d < best.d ? { a, d } : best;
      }, { d: Infinity });
      return nearest.d < 4.0 ? { ...m, w: nearest.a.w, h: nearest.a.h } : m;
    });

    // Auto walls not covered by any manual wall fill the rest (doors, hatches, etc.)
    const autoFiltered = auto.filter(a => !manual.some(m => Math.hypot(m.x - a.x, m.y - a.y) < 1.5));
    return [...enriched, ...autoFiltered];
  }, [selectedMap, selectedFloor, customWalls]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = e => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0 && !textInput.active) {
        e.preventDefault();
        setElements(prev => prev.filter(el => !selectedIds.includes(el.id)));
        setSelectedIds([]);
        return;
      }
      if (e.key === 'Escape') {
        setSelectedIds([]);
        setPendingOp(null);
        if (textInput.active) setTextInput({ active: false, x: 0, y: 0, val: '' });
        return;
      }
      if (e.key === 'x' || e.key === 'X') {
        const wid = hoveredWallIdRef.current;
        if (wid != null) {
          setElements(prev => {
            const next = prev.filter(el => el.wallId !== wid);
            return next.length === prev.length ? prev : next;
          });
          return;
        }
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        const eid = hoveredElIdRef.current;
        if (eid != null) {
          setElements(prev => prev.map(el =>
            el.id === eid ? { ...el, rotation: (((el.rotation || 0) + 90) % 360) } : el
          ));
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        if (selectedIds.length === 0) return;
        e.preventDefault();
        setElements(prev => {
          const dupes = prev
            .filter(el => selectedIds.includes(el.id))
            .map(el => ({
              ...el,
              id: Date.now() + Math.random(),
              x:  (el.x  ?? 0) + 2,
              y:  (el.y  ?? 0) + 2,
              x1: el.x1 != null ? el.x1 + 2 : undefined,
              y1: el.y1 != null ? el.y1 + 2 : undefined,
              x2: el.x2 != null ? el.x2 + 2 : undefined,
              y2: el.y2 != null ? el.y2 + 2 : undefined,
              wallId: undefined,
            }));
          return [...prev, ...dupes];
        });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setSelectedIds(visibleElements.map(el => el.id));
        return;
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const toolId = TOOL_SHORTCUTS[e.key.toLowerCase()];
        if (toolId) {
          setActiveTool(toolId);
          if (toolId !== 'operator') setPendingOp(null);
          if (toolId !== 'gadget')   setPendingGadget(null);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, textInput.active, elements, setElements, visibleElements]);

  // ── Canvas coordinate helper ─────────────────────────────────────────────
  const toCanvas = (clientX, clientY) => {
    const innerEl = canvasInnerRef.current || containerRef.current;
    if (!innerEl) return { x: 50, y: 50 };
    const rect = innerEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { x: 50, y: 50 };
    return {
      x: ((clientX - rect.left) / rect.width)  * 100,
      y: ((clientY - rect.top)  / rect.height) * 100,
    };
  };

  // ── Drag start helper ────────────────────────────────────────────────────
  const startDrag = (e, elementId) => {
    if (e.button !== 0) return false;
    // Alt+click = recolor to the active player's color (whole selection if it's part of one).
    if (e.altKey) {
      e.stopPropagation();
      const ids = selectedIds.includes(elementId) && selectedIds.length > 1 ? selectedIds : [elementId];
      setElements(prev => prev.map(el => ids.includes(el.id) && el.color ? { ...el, color: activeColor } : el), { groupKey: 'recolor' });
      return true;
    }
    if (activeTool !== 'select') return false;
    e.stopPropagation();
    if (e.shiftKey) {
      setSelectedIds(prev => prev.includes(elementId)
        ? prev.filter(id => id !== elementId)
        : [...prev, elementId]
      );
      return true;
    }
    let workingIds = selectedIds;
    if (!selectedIds.includes(elementId)) {
      workingIds = [elementId];
      setSelectedIds(workingIds);
    }
    const pt = toCanvas(e.clientX, e.clientY);
    const originals = new Map();
    elements.forEach(el => {
      if (workingIds.includes(el.id)) {
        originals.set(el.id, {
          x: el.x, y: el.y,
          x1: el.x1, y1: el.y1, x2: el.x2, y2: el.y2,
          points: el.points ? el.points.map(p => ({ ...p })) : undefined,
        });
      }
    });
    dragRef.current = { mode: 'drag', startPt: pt, originals, ids: workingIds };
    return true;
  };

  // ── Canvas mouse events ──────────────────────────────────────────────────
  const onMouseDown = e => {
    if (e.button === 1) { startPan(e); return; }
    if (e.button !== 0) return;
    const pt = toCanvas(e.clientX, e.clientY);

    if (activeTool === 'text') { setTextInput({ active: true, x: pt.x, y: pt.y, val: '' }); return; }
    if (activeTool === 'operator') {
      drawStartRef.current = { ...pt, time: Date.now(), mode: 'op-place' };
      isDrawingRef.current = true; setIsDrawing(true);
      return;
    }
    if (activeTool === 'reinforcement') {
      showToast('Reinforcements can only be placed on marked walls/hatches');
      return;
    }
    if (activeTool === 'barricade') {
      showToast('Barricades can only be placed on marked doors/windows');
      return;
    }
    if (activeTool === 'rotate' || activeTool === 'headline' || activeTool === 'feetline') {
      const snap = findNearestWall(pt, interactiveWalls, 5);
      if (snap) {
        setElements(prev => [...prev, { id: Date.now(), type: activeTool, wallId: snap.id, x: snap.x, y: snap.y, w: snap.w, h: snap.h, color: activeColor, horizontal: snap.horizontal, floor: selectedFloor, mapId: selectedMap }]);
      } else if (e.shiftKey || activeTool === 'rotate') {
        setElements(prev => [...prev, { id: Date.now(), type: activeTool, x: pt.x, y: pt.y, color: activeColor, horizontal: activeTool === 'rotate' ? rotateOrient === 'h' : false, floor: selectedFloor, mapId: selectedMap }]);
      } else {
        showToast('Click a wall (or hold Shift to place freely)');
      }
      return;
    }
    if (activeTool === 'gadget') {
      showToast('Drag gadgets onto the map from the picker or lineup');
      return;
    }
    if (activeTool === 'select') {
      setMarquee({ x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y });
      if (!e.shiftKey) setSelectedIds([]);
      isDrawingRef.current = true; setIsDrawing(true);
      drawStartRef.current = pt;
      return;
    }
    if (activeTool === 'route') {
      // Click adds a waypoint; double-click / Enter finishes the route.
      setRouteDraft(prev => prev
        ? { ...prev, points: [...prev.points, pt] }
        : { points: [pt], color: activeColor, width: strokeWidth });
      setRouteCursor(pt);
      return;
    }
    if (['arrow','zone'].includes(activeTool)) {
      isDrawingRef.current = true; setIsDrawing(true);
      drawStartRef.current = pt;
      setCurrentPath({ type: activeTool, x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y, points: [pt], color: activeColor, width: strokeWidth, shift: e.shiftKey });
    }
  };

  const onMouseMove = e => {
    if (collab.enabled) {
      const now = Date.now();
      if (now - cursorThrottleRef.current > 45) {
        cursorThrottleRef.current = now;
        collab.setPresence({ cursor: toCanvas(e.clientX, e.clientY), tool: activeTool });
      }
    }
    if (activeTool === 'route' && routeDraftRef.current) {
      setRouteCursor(toCanvas(e.clientX, e.clientY));
    }
    if (['rotate','headline','feetline'].includes(activeTool) && !isDrawing && !dragRef.current) {
      const pt   = toCanvas(e.clientX, e.clientY);
      const snap = findNearestWall(pt, interactiveWalls, 5);
      setSnapHover(snap ? { x: snap.x, y: snap.y, w: snap.w, h: snap.h, horizontal: snap.horizontal } : null);
    } else if (snapHover) {
      setSnapHover(null);
    }

    if (dragRef.current?.mode === 'drag') {
      const pt  = toCanvas(e.clientX, e.clientY);
      const dx  = pt.x - dragRef.current.startPt.x;
      const dy  = pt.y - dragRef.current.startPt.y;
      const ids  = dragRef.current.ids;
      const orig = dragRef.current.originals;
      setElements(prev => prev.map(el => {
        if (!ids.includes(el.id)) return el;
        const o = orig.get(el.id);
        if (!o) return el;
        return {
          ...el,
          x:  o.x  != null ? o.x  + dx : el.x,
          y:  o.y  != null ? o.y  + dy : el.y,
          x1: o.x1 != null ? o.x1 + dx : el.x1,
          y1: o.y1 != null ? o.y1 + dy : el.y1,
          x2: o.x2 != null ? o.x2 + dx : el.x2,
          y2: o.y2 != null ? o.y2 + dy : el.y2,
          points: o.points ? o.points.map(p => ({ x: p.x + dx, y: p.y + dy })) : el.points,
        };
      }), { groupKey: 'drag' });
      return;
    }
    if (!isDrawingRef.current) return;
    const pt = toCanvas(e.clientX, e.clientY);
    if (activeTool === 'select') { setMarquee(prev => prev ? { ...prev, x2: pt.x, y2: pt.y } : null); return; }

    let { x: x2, y: y2 } = pt;
    if (e.shiftKey && currentPath && activeTool !== 'route') {
      const dx  = x2 - currentPath.x1, dy = y2 - currentPath.y1;
      const ang = Math.atan2(dy, dx);
      const snap = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
      const len = Math.hypot(dx, dy);
      x2 = currentPath.x1 + Math.cos(snap) * len;
      y2 = currentPath.y1 + Math.sin(snap) * len;
    }
    setCurrentPath(prev => ({
      ...prev, x2, y2,
      points: activeTool === 'route'
        ? [...(prev?.points || []), pt]
        : prev?.points,
    }));
  };

  const onMouseUp = e => {
    if (dragRef.current?.mode === 'drag') { dragRef.current = null; return; }
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const pt = toCanvas(e.clientX, e.clientY);

    if (activeTool === 'operator' && drawStartRef.current?.mode === 'op-place') {
      const op = pendingOp;
      drawStartRef.current = null;
      setIsDrawing(false);
      if (op) {
        setElements(prev => [...prev, { id: Date.now(), type: 'operator', op, x: pt.x, y: pt.y, side, color: activeColor, floor: selectedFloor, mapId: selectedMap }]);
        setPendingOp(null); // auto-clear after placement — no sticky op
      } else {
        showToast('Select an operator in the sidebar first');
      }
      return;
    }
    if (activeTool === 'select' && marquee) {
      const minX = Math.min(marquee.x1, pt.x), maxX = Math.max(marquee.x1, pt.x);
      const minY = Math.min(marquee.y1, pt.y), maxY = Math.max(marquee.y1, pt.y);
      const tinyMarquee = Math.abs(marquee.x2 - marquee.x1) < 0.4 && Math.abs(marquee.y2 - marquee.y1) < 0.4;
      if (!tinyMarquee) {
        const hits = visibleElements.filter(el => {
          const cx = el.x ?? ((el.x1 + el.x2) / 2);
          const cy = el.y ?? ((el.y1 + el.y2) / 2);
          return cx >= minX && cx <= maxX && cy >= minY && cy <= maxY;
        }).map(el => el.id);
        setSelectedIds(prev => e.shiftKey ? Array.from(new Set([...prev, ...hits])) : hits);
      }
      setMarquee(null); setIsDrawing(false); return;
    }
    setIsDrawing(false);
    if (!currentPath) return;
    const final = { ...currentPath, x2: pt.x, y2: pt.y, id: Date.now() };
    const isRoute = final.type === 'route';
    const hasContent = isRoute
      ? (final.points?.length ?? 0) > 3
      : Math.hypot(final.x2 - final.x1, final.y2 - final.y1) > 0.3;
    if (hasContent) {
      setElements(prev => [...prev, { ...final, floor: selectedFloor, mapId: selectedMap }]);
    }
    setCurrentPath(null);
  };

  const handleElClick = (e, id) => {
    e.stopPropagation();
    if (e.altKey) return; // Alt+click is handled as recolor in startDrag
    if (activeTool === 'eraser') { setElements(prev => prev.filter(el => el.id !== id)); return; }
    if (activeTool === 'reinforcement') { setElements(prev => prev.map(el => el.id === id && el.type === 'reinforcement' ? { ...el, horizontal: !el.horizontal } : el)); return; }
    if (activeTool === 'select') setSelectedIds([id]);
  };

  // ── Route: click-to-add waypoints ────────────────────────────────────────
  useEffect(() => { routeDraftRef.current = routeDraft; }, [routeDraft]);

  const finishRoute = useCallback(() => {
    const draft = routeDraftRef.current;
    setRouteDraft(null);
    setRouteCursor(null);
    if (!draft) return;
    // Collapse consecutive near-identical points (e.g. the two clicks of a double-click)
    const pts = draft.points.filter((p, i, a) => i === 0 || Math.hypot(p.x - a[i-1].x, p.y - a[i-1].y) > 0.3);
    if (pts.length >= 2) {
      setElements(prev => [...prev, {
        id: Date.now(), type: 'route', points: pts,
        color: draft.color, width: draft.width,
        floor: floorRef.current, mapId: mapRef.current,
      }]);
    }
  }, [setElements]);

  // Cancel the draft when leaving the route tool
  useEffect(() => {
    if (activeTool !== 'route') { setRouteDraft(null); setRouteCursor(null); }
  }, [activeTool]);

  // Keyboard while drafting a route: Enter/finish, Esc/cancel, Backspace/undo point
  useEffect(() => {
    if (!routeDraft) return;
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
      if (e.key === 'Enter')      { e.preventDefault(); finishRoute(); }
      else if (e.key === 'Escape'){ e.preventDefault(); setRouteDraft(null); setRouteCursor(null); }
      else if (e.key === 'Backspace') {
        e.preventDefault();
        setRouteDraft(p => p && p.points.length > 1 ? { ...p, points: p.points.slice(0, -1) } : null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [routeDraft, finishRoute]);

  const submitText = () => {
    if (textInput.val.trim()) {
      setElements(prev => [...prev, { id: Date.now(), type: 'text', x: textInput.x, y: textInput.y, text: textInput.val, color: activeColor, floor: selectedFloor, mapId: selectedMap }]);
    }
    setTextInput({ active: false, x: 0, y: 0, val: '' });
  };

  const handleSave = () => {
    if (!selectedMap) return;
    const mapName = ALL_MAPS.find(m => m.id === selectedMap)?.name || 'Strat';
    const mapStrats = strats.filter(s => s.mapId === selectedMap);
    const autoName = stratName && stratName !== 'Untitled Strat' ? stratName : `${mapName} #${mapStrats.length + 1}`;
    const finalName = stratName && stratName !== 'Untitled Strat' ? stratName : autoName;
    const s = { id: stratId || undefined, name: finalName, mapId: selectedMap, floor: selectedFloor, side, description, tags, elements, lineup, lineupsByContext };
    const saved = saveStrat(s);
    if (!stratName || stratName === 'Untitled Strat') setStratName(finalName);
    showToast('Saved!');
    if (!stratId) navigate(`/editor/${saved.id}`, { replace: true });
  };

  // Auto-save: debounce 2s, never navigates — only persists to localStorage
  const autoSaveRef = useRef({ elements, lineupsByContext, stratName, side, selectedMap, selectedFloor, description, tags, stratId });
  useEffect(() => {
    autoSaveRef.current = { elements, lineupsByContext, stratName, side, selectedMap, selectedFloor, description, tags, stratId };
  });
  useEffect(() => {
    if (!selectedMap) return;
    const t = setTimeout(() => {
      const r = autoSaveRef.current;
      if (!r.selectedMap) return;
      // Don't auto-create strats for users just browsing — require either an
      // existing stratId (already saved once) or at least one drawn element.
      if (!r.stratId && r.elements.length === 0) return;
      const mapName = ALL_MAPS.find(m => m.id === r.selectedMap)?.name || 'Strat';
      const finalName = r.stratName && r.stratName !== 'Untitled Strat' ? r.stratName : `${mapName} Strat`;
      const currentId = r.stratId || autoStratIdRef.current;
      const saved = saveStrat({ id: currentId || undefined, name: finalName, mapId: r.selectedMap, floor: r.selectedFloor, side: r.side, description: r.description, tags: r.tags, elements: r.elements, lineupsByContext: r.lineupsByContext });
      // Track the generated ID in a ref — don't navigate (that would reset undo history).
      if (!currentId && saved?.id) autoStratIdRef.current = saved.id;
    }, 2000);
    return () => clearTimeout(t);
  // selectedMap intentionally excluded: switching maps should not trigger auto-save.
  // selectedFloor/description/tags included so metadata-only edits persist too.
  }, [elements, lineupsByContext, stratName, side, selectedFloor, description, tags]); // eslint-disable-line

  // ── collab sync: remote → local (observe Yjs, apply without history push) ──
  useEffect(() => {
    const { yElements, yLineups, yMeta } = collab;
    if (!yElements || !yLineups || !yMeta) return;

    const pullElements = () => {
      applyingRemoteRef.current = true;
      history.applyRemote(prev => ({ ...prev, elements: Array.from(yElements.values()) }));
      applyingRemoteRef.current = false;
    };
    const pullLineups = () => {
      applyingRemoteRef.current = true;
      const obj = {}; yLineups.forEach((v, k) => { obj[k] = v; });
      history.applyRemote(prev => ({ ...prev, lineupsByContext: obj }));
      applyingRemoteRef.current = false;
    };
    const pullMeta = () => {
      metaApplyingRef.current = true;
      if (yMeta.has('name'))        setStratName(yMeta.get('name'));
      if (yMeta.has('side'))        setSide(yMeta.get('side'));
      if (yMeta.has('floor'))       setSelectedFloor(yMeta.get('floor'));
      if (yMeta.has('map'))         setSelectedMap(yMeta.get('map'));
      if (yMeta.has('description')) setDescription(yMeta.get('description'));
      if (yMeta.has('tags'))        setTags(yMeta.get('tags'));
      metaApplyingRef.current = false;
    };

    const oEl = (_e, txn) => { if (txn.origin !== 'local') pullElements(); };
    const oLu = (_e, txn) => { if (txn.origin !== 'local') pullLineups(); };
    const oMe = (_e, txn) => { if (txn.origin !== 'local') pullMeta(); };
    yElements.observe(oEl);
    yLineups.observe(oLu);
    yMeta.observe(oMe);
    return () => { yElements.unobserve(oEl); yLineups.unobserve(oLu); yMeta.unobserve(oMe); };
  }, [collab.ydoc]); // eslint-disable-line

  // ── collab: once initial state has synced, pull it, then allow local pushes ─
  useEffect(() => {
    canPushRef.current = false;
  }, [room]);
  useEffect(() => {
    const { yElements, yLineups, yMeta } = collab;
    if (!collab.synced || !yElements) return;
    applyingRemoteRef.current = true;
    if (yElements.size) history.applyRemote(prev => ({ ...prev, elements: Array.from(yElements.values()) }));
    if (yLineups.size) { const o = {}; yLineups.forEach((v, k) => { o[k] = v; }); history.applyRemote(prev => ({ ...prev, lineupsByContext: o })); }
    applyingRemoteRef.current = false;
    metaApplyingRef.current = true;
    if (yMeta.has('name'))        setStratName(yMeta.get('name'));
    if (yMeta.has('side'))        setSide(yMeta.get('side'));
    if (yMeta.has('floor'))       setSelectedFloor(yMeta.get('floor'));
    if (yMeta.has('map'))         setSelectedMap(yMeta.get('map'));
    if (yMeta.has('description')) setDescription(yMeta.get('description'));
    if (yMeta.has('tags'))        setTags(yMeta.get('tags'));
    metaApplyingRef.current = false;
    canPushRef.current = true;
  }, [collab.synced]); // eslint-disable-line

  // ── collab sync: local → remote (diff into Yjs maps, origin 'local') ──────
  useEffect(() => {
    const { yElements, ydoc } = collab;
    if (!yElements || !ydoc || !canPushRef.current || applyingRemoteRef.current) return;
    ydoc.transact(() => {
      const ids = new Set();
      for (const el of elements) {
        if (el.id == null) continue;
        const id = String(el.id); ids.add(id);
        if (JSON.stringify(yElements.get(id)) !== JSON.stringify(el)) yElements.set(id, el);
      }
      for (const k of Array.from(yElements.keys())) if (!ids.has(k)) yElements.delete(k);
    }, 'local');
  }, [elements]); // eslint-disable-line

  useEffect(() => {
    const { yLineups, ydoc } = collab;
    if (!yLineups || !ydoc || !canPushRef.current || applyingRemoteRef.current) return;
    ydoc.transact(() => {
      const keys = new Set();
      for (const [k, v] of Object.entries(lineupsByContext)) {
        keys.add(k);
        if (JSON.stringify(yLineups.get(k)) !== JSON.stringify(v)) yLineups.set(k, v);
      }
      for (const k of Array.from(yLineups.keys())) if (!keys.has(k)) yLineups.delete(k);
    }, 'local');
  }, [lineupsByContext]); // eslint-disable-line

  useEffect(() => {
    const { yMeta, ydoc } = collab;
    if (!yMeta || !ydoc || !canPushRef.current || metaApplyingRef.current) return;
    ydoc.transact(() => {
      const set = (k, v) => { if (JSON.stringify(yMeta.get(k)) !== JSON.stringify(v)) yMeta.set(k, v); };
      set('name', stratName); set('side', side); set('floor', selectedFloor);
      set('map', selectedMap); set('description', description); set('tags', tags);
    }, 'local');
  }, [stratName, side, selectedFloor, selectedMap, description, tags]); // eslint-disable-line

  // Start a collab session: generate a room id and add it to the URL (keeps map/strat).
  const startCollab = useCallback(() => {
    const id = (window.crypto?.randomUUID?.() || `${Date.now()}${Math.random()}`).replace(/[^\w]/g, '').slice(0, 10);
    const next = new URLSearchParams(sp);
    next.set('room', id);
    setSp(next);
  }, [sp, setSp]);

  const leaveCollab = useCallback(() => {
    const next = new URLSearchParams(sp);
    next.delete('room');
    setSp(next);
  }, [sp, setSp]);

  // Join a room from a pasted code, invite link (clavstrats://join/<id>) or ?room= URL.
  const joinCollab = useCallback((input) => {
    const s = String(input || '').trim();
    const m = s.match(/join\/([\w-]+)/) || s.match(/room=([\w-]+)/) || s.match(/^([\w-]+)$/);
    const id = m && m[1];
    if (!id) return;
    const next = new URLSearchParams(sp);
    next.set('room', id);
    setSp(next);
  }, [sp, setSp]);

  const handleNewStrat = () => {
    if (window.confirm('Create a new empty strat?')) {
      navigate('/editor');
      setTimeout(() => { history.reset({ elements: [], lineupsByContext: {} }); setStratName('Untitled Strat'); setDescription(''); setTags([]); }, 50);
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags(p => [...p, t]);
    setTagInput('');
  };

  // ── SVG element renderer ─────────────────────────────────────────────────
  const renderEl = (el, preview = false) => {
    const key     = el.id ?? 'prev';
    const sel     = selectedIds.includes(el.id);
    const glow    = sel ? { filter: `drop-shadow(0 0 6px ${el.color || '#E8B84B'})` } : {};
    const onClick   = preview ? undefined : e => handleElClick(e, el.id);
    const onMd      = preview ? undefined : e => startDrag(e, el.id);
    const onCtxMenu = preview ? undefined : e => {
      e.preventDefault(); e.stopPropagation();
      setElements(prev => prev.filter(x => x.id !== el.id));
    };

    if (el.type === 'arrow') {
      const mid = `arr-${key}`;
      return (
        <g key={key} style={glow} onClick={onClick} onMouseDown={onMd} onContextMenu={onCtxMenu}>
          <defs><marker id={mid} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill={el.color}/></marker></defs>
          <line x1={`${el.x1}%`} y1={`${el.y1}%`} x2={`${el.x2}%`} y2={`${el.y2}%`} stroke={el.color} strokeWidth={el.width||3} strokeLinecap="round" markerEnd={`url(#${mid})`} style={{cursor:'pointer'}}/>
          <line x1={`${el.x1}%`} y1={`${el.y1}%`} x2={`${el.x2}%`} y2={`${el.y2}%`} stroke="transparent" strokeWidth={16} style={{cursor:'pointer'}}/>
        </g>
      );
    }
    if (el.type === 'route') {
      const pts = el.points || [{x:el.x1,y:el.y1},{x:el.x2,y:el.y2}];
      const d   = pts.map((p,i) => `${i===0?'M':'L'}${p.x}% ${p.y}%`).join(' ');
      return (
        <g key={key} style={glow} onClick={onClick} onMouseDown={onMd} onContextMenu={onCtxMenu}>
          <path d={d} stroke={el.color} strokeWidth={el.width||3} strokeDasharray="5 3" strokeLinecap="round" fill="none" style={{cursor:'pointer'}}/>
          <path d={d} stroke="transparent" strokeWidth={14} fill="none" style={{cursor:'pointer'}}/>
        </g>
      );
    }
    if (el.type === 'zone') {
      const sharedStyle = { cursor: 'pointer', ...glow };
      const rx = Math.min(el.x1, el.x2), ry2 = Math.min(el.y1, el.y2);
      const rw = Math.abs(el.x2 - el.x1), rh = Math.abs(el.y2 - el.y1);
      return <rect key={key} x={`${rx}%`} y={`${ry2}%`} width={`${Math.max(rw,0.3)}%`} height={`${Math.max(rh,0.2)}%`} stroke={el.color} strokeWidth={el.width||2} fill={el.color+'22'} rx="0.3" style={sharedStyle} onClick={onClick} onMouseDown={onMd} onContextMenu={onCtxMenu}/>;
    }
    if (el.type === 'text') {
      return <text key={key} x={`${el.x}%`} y={`${el.y}%`} fill={el.color} fontSize="14" fontFamily="'Share Tech Mono',monospace" style={{userSelect:'none',cursor:'pointer',...glow}} onClick={onClick} onMouseDown={onMd}>{el.text}</text>;
    }
    if (el.type === 'reinforcement') {
      if (el.wallId) return null; // wall-attached: rendered by InteractiveWall
      const s = el.scale || 1;
      const w = (el.w != null ? el.w : (el.horizontal ? 3.0 : 0.65)) * s;
      const h = (el.h != null ? el.h : (el.horizontal ? 0.65 : 3.0)) * s;
      const px = el.x - w/2, py = el.y - h/2;
      const pid = `rp-${key}`;
      const isHatchReinforce = el.w != null && el.h != null && Math.abs(el.w - el.h) < el.w * 0.5;
      return (
        <g key={key} style={glow} onClick={onClick} onMouseDown={onMd} onContextMenu={onCtxMenu}>
          <defs>
            {isHatchReinforce
              ? <pattern id={pid} width="10" height="6" patternUnits="userSpaceOnUse">
                  <rect width="10" height="6" fill={el.color}/>
                  <rect width="10" height="3" fill="rgba(0,0,0,0.55)"/>
                </pattern>
              : <pattern id={pid} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="6" height="6" fill={el.color}/>
                  <rect width="3" height="6" fill="rgba(0,0,0,0.55)"/>
                </pattern>
            }
          </defs>
          <rect x={`${px}%`} y={`${py}%`} width={`${w}%`} height={`${h}%`} fill={`url(#${pid})`} stroke={el.color} strokeWidth="1.5" rx="0.5" style={{cursor:'pointer'}}/>
          <text x={`${el.x}%`} y={`${el.y+0.35}%`} textAnchor="middle" dominantBaseline="middle" fontSize="24" fontFamily="Arial,sans-serif" fontWeight="900" fill={el.color} stroke="rgba(0,0,0,0.8)" strokeWidth="1.5" paintOrder="stroke" style={{pointerEvents:'none',userSelect:'none'}}>R</text>
        </g>
      );
    }
    if (el.type === 'barricade') {
      if (el.wallId) return null; // opening-attached: rendered by InteractiveWall
      const s = el.scale || 1;
      const bw = (el.w != null ? Math.max(el.w, 1.0) : 1.2) * s;
      const bh = (el.h != null ? Math.max(el.h, 1.0) : 2.4) * s;
      const pid = `barr-${el.id}`;
      return (
        <g key={key} style={glow} onClick={onClick} onMouseDown={onMd} onContextMenu={onCtxMenu}>
          <defs>
            <pattern id={pid} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="3" height="6" fill={el.color + 'CC'}/>
            </pattern>
          </defs>
          <rect x={`${el.x-bw/2}%`} y={`${el.y-bh/2}%`} width={`${bw}%`} height={`${bh}%`} fill={`url(#${pid})`} rx="0.3" style={{cursor:'pointer'}}/>
          <text x={`${el.x}%`} y={`${el.y+0.3}%`} textAnchor="middle" dominantBaseline="middle" fontSize="22" fontFamily="Arial,sans-serif" fontWeight="900" fill={el.color} stroke="rgba(0,0,0,0.8)" strokeWidth="1.5" paintOrder="stroke" style={{pointerEvents:'none',userSelect:'none'}}>B</text>
        </g>
      );
    }
    if (el.type === 'rotate' || el.type === 'headline' || el.type === 'feetline') {
      const s = el.scale || 1;
      const isHorizontalWall = el.horizontal !== false;
      const defLong = 4.5 * s, defShort = 0.9 * s;
      const rw = el.w != null ? el.w * s : (isHorizontalWall ? defLong : defShort);
      const rh = el.h != null ? el.h * s : (isHorizontalWall ? defShort : defLong);
      const rx = el.x - rw/2, ry = el.y - rh/2;
      const horiz = rw >= rh;
      const c = el.color;
      // label position: outside the rect on the "open" side
      const lblX = horiz ? el.x         : el.x + rw/2 + 1.6;
      const lblY = horiz ? el.y + rh/2 + 1.9 : el.y;

      // ── Headline ─────────────────────────────────────────────────────────────
      // Fully opaque solid block — looks like a painted wall section
      if (el.type === 'headline') {
        return (
          <g key={key} style={glow} onClick={onClick} onMouseDown={onMd} onContextMenu={onCtxMenu}>
            <circle cx={`${el.x}%`} cy={`${el.y}%`} r="1.2%" fill="transparent" style={{cursor:'pointer'}}/>
            <text x={`${el.x}%`} y={`${el.y}%`} textAnchor="middle" dominantBaseline="middle"
              fontSize="24" fontFamily="Arial,sans-serif" fontWeight="900"
              fill={c} stroke="rgba(0,0,0,0.8)" strokeWidth="1.5" paintOrder="stroke"
              style={{pointerEvents:'none',userSelect:'none'}}>H</text>
          </g>
        );
      }

      // ── Feetline ──────────────────────────────────────────────────────────────
      if (el.type === 'feetline') {
        return (
          <g key={key} style={glow} onClick={onClick} onMouseDown={onMd} onContextMenu={onCtxMenu}>
            <circle cx={`${el.x}%`} cy={`${el.y}%`} r="1.2%" fill="transparent" style={{cursor:'pointer'}}/>
            <text x={`${el.x}%`} y={`${el.y}%`} textAnchor="middle" dominantBaseline="middle"
              fontSize="24" fontFamily="Arial,sans-serif" fontWeight="900"
              fill={c} stroke="rgba(0,0,0,0.8)" strokeWidth="1.5" paintOrder="stroke"
              style={{pointerEvents:'none',userSelect:'none'}}>F</text>
          </g>
        );
      }

      // ── Rotate ────────────────────────────────────────────────────────────────
      // Circle (not a rectangle) + rotation arrow
      const r = Math.min(rw, rh) / 2;
      const cx2 = el.x, cy2 = el.y;
      // arc: 270° sweep from top, with arrowhead at end
      const startAngle = -Math.PI / 2;
      const sweep = Math.PI * 1.55;
      const endAngle = startAngle + sweep;
      const ax1 = cx2 + r * Math.cos(startAngle);
      const ay1 = cy2 + r * Math.sin(startAngle);
      const ax2 = cx2 + r * Math.cos(endAngle);
      const ay2 = cy2 + r * Math.sin(endAngle);
      // arrowhead direction (tangent at end)
      const tgx = -Math.sin(endAngle), tgy = Math.cos(endAngle);
      const aSize = r * 0.35;
      return (
        <g key={key} style={glow} onClick={onClick} onMouseDown={onMd} onContextMenu={onCtxMenu}>
          {/* invisible click target */}
          <circle cx={`${cx2}%`} cy={`${cy2}%`} r={`${r+0.3}%`} fill="transparent" style={{cursor:'pointer'}}/>
          {/* rotation arc */}
          <path
            d={`M ${ax1}% ${ay1}% A ${r}% ${r}% 0 1 1 ${ax2}% ${ay2}%`}
            fill="none" stroke={c} strokeWidth="3" strokeLinecap="round"
            style={{pointerEvents:'none'}}/>
          {/* arrowhead */}
          <polygon
            points={`${ax2}%,${ay2}% ${ax2 - (tgx*aSize + tgy*aSize*0.5)}%,${ay2 - (tgy*aSize - tgx*aSize*0.5)}% ${ax2 - (tgx*aSize - tgy*aSize*0.5)}%,${ay2 - (tgy*aSize + tgx*aSize*0.5)}%`}
            fill={c} style={{pointerEvents:'none'}}/>
          {/* colored circle background */}
          <circle cx={`${el.x}%`} cy={`${el.y}%`} r="1.5%" fill={c + '33'} stroke={c} strokeWidth="0.8" style={{pointerEvents:'none'}}/>
          {/* Icon: fixed 4% square — consistent across all wall sizes */}
          <image href="/icons/game_r6_rotate_vkme7.webp"
            x={`${el.x - 2}%`} y={`${el.y - 2}%`}
            width="4%" height="4%"
            preserveAspectRatio="xMidYMid meet"
            style={{pointerEvents:'none'}}/>
        </g>
      );
    }
    if (el.type === 'gadget') {
      if (el.wallId) return null; // snapped to an opening: rendered by InteractiveWall
      const gs  = 3.4 * (el.scale || 1);
      const pad = gs * 0.1;
      const rot = el.rotation || 0;
      const rotStyle = rot ? { transform: `rotate(${rot}deg)`, transformOrigin: '50% 50%', transformBox: 'fill-box' } : {};
      return (
        <g key={key} style={{ ...glow, ...rotStyle }} onClick={onClick} onMouseDown={onMd} onContextMenu={onCtxMenu}
          onMouseEnter={preview ? undefined : () => { hoveredElIdRef.current = el.id; }}
          onMouseLeave={preview ? undefined : () => { hoveredElIdRef.current = null; }}>
          <rect x={`${el.x-gs/2}%`} y={`${el.y-gs/2}%`} width={`${gs}%`} height={`${gs}%`} fill="rgba(8,10,14,0.85)" stroke={el.color} strokeWidth="1.5" rx="0.6" style={{cursor:'pointer'}}/>
          {el.gadget?.icon && <image href={el.gadget.icon} x={`${el.x-gs/2+pad}%`} y={`${el.y-gs/2+pad}%`} width={`${gs-pad*2}%`} height={`${gs-pad*2}%`} style={{pointerEvents:'none'}}/>}
        </g>
      );
    }
    return null;
  };

  const getCursor = () => {
    if (activeTool === 'eraser') return 'crosshair';
    if (activeTool === 'operator' && pendingOp) return 'copy';
    if (activeTool === 'gadget' && pendingGadget) return 'copy';
    if (['reinforcement','barricade','rotate','headline','feetline','gadget'].includes(activeTool)) return 'cell';
    if (activeTool === 'select') return 'default';
    return 'crosshair';
  };

  const { zoom, panX, panY } = vpState;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="editor-layout">

      {/* Top Bar */}
      <div className="editor-topbar">
        <input className="topbar-input" value={stratName} onChange={e => setStratName(e.target.value)} placeholder="Strat name..."/>
        <MapPicker value={selectedMap} onChange={setSelectedMap} />
        {selectedMap && (() => {
          const mapStrats = strats.filter(s => s.mapId === selectedMap);
          return mapStrats.length > 0 ? (
            <select className="topbar-select" value={stratId || ''} style={{ maxWidth: 160 }}
              onChange={e => e.target.value ? navigate(`/editor/${e.target.value}`) : handleNewStrat()}>
              <option value="">+ New Strat</option>
              {mapStrats.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          ) : null;
        })()}
        <button className="topbar-btn" onClick={history.undo} disabled={!history.canUndo}
          title="Undo (Ctrl+Z)" style={{ opacity: history.canUndo ? 1 : 0.4, cursor: history.canUndo ? 'pointer' : 'not-allowed' }}>↶</button>
        <button className="topbar-btn" onClick={history.redo} disabled={!history.canRedo}
          title="Redo (Ctrl+Shift+Z)" style={{ opacity: history.canRedo ? 1 : 0.4, cursor: history.canRedo ? 'pointer' : 'not-allowed' }}>↷</button>
        <div className="topbar-spacer"/>
        {selectedIds.length > 0 && (
          <button className="topbar-btn" onClick={() => { setElements(p=>p.filter(el=>!selectedIds.includes(el.id))); setSelectedIds([]); }}>
            🗑 {selectedIds.length} delete
          </button>
        )}
        <button className="topbar-btn" onClick={reDetectWalls} disabled={!mapImage || detectingWalls}
          title="Re-detect walls/doors/hatches from blueprint"
          style={{ borderColor: '#50E8A0', color: '#50E8A0', opacity: (!mapImage || detectingWalls) ? 0.4 : 1 }}>
          {detectingWalls ? '⏳' : '🤖'} Re-Detect
        </button>
        <button className={`topbar-btn ${showGrid ? 'save' : ''}`} onClick={() => setShowGrid(g => !g)} title="Grid ein/aus">⊞ Grid</button>
        <button className="topbar-btn" onClick={resetView} title="Reset zoom">🔍 {Math.round(zoom*100)}%</button>
        <button className="topbar-btn" onClick={() => { if(window.confirm('Clear all elements?')) { setElements([]); setSelectedIds([]); } }}>Clear</button>
        <button className="topbar-btn" disabled={exporting}
          onClick={() => setExportModal(true)}
          style={{ opacity: exporting ? 0.5 : 1, borderColor: 'rgba(232,184,75,0.4)', color: 'var(--accent-gold)' }}>
          {exporting ? '⏳' : '📷'} PNG
        </button>
        <button className="topbar-btn" onClick={handleNewStrat} title="New empty strat">＋ New</button>
        <button className="topbar-btn" onClick={() => setLineupPickerOpen(true)} title="Load a saved lineup">📋 Lineup</button>
        <button className="topbar-btn" title="Duplicate strat" onClick={() => {
          const copy = {
            ...JSON.parse(JSON.stringify({ elements, lineupsByContext, side, description, tags })),
            id: undefined,
            name: `${stratName} (Copy)`,
            mapId: selectedMap, floor: selectedFloor,
          };
          const saved = saveStrat(copy);
          navigate(`/editor/${saved.id}`);
          showToast('Strat duplicated!');
        }}>⧉ Copy</button>
        <button className="topbar-btn" title={description || 'Add a note'}
          style={{ borderColor: description ? 'rgba(232,184,75,0.5)' : undefined, color: description ? 'var(--accent-gold)' : undefined }}
          onClick={() => {
            const d = window.prompt('Note:', description);
            if (d !== null) setDescription(d);
          }}>📝 {description ? 'Note ✓' : 'Note'}</button>
        <button className="topbar-btn save" onClick={handleSave}>💾 Save</button>
      </div>

      {/* Left Panel */}
      <aside className="editor-sidebar">
        <div className="sidebar-section">
          <div className="sidebar-section-title">Tools</div>
          <div className="tool-grid">
            {DRAW_TOOLS.map(t => (
              <button key={t.id} className={`tool-btn ${activeTool===t.id?'active':''}`}
                onClick={() => { setActiveTool(t.id); if(t.id!=='operator') setPendingOp(null); if(t.id!=='gadget') setPendingGadget(null); }}
                title={t.label}>
                <span>{t.emoji}</span>
                <span className="tool-btn-label">{t.label}</span>
              </button>
            ))}
          </div>
          {activeTool==='reinforcement' && (
            <div style={{ marginTop:8, padding:'5px 8px', background:'var(--bg-panel)', borderRadius:4, fontFamily:'var(--font-mono)', fontSize:10, color: reinforceCount>=10?'var(--accent-red)':'var(--accent-gold)' }}>
              🧱 {reinforceCount}/10 · walls/hatches only
            </div>
          )}
          {activeTool==='rotate' && (
            <div style={{ marginTop:8, padding:'6px 8px', background:'var(--bg-panel)', borderRadius:4, display:'flex', gap:6, alignItems:'center' }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)' }}>Orient:</span>
              <button onClick={()=>setRotateOrient('h')} style={{ flex:1, background: rotateOrient==='h' ? activeColor+'33' : 'var(--bg-surface)', border:`1px solid ${rotateOrient==='h' ? activeColor : 'var(--border-subtle)'}`, color: rotateOrient==='h' ? activeColor : 'var(--text-secondary)', borderRadius:3, padding:'3px 8px', cursor:'pointer', fontFamily:'var(--font-display)', fontSize:11, fontWeight:700 }}>↔ H</button>
              <button onClick={()=>setRotateOrient('v')} style={{ flex:1, background: rotateOrient==='v' ? activeColor+'33' : 'var(--bg-surface)', border:`1px solid ${rotateOrient==='v' ? activeColor : 'var(--border-subtle)'}`, color: rotateOrient==='v' ? activeColor : 'var(--text-secondary)', borderRadius:3, padding:'3px 8px', cursor:'pointer', fontFamily:'var(--font-display)', fontSize:11, fontWeight:700 }}>↕ V</button>
            </div>
          )}
          {activeTool==='gadget' && (
            <div style={{ marginTop:8 }}>
              <div className="sidebar-section-title" style={{ marginBottom:6 }}>Choose Gadget</div>
              <div style={{ display:'flex', gap:3, marginBottom:6 }}>
                {[{id:'all',label:'All'},{id:'utility',label:'Utility'},{id:'attack',label:'⚔ ATK'},{id:'defend',label:'🛡 DEF'}].map(c => (
                  <button key={c.id} onClick={()=>setGadgetCat(c.id)}
                    style={{ flex:1, background: gadgetCat===c.id ? activeColor+'33' : 'var(--bg-panel)', border:`1px solid ${gadgetCat===c.id ? activeColor : 'var(--border-subtle)'}`, color: gadgetCat===c.id ? activeColor : 'var(--text-secondary)', borderRadius:3, padding:'3px 4px', cursor:'pointer', fontSize:10, fontFamily:'var(--font-display)', fontWeight:700 }}>
                    {c.label}
                  </button>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:4, maxHeight:280, overflowY:'auto' }}>
                {ALL_GADGETS.filter(g => gadgetCat==='all' || g.category===gadgetCat).map(g => (
                  <div key={g.id} draggable title={`${g.label} (drag onto the map)`}
                    style={{ aspectRatio:'1', background:'var(--bg-panel)', border:'1px solid var(--border-subtle)', borderRadius:4, padding:3, cursor:'grab', display:'flex', alignItems:'center', justifyContent:'center' }}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'copy';
                      e.dataTransfer.setData('application/x-clav-gadget', JSON.stringify({ gadget: g, color: activeColor }));
                      e.dataTransfer.setDragImage(makeDragGhost(g.icon, activeColor), 22, 22);
                      const d = { gadget: g, color: activeColor };
                      draggingRef.current = d; setDraggingGadget(d);
                    }}
                    onDragEnd={() => { draggingRef.current = null; setDraggingGadget(null); setDragPreview(null); }}>
                    <img src={g.icon} alt={g.label} style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:6, padding:'4px 8px', background:'rgba(80,232,160,0.08)', border:'1px solid rgba(80,232,160,0.35)', borderRadius:3, fontSize:11, color:'#50E8A0', fontFamily:'var(--font-mono)', lineHeight:1.5 }}>
                ↕ Drag a gadget from the grid onto the map
              </div>
            </div>
          )}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>Color</span>
            <label title="Pick custom color" style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>CUSTOM</span>
              <div style={{ width:20, height:20, borderRadius:'50%', background: activeColor, border:'2px solid var(--border-accent)', overflow:'hidden', flexShrink:0 }}>
                <input type="color" value={activeColor} onChange={e => setActiveColor(e.target.value)}
                  style={{ opacity:0, width:'200%', height:'200%', cursor:'pointer', marginLeft:'-50%', marginTop:'-50%' }}/>
              </div>
            </label>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
            {EXTENDED_COLORS.map(c => (
              <div key={c} onClick={() => setActiveColor(c)}
                style={{ width:18, height:18, borderRadius:'50%', background:c, cursor:'pointer', flexShrink:0,
                  border: activeColor===c ? '2px solid white' : '2px solid transparent',
                  boxShadow: activeColor===c ? `0 0 6px ${c}` : 'none',
                  transform: activeColor===c ? 'scale(1.25)' : 'scale(1)', transition:'transform 0.1s' }}/>
            ))}
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Stroke width</div>
          <input type="range" min="1" max="10" value={strokeWidth} onChange={e=>setStrokeWidth(Number(e.target.value))} className="stroke-slider"/>
          <div style={{fontSize:11,color:'var(--text-muted)',marginTop:4}}>{strokeWidth}px</div>
        </div>

        <div className="sidebar-section" style={{flex:1}}>
          <div className="sidebar-section-title">Operators — {side==='attack'?'⚔ ATK':'🛡 DEF'}</div>
          <input className="op-search" placeholder="Search operator..." value={opSearch} onChange={e=>setOpSearch(e.target.value)}/>
          <div className="op-list">
            {filteredOps.map(op => (
              <div key={op.id} className="op-item"
                draggable={false}
                style={{ cursor:'grab', userSelect:'none', background: pendingOp?.id===op.id ? activeColor+'22' : undefined, border: pendingOp?.id===op.id ? `1px solid ${activeColor}55` : undefined }}
                title="Drag onto the map"
                onDragStart={e => e.preventDefault()}
                onMouseDown={e => {
                  if (e.button !== 0) return;
                  e.preventDefault();
                  const drag = { op, color: activeColor };
                  opDragRef.current = drag;
                  setOpDrag({ ...drag, clientX: e.clientX, clientY: e.clientY });
                }}>
                <OpIcon op={op} color={activeColor}/>
                <div className="op-info"><div className="op-name">{op.name}</div><div className="op-role">{op.role}</div></div>
              </div>
            ))}
          </div>
        </div>

        {activeTool==='operator' && (
          <div className="sidebar-section" style={{background:'rgba(80,232,160,0.08)',borderColor:'rgba(80,232,160,0.35)'}}>
            <div style={{fontSize:11,color:'#50E8A0',fontFamily:'var(--font-mono)',lineHeight:1.5}}>↕ Drag operator cards from the list onto the map</div>
          </div>
        )}
        {activeTool==='route' && (
          <div className="sidebar-section" style={{background:'rgba(232,184,75,0.08)',borderColor:'rgba(232,184,75,0.35)'}}>
            <div style={{fontSize:11,color:'var(--accent-gold)',fontFamily:'var(--font-mono)',lineHeight:1.6}}>
              Click to set waypoints · Double-click or Enter to finish · Backspace = undo point · Esc = cancel
            </div>
          </div>
        )}
      </aside>

      <CollabBar collab={collab} room={room} onStart={startCollab} onJoin={joinCollab} onLeave={leaveCollab} onToast={showToast} />

      {/* Canvas */}
      <div ref={containerRef} className="editor-canvas-area"
        style={{cursor:getCursor(),overflow:'hidden',position:'relative',userSelect:'none'}}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
        onDoubleClick={() => { if (routeDraftRef.current) finishRoute(); }}
        onContextMenu={e => { e.preventDefault(); if (routeDraftRef.current) finishRoute(); }}
        onMouseLeave={e => { onMouseUp(e); setSnapHover(null); }}
        onDragOver={e => {
          e.preventDefault(); e.dataTransfer.dropEffect='copy';
          const d = draggingRef.current;
          if (d) {
            const pt = toCanvas(e.clientX, e.clientY);
            setDragPreview({ ...d, x: pt.x, y: pt.y });
          }
        }}
        onDragLeave={() => setDragPreview(null)}
        onDrop={e => {
          e.preventDefault();
          const pt = toCanvas(e.clientX, e.clientY);
          let opPayload = null, gadgetPayload = null;
          try { opPayload     = JSON.parse(e.dataTransfer.getData('application/x-clav-operator')); } catch {}
          try { gadgetPayload = JSON.parse(e.dataTransfer.getData('application/x-clav-gadget'));   } catch {}
          if (opPayload?.op) {
            setElements(prev => [...prev, { id: Date.now(), type: 'operator', op: opPayload.op, x: pt.x, y: pt.y, side: opPayload.side || side, color: opPayload.color || activeColor, floor: selectedFloor, mapId: selectedMap }]);
            setPendingOp(null);
          } else {
            // draggingRef is set synchronously on dragstart (both gadget tab AND lineup),
            // so it's reliable on the very first drag — unlike the async draggingGadget
            // state or the webview's flaky custom-MIME dataTransfer.
            const rawG = gadgetPayload?.gadget || draggingRef.current?.gadget || draggingGadget?.gadget;
            // Resolve against the current gadget definition (id) so a gadget dragged
            // from the lineup — where the stored object may predate placement/count
            // changes — behaves identically to one from the gadget tab.
            const g = (rawG && GADGETS[rawG.id]) || rawG;
            const c = gadgetPayload?.color  || draggingRef.current?.color || draggingGadget?.color || activeColor;
            if (g) {
              // Opening-only gadgets: snap to nearest door/window marker
              if (g.placement === 'opening') {
                const openings = interactiveWalls.filter(w => w.type === 'door' || w.type === 'window');
                const nearest = openings.reduce((best, w) => {
                  const d = Math.hypot(w.x - pt.x, w.y - pt.y);
                  return (!best || d < best.d) ? { w, d } : best;
                }, null);
                if (!nearest || nearest.d > 8) {
                  showToast(`${g.label} can only be placed on doors/windows`);
                  setDraggingGadget(null); setDragPreview(null);
                  return;
                }
                const snap = nearest.w;
                setElements(prev => {
                  const filtered = prev.filter(el => !(el.wallId === snap.id && el.type === 'gadget'));
                  return [...filtered, { id: Date.now(), type: 'gadget', wallId: snap.id, gadget: g, x: snap.x, y: snap.y, color: c, floor: selectedFloor, mapId: selectedMap }];
                });
                setDraggingGadget(null); setDragPreview(null);
                return;
              }
              const placed = elements.filter(el => el.type==='gadget' && el.gadget?.id===g.id && el.color===c && (!el.mapId || el.mapId===selectedMap)).length;
              // Lineup-aware limit: if player has an operator, only allow gadgets from their loadout
              const player = lineup.find(p => p.color === c);
              let limit = g.count ?? 99;
              if (player?.operator) {
                const sigId = player.operator.gadget?.id;
                const secId = player.secondaryGadget?.id;
                if (g.id !== sigId && g.id !== secId) {
                  const name = player.name || 'Player';
                  showToast(`${g.label} not in ${name}'s loadout`);
                  setDraggingGadget(null); setDragPreview(null);
                  return;
                }
                limit = g.count ?? 99;
              }
              if (placed >= limit) {
                showToast(`Limit reached: ${limit}× ${g.label}`);
              } else {
                setElements(prev => [...prev, { id: Date.now(), type: 'gadget', gadget: g, x: pt.x, y: pt.y, color: c, floor: selectedFloor, mapId: selectedMap }]);
              }
            }
          }
          setDraggingGadget(null);
          setDragPreview(null);
        }}>

        {currentMap && (
          <div className="floor-tabs" style={{zIndex:20}}>
            {currentMap.floors.map(f => (
              <button key={f} className={`floor-tab ${selectedFloor===f?'active':''}`}
                onClick={e=>{e.stopPropagation();setSelectedFloor(f);}}>{f}</button>
            ))}
          </div>
        )}

        <div style={{position:'absolute',bottom:12,left:12,zIndex:20,fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text-muted)',pointerEvents:'none'}}>
          Scroll=Zoom · Middle Mouse=Pan · {Math.round(zoom*100)}%
        </div>

        {detectingWalls && (
          <div style={{position:'absolute',top:12,right:12,zIndex:25,background:'rgba(8,10,14,0.92)',border:'1px solid #50E8A0',padding:'6px 10px',borderRadius:6,fontFamily:'var(--font-mono)',fontSize:11,color:'#50E8A0',display:'flex',gap:8,alignItems:'center'}}>
            <span style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:'#50E8A0',animation:'pulse 1.2s infinite'}}/>
            Detecting walls...
          </div>
        )}
        {interactiveWalls.length > 0 && !detectingWalls && (
          <div style={{position:'absolute',top:12,right:12,zIndex:25,background:'rgba(8,10,14,0.85)',border:'1px solid var(--border-subtle)',padding:'4px 10px',borderRadius:6,fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text-muted)',pointerEvents:'none'}}>
            🧱 {interactiveWalls.length} interaktive Walls
          </div>
        )}

        {selectedMap ? (
          <div style={{position:'absolute',inset:0,transform:`translate(${panX}px,${panY}px) scale(${zoom})`,transformOrigin:'0 0',width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div ref={canvasInnerRef} style={{position:'relative',aspectRatio: imgAspect ? String(imgAspect) : '16 / 10',width:'100%',height:'100%',maxWidth:'100%',maxHeight:'100%'}}>
              {collab.enabled && <CollabCursors peers={collab.peers} />}
              {mapImage && (
                <img ref={blueprintRef} src={mapImage} alt="" draggable={false}
                  style={{position:'absolute',inset:0,width:'100%',height:'100%',display:'block',opacity:1,userSelect:'none',pointerEvents:'none'}}
                  onLoad={e => setImgAspect(e.target.naturalWidth / e.target.naturalHeight)}
                  onError={e=>{e.target.style.display='none';}}/>
              )}
              {showGrid && (
                <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',opacity:0.18}}>
                  <defs>
                    <pattern id="editor-grid" width="5%" height="5%" patternUnits="userSpaceOnUse">
                      <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#E8B84B" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#editor-grid)"/>
                </svg>
              )}
              <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',overflow:'visible'}}>
                {interactiveWalls.map(w => (
                  <InteractiveWall key={w.id} w={w} activeTool={activeTool} activeColor={activeColor}
                    elements={visibleElements} setElements={setElements} reinforceCount={reinforceCount}
                    showToast={showToast} selectedFloor={selectedFloor} selectedMap={selectedMap}
                    pendingGadget={
                      (activeTool === 'gadget' ? pendingGadget : null) ||
                      (draggingGadget?.gadget?.placement === 'opening' ? draggingGadget.gadget : null)
                    }
                    imgAspect={imgAspect}
                    onHoverChange={id => { hoveredWallIdRef.current = id; }}/>
                ))}
                {visibleElements.map(el => {
                  if (el.type === 'operator') {
                    const sel     = selectedIds.includes(el.id);
                    const opScale = el.scale || 1;
                    const opSize  = Math.round(36 * opScale);
                    return (
                      <foreignObject key={el.id} x={`${el.x}%`} y={`${el.y}%`} width={opSize + 8} height={opSize + 8}
                        style={{transform:`translate(${-(opSize+8)/2}px,${-(opSize+8)/2}px)`,overflow:'visible',cursor:activeTool==='eraser'?'crosshair':activeTool==='select'?'move':'pointer'}}
                        onClick={e=>handleElClick(e,el.id)}
                        onMouseDown={e=>startDrag(e,el.id)}
                        onContextMenu={e=>{e.preventDefault();e.stopPropagation();setElements(prev=>prev.filter(x=>x.id!==el.id));}}>
                        <div xmlns="http://www.w3.org/1999/xhtml" style={{
                          width:opSize,height:opSize,borderRadius:'50%',
                          border:`2.5px solid ${sel ? '#fff' : (el.color||(el.side==='attack'?'#E8B84B':'#4B9CE8'))}`,
                          background:'rgba(8,10,14,0.88)',display:'flex',alignItems:'center',justifyContent:'center',
                          overflow:'hidden',userSelect:'none',
                          boxShadow:sel?`0 0 12px ${el.color}, 0 0 0 2px ${el.color}`:'0 2px 8px rgba(0,0,0,0.5)',
                          transition:'box-shadow 0.04s ease',
                        }} title={el.op.name}>
                          <OpImg op={el.op} color={el.color||(el.side==='attack'?'#E8B84B':'#4B9CE8')}/>
                        </div>
                      </foreignObject>
                    );
                  }
                  return renderEl(el);
                })}
                {currentPath && renderEl(currentPath, true)}
                {routeDraft && (() => {
                  const pts = [...routeDraft.points, ...(routeCursor ? [routeCursor] : [])];
                  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x}% ${p.y}%`).join(' ');
                  return (
                    <g style={{ pointerEvents: 'none' }}>
                      <path d={d} stroke={routeDraft.color} strokeWidth={routeDraft.width || 3} strokeDasharray="5 3" strokeLinecap="round" fill="none" opacity="0.9"/>
                      {routeDraft.points.map((p, i) => (
                        <circle key={i} cx={`${p.x}%`} cy={`${p.y}%`} r="0.7%" fill={routeDraft.color} stroke="#0b0d11" strokeWidth="1"/>
                      ))}
                    </g>
                  );
                })()}
                {snapHover && (
                  <g style={{ pointerEvents:'none' }}>
                    <rect
                      x={`${snapHover.x - (snapHover.w ?? 3.5)/2}%`}
                      y={`${snapHover.y - (snapHover.h ?? 0.7)/2}%`}
                      width={`${snapHover.w ?? 3.5}%`}
                      height={`${snapHover.h ?? 0.7}%`}
                      fill={activeColor + '55'} stroke={activeColor}
                      strokeWidth="1.2" strokeDasharray="2 2" rx="0.3"
                    />
                  </g>
                )}
                {/* Drag preview */}
                {dragPreview && (() => {
                  const { x, y, op, gadget, color } = dragPreview;
                  if (op) {
                    const sz = 36;
                    return (
                      <foreignObject x={`${x}%`} y={`${y}%`} width={sz+8} height={sz+8}
                        style={{ transform:`translate(${-(sz+8)/2}px,${-(sz+8)/2}px)`, overflow:'visible', pointerEvents:'none', opacity:0.75 }}>
                        <div xmlns="http://www.w3.org/1999/xhtml" style={{ width:sz, height:sz, borderRadius:'50%', border:`2.5px solid ${color}`, background:'rgba(8,10,14,0.88)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                          <OpImg op={op} color={color}/>
                        </div>
                      </foreignObject>
                    );
                  }
                  if (gadget) {
                    const gs = 3.4;
                    return (
                      <g style={{ pointerEvents:'none', opacity:0.75 }}>
                        <rect x={`${x-gs/2}%`} y={`${y-gs/2}%`} width={`${gs}%`} height={`${gs}%`} fill="rgba(8,10,14,0.85)" stroke={color} strokeWidth="1.5" rx="0.6"/>
                        {gadget.icon && <image href={gadget.icon} x={`${x-gs/2+0.3}%`} y={`${y-gs/2+0.3}%`} width={`${gs-0.6}%`} height={`${gs-0.6}%`}/>}
                      </g>
                    );
                  }
                  return null;
                })()}
                {marquee && (
                  <rect
                    x={`${Math.min(marquee.x1,marquee.x2)}%`} y={`${Math.min(marquee.y1,marquee.y2)}%`}
                    width={`${Math.abs(marquee.x2-marquee.x1)}%`} height={`${Math.abs(marquee.y2-marquee.y1)}%`}
                    fill="rgba(232,184,75,0.07)" stroke="#E8B84B" strokeWidth="1" strokeDasharray="4 3"
                    style={{pointerEvents:'none'}}
                  />
                )}
              </svg>
              {textInput.active && (
                <div style={{position:'absolute',left:`${textInput.x}%`,top:`${textInput.y}%`,transform:'translate(-50%,-50%)',zIndex:100}}>
                  <input autoFocus value={textInput.val}
                    onChange={e=>setTextInput(t=>({...t,val:e.target.value}))}
                    onKeyDown={e=>{if(e.key==='Enter')submitText();if(e.key==='Escape')setTextInput({active:false});}}
                    onBlur={submitText}
                    style={{background:'rgba(8,10,14,0.92)',border:`1px solid ${activeColor}`,color:activeColor,fontFamily:'var(--font-mono)',fontSize:14,padding:'4px 8px',borderRadius:4,outline:'none',minWidth:120}}
                    placeholder="Text + Enter..."/>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="canvas-placeholder">
            <div className="canvas-placeholder-icon">🗺️</div>
            <div className="canvas-placeholder-text">Select a map</div>
            <div className="canvas-placeholder-sub">Dropdown at the top → pick a map → get started</div>
          </div>
        )}

        {selectedMap && (
          <LineupStrip
            lineup={lineup} side={side} gadgetCounts={gadgetCounts}
            onEdit={idx => setLineupEditIdx(idx)}
            onDragGadget={(g,c) => { const d = { gadget:g, color:c }; draggingRef.current = d; setDraggingGadget(d); }}
            selectedPlayerIdx={selectedPlayerIdx}
            onSelectPlayer={(idx, color) => {
              setSelectedPlayerIdx(prev => prev === idx ? null : idx);
              if (selectedPlayerIdx !== idx) setActiveColor(color);
            }}
          />
        )}
      </div>

      {/* Right Panel */}
      <aside className="editor-sidebar right">
        {selectedIds.length === 1 && (() => {
          const sel = visibleElements.find(e => e.id === selectedIds[0]);
          if (!sel) return null;
          const sizable = ['gadget','reinforcement','barricade','rotate','headline','feetline','operator'].includes(sel.type);
          if (!sizable) return null;
          const label = sel.type === 'gadget' ? (sel.gadget?.label || 'Gadget')
                       : sel.type === 'operator' ? (sel.op?.name || 'Operator')
                       : sel.type[0].toUpperCase() + sel.type.slice(1);
          const scale = sel.scale ?? 1;
          return (
            <div className="sidebar-section" style={{ borderBottom: '2px solid var(--accent-gold)' }}>
              <div className="sidebar-section-title" style={{ color: 'var(--accent-gold)' }}>⚙ {label}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginTop:6, marginBottom:4 }}>
                GRÖSSE — {Math.round(scale * 100)}%
              </div>
              <input type="range" min="0.3" max="3" step="0.05" value={scale}
                onChange={e => {
                  const next = Number(e.target.value);
                  setElements(prev => prev.map(p => p.id === sel.id ? { ...p, scale: next } : p));
                }}
                style={{ width:'100%', accentColor:'var(--accent-gold)' }} />
              <div style={{ display:'flex', gap:4, marginTop:6 }}>
                {[0.5, 1, 1.5, 2].map(v => (
                  <button key={v}
                    onClick={() => setElements(prev => prev.map(p => p.id === sel.id ? { ...p, scale: v } : p))}
                    style={{ flex:1, background: Math.abs((sel.scale ?? 1) - v) < 0.04 ? 'var(--accent-gold)' : 'var(--bg-panel)', color: Math.abs((sel.scale ?? 1) - v) < 0.04 ? 'var(--bg-void)' : 'var(--text-secondary)', border:'1px solid var(--border-subtle)', borderRadius:3, padding:'3px 6px', cursor:'pointer', fontFamily:'var(--font-display)', fontSize:11, fontWeight:700 }}>
                    {v}×
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="sidebar-section">
          <div className="sidebar-section-title">Strat Details</div>
          <div className="strat-details">
            <div className="detail-field">
              <div className="detail-label">Side</div>
              <div className="side-select">
                <button className={`side-btn attack ${side==='attack'?'active':''}`} onClick={()=>setSide('attack')}>⚔ ATK</button>
                <button className={`side-btn defend ${side==='defend'?'active':''}`} onClick={()=>setSide('defend')}>🛡 DEF</button>
              </div>
            </div>
            <div className="detail-field">
              <div className="detail-label">Description</div>
              <textarea className="detail-textarea" placeholder="Strat, Callouts, Timings..." value={description} onChange={e=>setDescription(e.target.value)}/>
            </div>
            <div className="detail-field">
              <div className="detail-label">Tags</div>
              <div className="tags-input-row">
                <input className="tags-field" placeholder="e.g. Rush, 3-1-1..." value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTag()}/>
                <button className="tag-add-btn" onClick={addTag}>+</button>
              </div>
              <div className="tags-list">
                {tags.map(t=><div key={t} className="tag-item">#{t}<span className="tag-remove" onClick={()=>setTags(p=>p.filter(x=>x!==t))}>×</span></div>)}
              </div>
            </div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Controls</div>
          <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.9}}>
            <div>🖱 <b style={{color:'var(--text-secondary)'}}>Scroll</b> → Zoom to mouse</div>
            <div>🖱 <b style={{color:'var(--text-secondary)'}}>Middle Mouse</b> → Pan</div>
            <div>🔍 <b style={{color:'var(--text-secondary)'}}>% Button</b> → Reset</div>
            <div>🧱 <b style={{color:'var(--text-secondary)'}}>Reinforce</b> → walls/hatches only</div>
            <div>🚧 <b style={{color:'var(--text-secondary)'}}>Barricade</b> → on Door/Window markers only</div>
            <div>↖ <b style={{color:'var(--text-secondary)'}}>Select</b> → Rectangle, Del=delete</div>
          </div>
        </div>
      </aside>

      {lineupEditIdx !== null && (
        <LineupConfigModal
          idx={lineupEditIdx}
          lineup={lineup}
          side={side}
          onChange={setLineup}
          onClose={() => setLineupEditIdx(null)}
        />
      )}

      <Toast msg={toast}/>

      {/* Lineup Picker Modal */}
      {lineupPickerOpen && (() => {
        const stored = (() => { try { return JSON.parse(localStorage.getItem('clav-lineups-v2') || '{}'); } catch { return {}; } })();
        const ctxKey = `${selectedMap}:${side}`;
        const anyKey = `any:${side}`;
        const mapLineups  = stored[ctxKey]  || [];
        const anyLineups  = stored[anyKey]   || [];
        const all = [
          ...mapLineups.map(l => ({ ...l, source: 'Map' })),
          ...anyLineups.map(l => ({ ...l, source: 'Universal' })),
        ];
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}
            onClick={() => setLineupPickerOpen(false)}>
            <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-accent)', borderRadius:12, padding:24, minWidth:360, maxWidth:480, maxHeight:'70vh', overflowY:'auto', boxShadow:'0 16px 48px rgba(0,0,0,0.7)' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:11, letterSpacing:2, color:'var(--accent-gold)', marginBottom:16 }}>📋 LOAD LINEUP</div>
              {all.length === 0 ? (
                <div style={{ color:'var(--text-muted)', fontSize:13, padding:'20px 0' }}>No saved lineups for {side === 'attack' ? 'Attack' : 'Defense'} gefunden.<br/>Create lineups in the Lineup Creator.</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {all.map(lu => (
                    <button key={lu.id}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'var(--bg-panel)', border:'1px solid var(--border-subtle)', borderRadius:8, cursor:'pointer', textAlign:'left', width:'100%' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                      onClick={() => {
                        setLineupsByContext(prev => ({ ...prev, [lineupCtxKey]: lu.players }));
                        setLineupPickerOpen(false);
                        showToast(`Lineup "${lu.name}" loaded`);
                      }}>
                      <div style={{ display:'flex', gap:3 }}>
                        {(lu.players || []).slice(0, 5).map((p, i) => (
                          <div key={p.color+i} style={{ width:8, height:8, borderRadius:'50%', background: p.color, flexShrink:0 }} />
                        ))}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ color:'var(--text-primary)', fontSize:13, fontWeight:600 }}>{lu.name}</div>
                        <div style={{ color:'var(--text-muted)', fontSize:11, marginTop:2 }}>
                          {lu.source} · {(lu.players || []).filter(p => p.operator).map(p => p.operator.name).join(', ') || 'Empty'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <button style={{ marginTop:16, width:'100%', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:12 }}
                onClick={() => setLineupPickerOpen(false)}>Close</button>
            </div>
          </div>
        );
      })()}

      {/* Export Modal */}
      {exportModal && (
        <ExportModal
          floors={currentMap?.floors || []}
          selectedFloor={selectedFloor}
          onClose={() => setExportModal(false)}
          onExport={async (opts) => {
            setExportModal(false);
            const root = canvasInnerRef.current;
            if (!root) { showToast('Canvas not ready'); return; }
            setExporting(true);
            showToast('Exporting...');
            try {
              const floorsToExport = opts.floors;
              for (const floor of floorsToExport) {
                const isCurrent = floor === selectedFloor;
                await exportStratAsPNG(
                  root,
                  `${stratName||'strat'}-${floor}`.replace(/[^\w-]/g,'_'),
                  {
                    lineup: opts.withLineup ? lineup : [],
                    stratName: opts.withMeta ? stratName : '',
                    selectedFloor: opts.withMeta ? floor : '',
                    side,
                    visibleElements: isCurrent ? elements.filter(e => (!e.floor || e.floor === floor) && (!e.mapId || e.mapId === selectedMap)) : null,
                    overrideBlueprintSrc: isCurrent ? null : MAP_BLUEPRINTS[selectedMap]?.[floor],
                    overrideFloorElements: isCurrent ? null : elements.filter(e => (!e.floor || e.floor === floor) && (!e.mapId || e.mapId === selectedMap)),
                  }
                );
              }
              showToast(`✓ ${floorsToExport.length} PNG${floorsToExport.length > 1 ? 's' : ''} saved`);
            } catch (err) {
              console.error('[PNG Export]', err);
              showToast('Export failed: ' + err.message);
            } finally {
              setExporting(false);
            }
          }}
        />
      )}

      {/* Lineup Picker Modal */}
      {lineupPickerOpen && (() => {
        const stored = (() => { try { return JSON.parse(localStorage.getItem('clav-lineups-v2') || '{}'); } catch { return {}; } })();
        const ctxKey = `${selectedMap}:${side}`;
        const anyKey = `any:${side}`;
        const mapLineups = stored[ctxKey] || [];
        const anyLineups = stored[anyKey]  || [];
        const all = [
          ...mapLineups.map(l => ({ ...l, source: 'Map' })),
          ...anyLineups.map(l => ({ ...l, source: 'Universal' })),
        ];
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}
            onClick={() => setLineupPickerOpen(false)}>
            <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-accent)', borderRadius:12, padding:24, minWidth:360, maxWidth:480, maxHeight:'70vh', overflowY:'auto', boxShadow:'0 16px 48px rgba(0,0,0,0.7)' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:11, letterSpacing:2, color:'var(--accent-gold)', marginBottom:16 }}>📋 LOAD LINEUP</div>
              {all.length === 0 ? (
                <div style={{ color:'var(--text-muted)', fontSize:13, padding:'20px 0' }}>No saved lineups found for {side === 'attack' ? 'attack' : 'defense'}.<br/>Create them in the Lineup Creator.</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {all.map(lu => (
                    <button key={lu.id}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'var(--bg-panel)', border:'1px solid var(--border-subtle)', borderRadius:8, cursor:'pointer', textAlign:'left', width:'100%' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                      onClick={() => {
                        setLineupsByContext(prev => ({ ...prev, [lineupCtxKey]: lu.players }));
                        setLineupPickerOpen(false);
                        showToast(`Lineup "${lu.name}" loaded`);
                      }}>
                      <div style={{ display:'flex', gap:3 }}>
                        {(lu.players || []).slice(0, 5).map((p, i) => (
                          <div key={p.color+i} style={{ width:8, height:8, borderRadius:'50%', background: p.color, flexShrink:0 }} />
                        ))}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ color:'var(--text-primary)', fontSize:13, fontWeight:600 }}>{lu.name}</div>
                        <div style={{ color:'var(--text-muted)', fontSize:11, marginTop:2 }}>
                          {lu.source} · {(lu.players || []).filter(p => p.operator).map(p => p.operator.name).join(', ') || 'Empty'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <button style={{ marginTop:16, width:'100%', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:12 }}
                onClick={() => setLineupPickerOpen(false)}>Close</button>
            </div>
          </div>
        );
      })()}

      {/* Floating operator icon that follows cursor during custom drag */}
      {opDrag && (
        <div style={{
          position: 'fixed', left: opDrag.clientX, top: opDrag.clientY,
          transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 9999,
          width: 44, height: 44, background: 'rgba(8,10,14,0.92)',
          border: `2px solid ${opDrag.color}`, borderRadius: 8, padding: 4,
          boxSizing: 'border-box',
        }}>
          {opDrag.op?.icon && <img src={opDrag.op.icon} alt="" style={{ width:'100%', height:'100%', objectFit:'contain' }} />}
        </div>
      )}
    </div>
  );
}
