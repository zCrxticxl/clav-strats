import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useStrats } from '../hooks/useStrats';
import { useEditorHistory } from '../hooks/useEditorHistory';
import { useEditorViewport } from '../hooks/useEditorViewport';
import { setCollabUrl, useCollab } from '../hooks/useCollab';
import { useEditorCollaboration } from '../hooks/useEditorCollaboration';
import { CollabBar, CollabCursors } from '../components/editor/CollabUI';
import { ALL_MAPS, MAP_BLUEPRINTS } from '../data/maps';
import { ATTACKERS, DEFENDERS } from '../data/operators';
import { PLAYER_COLORS, EXTENDED_COLORS, ALL_GADGETS, ROLES, GADGETS } from '../data/gadgets';

import { MAP_WALLS } from '../data/walls';
import { exportStratAsPNG } from '../utils/exportPng';
import { detectWalls } from '../utils/wallDetector';
import { OpImg } from '../components/editor/OpIcons';
import { InteractiveWall } from '../components/editor/InteractiveWall';
import { LineupStrip, LineupConfigModal } from '../components/editor/LineupComponents';
import { renderBasicEditorElement } from '../components/editor/BasicElementRenderer';
import { renderWallEditorElement } from '../components/editor/WallElementRenderer';
import { renderGadgetElement } from '../components/editor/GadgetElementRenderer';
import { renderSpecialEditorElement } from '../components/editor/SpecialElementRenderer';
import { getEditorCursor } from '../utils/editorTools';
import {
  ATTACHED_GADGET_SIZE, findNearestGadgetMarker, getAttachedGadgetPosition,
  getDefaultAttachmentSide, getNextAttachmentSlot, layoutAttachedGadgets,
  requiresMarker, supportsWallAttachment, upsertAttachedGadget,
} from '../utils/gadgetPlacement';
import { recolorElements } from '../utils/elementColor';
import { EditorToast } from '../components/editor/EditorToast';
import { EditorTopbar } from '../components/editor/EditorTopbar';
import { HistoryActions } from '../components/editor/HistoryActions';
import { StratActions } from '../components/editor/StratActions';
import { CanvasActions } from '../components/editor/CanvasActions';
import { StratNavigation } from '../components/editor/StratNavigation';
import { MapPicker } from '../components/editor/MapPicker';
import { ToolPalette } from '../components/editor/ToolPalette';
import { StylePalette } from '../components/editor/StylePalette';
import { OperatorPalette } from '../components/editor/OperatorPalette';
import { CanvasTextInput } from '../components/editor/CanvasTextInput';
import { parseCollabInvite } from '../utils/collabInvite';

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
  { id: 'verticalholes', label: 'Vertical Holes', emoji: '⋮', shortcut: 'U' },
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
  const hostingCollabRef = useRef(sp.get('collabHost') === '1');
  useEffect(() => () => {
    if (!hostingCollabRef.current || !window.__TAURI_INTERNALS__) return;
    hostingCollabRef.current = false;
    import('@tauri-apps/api/core')
      .then(({ invoke }) => invoke('stop_collab_host'))
      .catch(error => console.error('[collab host cleanup]', error));
  }, []);
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
  const [textInput, setTextInput]           = useState({ active: false, x: 0, y: 0, clientX: 0, clientY: 0, val: '' });
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
      setElements(prev => recolorElements(prev, ids, activeColor), { groupKey: 'recolor' });
      return true;
    }
    const clickedElement = elements.find(element => element.id === elementId);
    if (activeTool === 'eraser') {
      e.stopPropagation();
      return true;
    }
    if (clickedElement?.color && clickedElement.color !== activeColor) {
      e.stopPropagation();
      setElements(prev => recolorElements(prev, [elementId], activeColor), { groupKey:'recolor' });
      if (activeTool === 'select') setSelectedIds([elementId]);
      return true;
    }
    if (activeTool !== 'select') {
      e.stopPropagation();
      return true;
    }
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

    if (activeTool === 'text') {
      setTextInput({ active:true, x:pt.x, y:pt.y, clientX:e.clientX, clientY:e.clientY, val:'' });
      return;
    }
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
    if (activeTool === 'verticalholes') {
      setElements(prev => [...prev, {
        id:Date.now(), type:'verticalholes', x:pt.x, y:pt.y,
        color:activeColor, scale:1, rotation:0,
        floor:selectedFloor, mapId:selectedMap,
      }]);
      return;
    }
    if (activeTool === 'rotate' || activeTool === 'headline' || activeTool === 'feetline') {
      const snap = findNearestWall(pt, interactiveWalls, 5);
      if (snap) {
        setElements(prev => {
          const existing = prev.find(element => element.wallId === snap.id && element.type === activeTool);
          if (existing) {
            return existing.color === activeColor
              ? prev
              : prev.map(element => element.id === existing.id ? { ...element, color:activeColor } : element);
          }
          return [...prev, { id: Date.now(), type: activeTool, wallId: snap.id, x: snap.x, y: snap.y, w: snap.w, h: snap.h, color: activeColor, horizontal: snap.horizontal, floor: selectedFloor, mapId: selectedMap }];
        });
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
    const clickedElement = elements.find(element => element.id === id);
    if (clickedElement?.color && clickedElement.color !== activeColor) {
      setElements(previous => recolorElements(previous, [id], activeColor), { groupKey:'recolor' });
      if (activeTool === 'select') setSelectedIds([id]);
      return;
    }
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

  const submitText = (value = textInput.val) => {
    if (value.trim()) {
      setElements(prev => [...prev, { id: Date.now(), type: 'text', x: textInput.x, y: textInput.y, text:value, color: activeColor, floor: selectedFloor, mapId: selectedMap }]);
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
  const applyCollabMeta = useCallback((yMeta) => {
    if (yMeta.has('name')) setStratName(yMeta.get('name'));
    if (yMeta.has('side')) setSide(yMeta.get('side'));
    if (yMeta.has('floor')) setSelectedFloor(yMeta.get('floor'));
    if (yMeta.has('map')) setSelectedMap(yMeta.get('map'));
    if (yMeta.has('description')) setDescription(yMeta.get('description'));
    if (yMeta.has('tags')) setTags(yMeta.get('tags'));
  }, []);

  // ── collab: once initial state has synced, pull it, then allow local pushes ─
  const collabMeta = useMemo(() => ({
    name: stratName, side, floor: selectedFloor, map: selectedMap, description, tags,
  }), [stratName, side, selectedFloor, selectedMap, description, tags]);
  useEditorCollaboration({
    collab, room, elements, lineupsByContext, meta: collabMeta, history,
    applyingRemoteRef, metaApplyingRef, canPushRef, setMeta: applyCollabMeta,
  });

  // ── collab sync: local → remote (diff into Yjs maps, origin 'local') ──────
  // Tauri starts both the embedded Yjs server and a temporary public tunnel.
  const startCollab = useCallback(async () => {
    if (!window.__TAURI_INTERNALS__) {
      throw new Error('Automatic Live Collab hosting requires the Tauri desktop app.');
    }
    const { invoke } = await import('@tauri-apps/api/core');
    const host = await invoke('start_collab_host');
    if (!host?.serverUrl) {
      throw new Error('The public collaboration server did not return an address.');
    }
    setCollabUrl(host.serverUrl);
    hostingCollabRef.current = true;
    const id = (window.crypto?.randomUUID?.() || `${Date.now()}${Math.random()}`)
      .replace(/[^\w]/g, '')
      .slice(0, 16);
    const next = new URLSearchParams(sp);
    next.set('room', id);
    next.set('collabHost', '1');
    setSp(next);
    showToast('Live Collab is ready — share the invitation code');
  }, [sp, setSp, showToast]);

  const leaveCollab = useCallback(async () => {
    const next = new URLSearchParams(sp);
    next.delete('room');
    next.delete('collabHost');
    setSp(next);
    if (hostingCollabRef.current && window.__TAURI_INTERNALS__) {
      hostingCollabRef.current = false;
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('stop_collab_host');
      } catch (error) {
        console.error('[collab host stop]', error);
      }
    }
  }, [sp, setSp]);

  // New invitation codes carry both the room and its tunnel. Raw legacy room codes still work.
  const joinCollab = useCallback((input) => {
    const invitation = parseCollabInvite(input);
    if (invitation.serverUrl) setCollabUrl(invitation.serverUrl);
    const next = new URLSearchParams(sp);
    next.set('room', invitation.room);
    next.delete('collabHost');
    hostingCollabRef.current = false;
    setSp(next);
  }, [sp, setSp]);

  const handleNewStrat = () => {
    if (window.confirm('Create a new empty strat?')) {
      navigate('/editor');
      setTimeout(() => { history.reset({ elements: [], lineupsByContext: {} }); setStratName('Untitled Strat'); setDescription(''); setTags([]); }, 50);
    }
  };

  const handleDuplicateStrat = () => {
    const copy = {
      ...JSON.parse(JSON.stringify({ elements, lineupsByContext, side, description, tags })),
      id: undefined,
      name: `${stratName} (Copy)`,
      mapId: selectedMap,
      floor: selectedFloor,
    };
    const saved = saveStrat(copy);
    navigate(`/editor/${saved.id}`);
    showToast('Strat duplicated!');
  };

  const handleEditNote = () => {
    const nextDescription = window.prompt('Note:', description);
    if (nextDescription !== null) setDescription(nextDescription);
  };

  const handleDeleteSelection = () => {
    setElements(previous => previous.filter(element => !selectedIds.includes(element.id)));
    setSelectedIds([]);
  };

  const handleClearElements = () => {
    if (!window.confirm('Clear all elements?')) return;
    setElements([]);
    setSelectedIds([]);
  };

  const handleToolSelect = (toolId) => {
    setActiveTool(toolId);
    if (toolId !== 'operator') setPendingOp(null);
    if (toolId !== 'gadget') setPendingGadget(null);
  };

  const handleGadgetDragStart = (event, gadget) => {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/x-clav-gadget', JSON.stringify({ gadget, color:activeColor }));
    event.dataTransfer.setDragImage(makeDragGhost(gadget.icon, activeColor), 22, 22);
    const drag = { gadget, color:activeColor };
    draggingRef.current = drag;
    setDraggingGadget(drag);
  };

  const handleGadgetDragEnd = () => {
    draggingRef.current = null;
    setDraggingGadget(null);
    setDragPreview(null);
  };

  const handleOperatorMouseDown = (event, operator) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const drag = { op:operator, color:activeColor };
    opDragRef.current = drag;
    setOpDrag({ ...drag, clientX:event.clientX, clientY:event.clientY });
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
    const basicElement = renderBasicEditorElement({ el, preview, key, glow, onClick, onMouseDown: onMd, onContextMenu: onCtxMenu });
    if (basicElement) return basicElement;
    const wallElement = renderWallEditorElement({ el, key, glow, onClick, onMouseDown: onMd, onContextMenu: onCtxMenu });
    if (wallElement !== undefined) return wallElement;
    const specialElement = renderSpecialEditorElement({ el, key, glow, onClick, onMouseDown: onMd, onContextMenu: onCtxMenu });
    if (specialElement !== undefined) return specialElement;
    const gadgetElement = renderGadgetElement({ el, preview, key, glow, onClick, onMouseDown: onMd, onContextMenu: onCtxMenu, hoveredElIdRef });
    if (gadgetElement !== undefined) return gadgetElement;
    return null;
  };

  const getCursor = () => getEditorCursor(activeTool, pendingOp, pendingGadget);

  const { zoom, panX, panY } = vpState;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="editor-layout">

      {/* Top Bar */}
      <EditorTopbar>
        <StratNavigation
          stratName={stratName}
          onNameChange={setStratName}
          mapPicker={<MapPicker value={selectedMap} onChange={setSelectedMap}/>}
          selectedMap={selectedMap}
          stratId={stratId}
          strats={strats}
          onOpenStrat={id => navigate(`/editor/${id}`)}
          onNewStrat={handleNewStrat}
        />
        <HistoryActions history={history}/>
        <div className="topbar-spacer"/>
        <CanvasActions
          selectedCount={selectedIds.length}
          canDetectWalls={!!mapImage}
          detectingWalls={detectingWalls}
          showGrid={showGrid}
          zoom={zoom}
          exporting={exporting}
          onDeleteSelection={handleDeleteSelection}
          onDetectWalls={reDetectWalls}
          onToggleGrid={() => setShowGrid(value => !value)}
          onResetView={resetView}
          onClear={handleClearElements}
          onExport={() => setExportModal(true)}
          onOpenLineup={() => setLineupPickerOpen(true)}
        />
        <StratActions
          description={description}
          onNew={handleNewStrat}
          onDuplicate={handleDuplicateStrat}
          onEditNote={handleEditNote}
          onSave={handleSave}
        />
      </EditorTopbar>

      {/* Left Panel */}
      <aside className="editor-sidebar">
        <ToolPalette
          tools={DRAW_TOOLS}
          activeTool={activeTool}
          activeColor={activeColor}
          reinforcementCount={reinforceCount}
          rotateOrientation={rotateOrient}
          gadgetCategory={gadgetCat}
          gadgets={ALL_GADGETS}
          onSelectTool={handleToolSelect}
          onRotateOrientation={setRotateOrient}
          onGadgetCategory={setGadgetCat}
          onGadgetDragStart={handleGadgetDragStart}
          onGadgetDragEnd={handleGadgetDragEnd}
        />

        <StylePalette
          activeColor={activeColor}
          colors={EXTENDED_COLORS}
          strokeWidth={strokeWidth}
          onColor={setActiveColor}
          onStrokeWidth={setStrokeWidth}
        />
        <OperatorPalette
          activeTool={activeTool}
          activeColor={activeColor}
          side={side}
          search={opSearch}
          operators={filteredOps}
          pendingOperator={pendingOp}
          onSearch={setOpSearch}
          onOperatorMouseDown={handleOperatorMouseDown}
        />
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
            const gadget = (d.gadget && GADGETS[d.gadget.id]) || d.gadget;
            const nearest = gadget ? findNearestGadgetMarker(gadget, pt, interactiveWalls) : null;
            if (nearest) {
              const slot = getNextAttachmentSlot(elements, nearest.marker.id);
              const slotSpacingScale = Math.max(
                1,
                ...elements
                  .filter(element => element.type === 'gadget' && element.wallId === nearest.marker.id)
                  .map(element => element.scale || 1)
              );
              const position = getAttachedGadgetPosition(nearest.marker, { slot, slotSpacingScale });
              setDragPreview({ ...d, gadget, ...position, anchor:nearest.marker });
            } else {
              setDragPreview({ ...d, gadget, x:pt.x, y:pt.y, invalid:requiresMarker(gadget) });
            }
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
                const nearest = findNearestGadgetMarker(g, pt, interactiveWalls);
                if (requiresMarker(g) && !nearest) {
                  const types = g.markerTypes || [];
                  const acceptsWalls = types.some(type => type === 'wall' || type === 'softwall');
                  const acceptsOpenings = types.some(type => type === 'door' || type === 'window' || type === 'hatch');
                  const target = acceptsWalls && acceptsOpenings
                    ? 'marked walls, doors, windows or hatches'
                    : g.placement === 'opening'
                      ? 'marked doors, windows or hatches'
                      : 'marked walls';
                  showToast(`${g.label} can only be placed on ${target}`);
                } else if (nearest) {
                  setElements(previous => upsertAttachedGadget(previous, nearest.marker, g, c, {
                    floor:selectedFloor, mapId:selectedMap,
                  }));
                } else {
                  setElements(prev => [...prev, { id: Date.now(), type: 'gadget', gadget: g, x: pt.x, y: pt.y, color: c, floor: selectedFloor, mapId: selectedMap }]);
                }
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
                      (draggingGadget?.gadget && (
                        draggingGadget.gadget.placement === 'opening' || supportsWallAttachment(draggingGadget.gadget)
                      ) ? draggingGadget.gadget : null)
                    }
                    imgAspect={imgAspect}
                    selectedIds={selectedIds}
                    onSelectElement={(id, additive) => setSelectedIds(previous => {
                      if (!additive) return [id];
                      return previous.includes(id)
                        ? previous.filter(selectedId => selectedId !== id)
                        : [...previous, id];
                    })}
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
                  const { x, y, op, gadget, color, anchor, invalid } = dragPreview;
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
                    const gs = anchor ? ATTACHED_GADGET_SIZE : 3.4;
                    const previewColor = invalid ? '#E84B4B' : color;
                    return (
                      <g style={{ pointerEvents:'none', opacity:0.75 }}>
                        {anchor && <line x1={`${anchor.x}%`} y1={`${anchor.y}%`} x2={`${x}%`} y2={`${y}%`} stroke={previewColor} strokeWidth="1.1" strokeDasharray="2 1.2" strokeLinecap="round"/>}
                        <rect x={`${x-gs/2}%`} y={`${y-gs/2}%`} width={`${gs}%`} height={`${gs}%`} fill="rgba(8,10,14,0.85)" stroke={previewColor} strokeWidth="1.5" strokeDasharray={invalid ? '2 1' : undefined} rx="0.6"/>
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
                <CanvasTextInput
                  clientX={textInput.clientX} clientY={textInput.clientY}
                  value={textInput.val} color={activeColor}
                  onChange={value => setTextInput(current => ({ ...current, val:value }))}
                  onSubmit={submitText}
                  onCancel={() => setTextInput({ active:false, x:0, y:0, val:'' })}
                />
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
          const sizable = ['gadget','reinforcement','barricade','rotate','headline','feetline','verticalholes','operator'].includes(sel.type);
          if (!sizable) return null;
          const label = sel.type === 'gadget' ? (sel.gadget?.label || 'Gadget')
                       : sel.type === 'operator' ? (sel.op?.name || 'Operator')
                       : sel.type === 'verticalholes' ? 'Vertical Holes'
                       : sel.type[0].toUpperCase() + sel.type.slice(1);
          const scale = sel.scale ?? 1;
          const attachmentMarker = sel.wallId
            ? interactiveWalls.find(marker => marker.id === sel.wallId)
            : null;
          const applyScale = next => setElements(prev => {
            const updated = prev.map(element => element.id === sel.id ? { ...element, scale:next } : element);
            return sel.type === 'gadget' && attachmentMarker
              ? layoutAttachedGadgets(updated, attachmentMarker)
              : updated;
          });
          const changeAttachmentSide = nextSide => {
            if (!attachmentMarker) return;
            setElements(prev => {
              const updated = prev.map(element => element.id === sel.id
                ? { ...element, attachmentSide:nextSide }
                : element);
              return layoutAttachedGadgets(updated, attachmentMarker);
            });
          };
          return (
            <div className="sidebar-section" style={{ borderBottom: '2px solid var(--accent-gold)' }}>
              <div className="sidebar-section-title" style={{ color: 'var(--accent-gold)' }}>⚙ {label}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginTop:6, marginBottom:4 }}>
                GRÖSSE — {Math.round(scale * 100)}%
              </div>
              <input type="range" min="0.3" max="3" step="0.05" value={scale}
                onChange={e => applyScale(Number(e.target.value))}
                style={{ width:'100%', accentColor:'var(--accent-gold)' }} />
              <div style={{ display:'flex', gap:4, marginTop:6 }}>
                {[0.5, 1, 1.5, 2].map(v => (
                  <button key={v}
                    onClick={() => applyScale(v)}
                    style={{ flex:1, background: Math.abs((sel.scale ?? 1) - v) < 0.04 ? 'var(--accent-gold)' : 'var(--bg-panel)', color: Math.abs((sel.scale ?? 1) - v) < 0.04 ? 'var(--bg-void)' : 'var(--text-secondary)', border:'1px solid var(--border-subtle)', borderRadius:3, padding:'3px 6px', cursor:'pointer', fontFamily:'var(--font-display)', fontSize:11, fontWeight:700 }}>
                    {v}×
                  </button>
                ))}
              </div>
              {sel.type === 'gadget' && (
                <>
                  <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginTop:12, marginBottom:4 }}>
                    AUSRICHTUNG — {sel.rotation || 0}°
                  </div>
                  <div style={{ display:'flex', gap:4 }}>
                    {[0, 90, 180, 270].map(degrees => (
                      <button key={degrees}
                        onClick={() => setElements(prev => prev.map(element => element.id === sel.id ? { ...element, rotation:degrees } : element))}
                        style={{ flex:1, background:(sel.rotation || 0) === degrees ? 'var(--accent-gold)' : 'var(--bg-panel)', color:(sel.rotation || 0) === degrees ? 'var(--bg-void)' : 'var(--text-secondary)', border:'1px solid var(--border-subtle)', borderRadius:3, padding:'4px 3px', cursor:'pointer', fontFamily:'var(--font-display)', fontSize:10, fontWeight:700 }}>
                        {degrees}°
                      </button>
                    ))}
                  </div>
                </>
              )}
              {sel.type === 'gadget' && attachmentMarker && (() => {
                const horizontal = attachmentMarker.horizontal !== false;
                const currentSide = sel.attachmentSide ?? getDefaultAttachmentSide(attachmentMarker);
                const sides = horizontal
                  ? [{ value:-1, label:'Oben' }, { value:1, label:'Unten' }]
                  : [{ value:-1, label:'Links' }, { value:1, label:'Rechts' }];
                return (
                  <>
                    <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginTop:12, marginBottom:4 }}>
                      WANDSEITE
                    </div>
                    <div style={{ display:'flex', gap:4 }}>
                      {sides.map(option => (
                        <button key={option.value} onClick={() => changeAttachmentSide(option.value)}
                          style={{ flex:1, background:currentSide === option.value ? 'var(--accent-gold)' : 'var(--bg-panel)', color:currentSide === option.value ? 'var(--bg-void)' : 'var(--text-secondary)', border:'1px solid var(--border-subtle)', borderRadius:3, padding:'5px 6px', cursor:'pointer', fontFamily:'var(--font-display)', fontSize:11, fontWeight:700 }}>
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                );
              })()}
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

      <EditorToast message={toast}/>

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
