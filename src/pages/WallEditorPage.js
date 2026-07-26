import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ALL_MAPS, MAP_BLUEPRINTS } from '../data/maps';
import { detectWalls } from '../utils/wallDetector';

const STORAGE_KEY = 'clav-walls-v2';
const IDB_NAME    = 'clav-strats-fs';
const IDB_STORE   = 'handles';
const IDB_KEY     = 'walls-js';

function openIDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
    req.onsuccess = e => res(e.target.result);
    req.onerror   = e => rej(e.target.error);
  });
}
async function loadHandle() {
  try {
    const db = await openIDB();
    return await new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = e => res(e.target.result ?? null);
      req.onerror   = e => rej(e.target.error);
    });
  } catch { return null; }
}
async function storeHandle(handle) {
  try {
    const db = await openIDB();
    await new Promise((res, rej) => {
      const tx  = db.transaction(IDB_STORE, 'readwrite');
      const req = tx.objectStore(IDB_STORE).put(handle, IDB_KEY);
      req.onsuccess = () => res();
      req.onerror   = e => rej(e.target.error);
    });
  } catch {}
}

function wallsToJS(walls) {
  const lines = ['// Wall Data — manually placed via Wall Editor', 'export const MAP_WALLS = {'];
  for (const [mapId, floors] of Object.entries(walls)) {
    if (Object.keys(floors).length === 0) continue;
    lines.push(`  ${mapId}: {`);
    for (const [floor, ws] of Object.entries(floors)) {
      if (!ws || ws.length === 0) continue;
      lines.push(`    '${floor}': [`);
      for (const w of ws) {
        lines.push(`      { id: ${w.id}, type: '${w.type}', x: ${w.x.toFixed(2)}, y: ${w.y.toFixed(2)}, horizontal: ${w.horizontal} },`);
      }
      lines.push('    ],');
    }
    lines.push('  },');
  }
  lines.push('};');
  return lines.join('\n');
}

const WALL_TYPES = [
  { id: 'wall',     label: 'Wall',      color: '#E8B84B', desc: 'Reinforceable wall (yellow-black stripes)' },
  { id: 'hatch',    label: 'Hatch',     color: '#E87B4B', desc: 'Reinforceable hatch (square)' },
  { id: 'door',     label: 'Door',      color: '#4B9CE8', desc: 'Door (barricadeable)' },
  { id: 'window',   label: 'Window',    color: '#50E8A0', desc: 'Window (barricadeable)' },
  { id: 'softwall', label: 'Soft Wall', color: '#B04BE8', desc: 'Destructible wall (no reinforcement)' },
];

export default function WallEditorPage() {
  const containerRef = useRef(null);
  const vpRef        = useRef({ zoom: 1, panX: 0, panY: 0 });
  const [vpState, setVpState] = useState({ zoom: 1, panX: 0, panY: 0 });
  const setVp = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(vpRef.current) : updater;
    vpRef.current = next;
    setVpState(next);
  }, []);

  const isPanning = useRef(false);
  const panStart  = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const [selectedMap,   setSelectedMap]   = useState('bank');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [activeType,    setActiveType]    = useState('wall');
  const [walls,         setWalls]         = useState({});
  const [hoverPos,      setHoverPos]      = useState(null);
  const [exportText,    setExportText]    = useState('');
  const [showExport,    setShowExport]    = useState(false);
  const [copyFeedback,  setCopyFeedback]  = useState(false);
  const [toast,         setToast]         = useState('');
  const [fileHandle,    setFileHandle]    = useState(null);
  const fileHandleRef = useRef(null);

  // Load persisted file handle from IndexedDB on mount
  useEffect(() => {
    loadHandle().then(async (h) => {
      if (!h) return;
      try {
        const perm = await h.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') { fileHandleRef.current = h; setFileHandle(h); }
      } catch {}
    });
  }, []);

  const autoWriteToFile = useCallback(async (updatedWalls) => {
    const h = fileHandleRef.current;
    if (!h) return;
    try {
      const perm = await h.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted') {
        const req = await h.requestPermission({ mode: 'readwrite' });
        if (req !== 'granted') return;
      }
      const writable = await h.createWritable();
      await writable.write(wallsToJS(updatedWalls));
      await writable.close();
    } catch {}
  }, []);

  // Auto-detection state
  const [detecting,     setDetecting]     = useState(false);
  const [suggestions,   setSuggestions]   = useState(null); // { walls, doors, hatches } | null
  const [detectorOpts,  setDetectorOpts]  = useState({
    minPixels: 35, minFill: 0.16,
    doors: false,
    hatches: false,
  });
  const innerRef = useRef(null); // aspect-locked inner canvas (image + svg)
  const [imgAspect, setImgAspect] = useState(null);

  const currentMap = ALL_MAPS.find(m => m.id === selectedMap);
  const mapImage   = MAP_BLUEPRINTS[selectedMap]?.[selectedFloor] ?? null;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  useEffect(() => {
    if (currentMap && !currentMap.floors.includes(selectedFloor)) {
      setSelectedFloor(currentMap.floors[0]);
    }
  }, [selectedMap]);

  useEffect(() => {
    try {
      localStorage.removeItem('clav-walls');
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setWalls(JSON.parse(saved));
    } catch {}
  }, []);

  const saveWalls = (updated) => {
    setWalls(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch (e) { console.error(e); }
    autoWriteToFile(updated);
  };

  const getCurrentWalls = () => walls[selectedMap]?.[selectedFloor] || [];

  const DEFAULT_DIMS = {
    wall:     { w: 3.5, h: 0.7 },
    softwall: { w: 3.5, h: 0.7 },
    hatch:    { w: 2.8, h: 2.8 },
    door:     { w: 1.5, h: 1.5 },
    window:   { w: 2.0, h: 1.0 },
  };

  const addWall = (x, y) => {
    const typeInfo = WALL_TYPES.find(t => t.id === activeType);
    const dims = DEFAULT_DIMS[activeType] || { w: 2, h: 2 };
    const newWall = {
      id: Date.now(), type: activeType, x, y,
      w: dims.w, h: dims.h,
      color: typeInfo.color, horizontal: false,
    };
    saveWalls({
      ...walls,
      [selectedMap]: {
        ...(walls[selectedMap] || {}),
        [selectedFloor]: [...getCurrentWalls(), newWall],
      },
    });
  };

  const removeWall = (id) => {
    saveWalls({
      ...walls,
      [selectedMap]: {
        ...(walls[selectedMap] || {}),
        [selectedFloor]: getCurrentWalls().filter(w => w.id !== id),
      },
    });
  };

  const toggleWallOrientation = (id) => {
    const swap = (w) => ({ ...w, horizontal: !w.horizontal, w: w.h ?? 1, h: w.w ?? 3 });
    saveWalls({
      ...walls,
      [selectedMap]: {
        ...(walls[selectedMap] || {}),
        [selectedFloor]: getCurrentWalls().map(w => w.id === id ? swap(w) : w),
      },
    });
  };

  const clearFloor = () => {
    if (!window.confirm(`Clear all elements on ${selectedFloor}?`)) return;
    saveWalls({
      ...walls,
      [selectedMap]: { ...(walls[selectedMap] || {}), [selectedFloor]: [] },
    });
    showToast('Floor cleared');
  };

  // Zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const rect   = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setVp(prev => {
      const nextZoom = Math.min(Math.max(prev.zoom * factor, 0.2), 12);
      const worldX = (mouseX - prev.panX) / prev.zoom;
      const worldY = (mouseY - prev.panY) / prev.zoom;
      return { zoom: nextZoom, panX: mouseX - worldX * nextZoom, panY: mouseY - worldY * nextZoom };
    });
  }, [setVp]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Pan
  useEffect(() => {
    const onMove = e => {
      if (!isPanning.current) return;
      setVp(prev => ({ ...prev, panX: panStart.current.ox + e.clientX - panStart.current.x, panY: panStart.current.oy + e.clientY - panStart.current.y }));
    };
    const onUp = () => { isPanning.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [setVp]);

  const toCanvas = (clientX, clientY) => {
    // Use the aspect-locked inner box so coordinates align with markers.
    const el = innerRef.current || containerRef.current;
    if (!el) return { x: 50, y: 50 };
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { x: 50, y: 50 };
    return {
      x: ((clientX - rect.left) / rect.width)  * 100,
      y: ((clientY - rect.top)  / rect.height) * 100,
    };
  };

  const onMouseDown = (e) => {
    if (e.button === 1) {
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY, ox: vpRef.current.panX, oy: vpRef.current.panY };
      return;
    }
    if (e.button !== 0) return;
    // Don't add walls while reviewing suggestions — user must accept/discard first
    if (suggestions) return;
    const pt = toCanvas(e.clientX, e.clientY);
    addWall(pt.x, pt.y);
  };

  const onMouseMove = (e) => {
    setHoverPos(toCanvas(e.clientX, e.clientY));
  };

  // ── Auto-detect walls/doors/hatches from the blueprint ──────────────────
  const handleAutoDetect = async () => {
    if (!mapImage) { showToast('No blueprint loaded'); return; }
    setDetecting(true);
    setSuggestions(null);
    try {
      const result = await detectWalls(mapImage, detectorOpts);
      setSuggestions(result);
      const total = result.walls.length + result.doors.length + result.hatches.length;
      showToast(`${total} suggestions found (${result.walls.length} walls · ${result.doors.length} doors · ${result.hatches.length} hatches)`);
    } catch (e) {
      console.error(e);
      showToast('Detection failed: ' + e.message);
    } finally {
      setDetecting(false);
    }
  };

  const acceptSuggestions = () => {
    if (!suggestions) return;
    const all = [...suggestions.walls, ...suggestions.doors, ...suggestions.hatches];
    if (all.length === 0) { showToast('No suggestions to apply'); return; }
    saveWalls({
      ...walls,
      [selectedMap]: {
        ...(walls[selectedMap] || {}),
        [selectedFloor]: [...getCurrentWalls(), ...all.map(w => ({
          ...w,
          color: WALL_TYPES.find(t => t.id === w.type)?.color || '#888',
        }))],
      },
    });
    setSuggestions(null);
    showToast(`${all.length} Elemente übernommen`);
  };

  const rejectSuggestion = (id) => {
    if (!suggestions) return;
    setSuggestions({
      walls:   suggestions.walls.filter(w => w.id !== id),
      doors:   suggestions.doors.filter(w => w.id !== id),
      hatches: suggestions.hatches.filter(w => w.id !== id),
    });
  };

  const handleExport = () => {
    const lines = ['// Wall Data — paste into src/data/walls.js'];
    lines.push('export const MAP_WALLS = {');
    for (const [mapId, floors] of Object.entries(walls)) {
      if (Object.keys(floors).length === 0) continue;
      lines.push(`  ${mapId}: {`);
      for (const [floor, ws] of Object.entries(floors)) {
        if (!ws || ws.length === 0) continue;
        lines.push(`    '${floor}': [`);
        for (const w of ws) {
          lines.push(`      { id: ${w.id}, type: '${w.type}', x: ${w.x.toFixed(2)}, y: ${w.y.toFixed(2)}, horizontal: ${w.horizontal} },`);
        }
        lines.push('    ],');
      }
      lines.push('  },');
    }
    lines.push('};');
    setExportText(lines.join('\n'));
    setShowExport(true);
    setCopyFeedback(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      showToast('Copy failed — please select and copy manually');
    }
  };

  const handleSaveLocal = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(walls)); } catch (e) { console.error(e); }
    showToast('Walls saved locally');
  };

  const handleConnectFile = async () => {
    try {
      const h = await window.showSaveFilePicker({
        suggestedName: 'walls.js',
        types: [{ description: 'JavaScript', accept: { 'text/javascript': ['.js'] } }],
      });
      fileHandleRef.current = h;
      setFileHandle(h);
      await storeHandle(h);
      // Write immediately
      const writable = await h.createWritable();
      await writable.write(wallsToJS(walls));
      await writable.close();
      showToast('✓ Verbunden — speichert ab jetzt automatisch');
    } catch (err) {
      if (err.name !== 'AbortError') showToast('Fehler beim Verbinden');
    }
  };

  const handleWriteToFile = async () => {
    const lines = ['// Wall Data — manually placed via Wall Editor'];
    lines.push('export const MAP_WALLS = {');
    for (const [mapId, floors] of Object.entries(walls)) {
      if (Object.keys(floors).length === 0) continue;
      lines.push(`  ${mapId}: {`);
      for (const [floor, ws] of Object.entries(floors)) {
        if (!ws || ws.length === 0) continue;
        lines.push(`    '${floor}': [`);
        for (const w of ws) {
          lines.push(`      { id: ${w.id}, type: '${w.type}', x: ${w.x.toFixed(2)}, y: ${w.y.toFixed(2)}, horizontal: ${w.horizontal} },`);
        }
        lines.push('    ],');
      }
      lines.push('  },');
    }
    lines.push('};');
    const content = lines.join('\n');
    try {
      if (window.showSaveFilePicker) {
        const fh = await window.showSaveFilePicker({
          suggestedName: 'walls.js',
          types: [{ description: 'JavaScript', accept: { 'text/javascript': ['.js'] } }],
        });
        const writable = await fh.createWritable();
        await writable.write(content);
        await writable.close();
        showToast('✓ walls.js saved');
      } else {
        // Fallback: download
        const blob = new Blob([content], { type: 'text/javascript' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'walls.js';
        a.click();
        showToast('walls.js downloaded');
      }
    } catch (err) {
      if (err.name !== 'AbortError') showToast('Save failed');
    }
  };

  const wallCounts = getCurrentWalls().reduce((acc, w) => { acc[w.type] = (acc[w.type] || 0) + 1; return acc; }, {});
  const { zoom, panX, panY } = vpState;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gridTemplateRows: '56px 1fr', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>

      {/* Top bar */}
      <div style={{ gridColumn: '1/-1', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, letterSpacing: 1, color: 'var(--accent-gold)' }}>⚙ WALL EDITOR</div>
        <select className="topbar-select" value={selectedMap} onChange={e => setSelectedMap(e.target.value)}>
          {ALL_MAPS.map(map => (
            <option key={map.id} value={map.id}>{map.name}</option>
          ))}
        </select>
        {currentMap && currentMap.floors.map(f => (
          <button key={f} className={`floor-tab ${selectedFloor === f ? 'active' : ''}`} onClick={() => setSelectedFloor(f)}>{f}</button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
          {getCurrentWalls().length} placed on this floor
        </div>
        <button className="topbar-btn" onClick={() => setVp({ zoom: 1, panX: 0, panY: 0 })} title="Reset zoom">🔍 {Math.round(zoom * 100)}%</button>
        <button className="topbar-btn" onClick={clearFloor} title="Clear all elements on this floor">🗑 Clear</button>
        <button className="topbar-btn" onClick={handleAutoDetect} disabled={detecting}
          style={{ borderColor: '#50E8A0', color: '#50E8A0', opacity: detecting ? 0.5 : 1 }}
          title="Scan blueprint & auto-detect walls/doors/hatches">
          {detecting ? '⏳ Scanne...' : '🤖 Auto-Detect'}
        </button>
        <button className="topbar-btn" onClick={handleExport} style={{ borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}>📋 Export Code</button>
        <button className="topbar-btn" onClick={handleConnectFile}
          style={{ borderColor: fileHandle ? '#50E8A0' : '#888', color: fileHandle ? '#50E8A0' : '#aaa' }}
          title={fileHandle ? 'Connected — click to reconnect' : 'Select walls.js once — auto-save after that'}>
          {fileHandle ? '🟢 Auto-Save aktiv' : '🔗 walls.js verbinden'}
        </button>
      </div>

      {/* Left Panel */}
      <aside style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
        <div>
          <div className="sidebar-section-title">Element Type</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {WALL_TYPES.map(t => (
              <button key={t.id} onClick={() => setActiveType(t.id)}
                style={{ background: activeType === t.id ? t.color + '22' : 'var(--bg-panel)', border: `1.5px solid ${activeType === t.id ? t.color : 'var(--border-subtle)'}`, borderRadius: 6, padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: t.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: activeType === t.id ? t.color : 'var(--text-primary)' }}>{t.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="sidebar-section-title">Placed Elements</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {WALL_TYPES.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: 1, background: t.color }} />
                <span style={{ color: 'var(--text-secondary)' }}>{t.label}:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: t.color }}>{wallCounts[t.id] || 0}</span>
              </div>
            ))}
          </div>
          <button className="topbar-btn save" onClick={handleSaveLocal} style={{ marginTop: 12, width: '100%' }}>
            Save Walls
          </button>
        </div>

        <div>
          <div className="sidebar-section-title">All Elements</div>
          <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {getCurrentWalls().map(w => {
              const t = WALL_TYPES.find(x => x.id === w.type);
              return (
                <div key={w.id} style={{ background: 'var(--bg-panel)', border: `1px solid ${t.color}44`, borderRadius: 4, padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 1, background: t.color, flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{t.label} ({w.x.toFixed(0)},{w.y.toFixed(0)})</span>
                  {(w.type === 'wall' || w.type === 'hatch') && (
                    <button onClick={() => toggleWallOrientation(w.id)} title="Toggle orientation"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 3, padding: '1px 5px', cursor: 'pointer', fontSize: 9, color: 'var(--text-muted)' }}>
                      {w.horizontal ? '↔' : '↕'}
                    </button>
                  )}
                  <button onClick={() => removeWall(w.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: 13, lineHeight: 1 }}>×</button>
                </div>
              );
            })}
            {getCurrentWalls().length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No elements yet. Click on the map!</div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 'auto', padding: 10, background: 'var(--bg-panel)', borderRadius: 6, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.8 }}>
          <b style={{ color: 'var(--text-secondary)' }}>Controls:</b><br/>
          🖱 Left click = place element<br/>
          🖱 Scroll = zoom to cursor<br/>
          🖱 Middle mouse = pan<br/>
          ↕/↔ = toggle orientation<br/>
          × = delete element<br/>
          📋 Export Code = copy to walls.js
        </div>
      </aside>

      {/* Canvas */}
      <div ref={containerRef} style={{ position: 'relative', overflow: 'hidden', background: 'var(--bg-deep)', cursor: 'crosshair' }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseLeave={() => setHoverPos(null)}>

        <div style={{ position: 'absolute', inset: 0, transform: `translate(${panX}px,${panY}px) scale(${zoom})`, transformOrigin: '0 0', width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Aspect-locked inner box — image and SVG share exactly this area */}
          <div ref={innerRef} style={{
            position: 'relative',
            aspectRatio: imgAspect ? String(imgAspect) : '16 / 10',
            width: '100%', height: '100%',
            maxWidth: '100%', maxHeight: '100%',
          }}>
            {mapImage && (
              <img src={mapImage} alt="" draggable={false}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', opacity: 1, pointerEvents: 'none', userSelect: 'none' }}
                onLoad={e => setImgAspect(e.target.naturalWidth / e.target.naturalHeight)}
              />
            )}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
              {getCurrentWalls().map(w => <WallMarker key={w.id} w={w} onRemove={removeWall} onToggle={toggleWallOrientation} />)}
              {/* Suggestions from auto-detector — translucent + clickable to dismiss */}
              {suggestions && [...suggestions.walls, ...suggestions.doors, ...suggestions.hatches].map(s => (
                <SuggestionMarker key={s.id} w={s} onReject={rejectSuggestion} />
              ))}
              {hoverPos && !suggestions && <HoverPreview x={hoverPos.x} y={hoverPos.y} type={activeType} />}
            </svg>
          </div>
        </div>

        {hoverPos && !suggestions && (
          <div style={{ position: 'absolute', bottom: 12, right: 12, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', pointerEvents: 'none' }}>
            x:{hoverPos.x.toFixed(1)}% y:{hoverPos.y.toFixed(1)}%
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 12, left: 12, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', pointerEvents: 'none' }}>
          Scroll=Zoom · Middle Mouse=Pan · {Math.round(zoom * 100)}%
        </div>

        {/* Suggestion review bar */}
        {suggestions && (
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(8,10,14,0.95)', backdropFilter: 'blur(12px)',
            border: '1px solid #50E8A0', borderRadius: 8,
            padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center', zIndex: 30,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#50E8A0' }}>
              🤖 {suggestions.walls.length} Walls · {suggestions.doors.length} Doors · {suggestions.hatches.length} Hatches
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Click individual suggestions to discard them</span>
            <button onClick={() => setSuggestions(null)}
              style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-mid)', color: 'var(--text-secondary)', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
              Discard
            </button>
            <button onClick={acceptSuggestions}
              style={{ background: '#50E8A0', border: 'none', color: '#08110E', padding: '5px 14px', borderRadius: 4, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
              ✓ Apply all
            </button>
          </div>
        )}

        {/* Detector parameters panel — only when not active */}
        {!suggestions && (
          <div style={{
            position: 'absolute', top: 12, right: 12, zIndex: 25,
            background: 'rgba(8,10,14,0.85)', backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-subtle)', borderRadius: 6,
            padding: '8px 10px', fontSize: 10, fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ color: '#50E8A0', fontWeight: 700 }}>Detector</div>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              Min Pixels:
              <input type="range" min="4" max="80" value={detectorOpts.minPixels}
                onChange={e => setDetectorOpts(o => ({ ...o, minPixels: Number(e.target.value) }))}
                style={{ width: 70 }} />
              <span style={{ width: 26, textAlign: 'right' }}>{detectorOpts.minPixels}</span>
            </label>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              Min Fill:
              <input type="range" min="0.1" max="0.5" step="0.02" value={detectorOpts.minFill}
                onChange={e => setDetectorOpts(o => ({ ...o, minFill: Number(e.target.value) }))}
                style={{ width: 70 }} />
              <span style={{ width: 26, textAlign: 'right' }}>{detectorOpts.minFill.toFixed(2)}</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={detectorOpts.doors}
                onChange={e => setDetectorOpts(o => ({ ...o, doors: e.target.checked }))} />
              <span>Detect doors (experimental)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={detectorOpts.hatches}
                onChange={e => setDetectorOpts(o => ({ ...o, hatches: e.target.checked }))} />
              <span>Detect hatches (experimental)</span>
            </label>
          </div>
        )}
      </div>

      {/* Export modal */}
      {showExport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowExport(false)}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-accent)', borderRadius: 12, padding: 24, width: 700, maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 12 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--accent-gold)' }}>📋 Export Wall Data</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              Copy this code and save it as <code style={{ background: 'var(--bg-surface)', padding: '2px 6px', borderRadius: 3 }}>src/data/walls.js</code> — walls will then load automatically in the editor.
            </p>
            <textarea readOnly value={exportText}
              style={{ flex: 1, minHeight: 300, background: 'var(--bg-deep)', border: '1px solid var(--border-subtle)', color: '#50E8A0', fontFamily: 'monospace', fontSize: 12, padding: 12, borderRadius: 6, resize: 'vertical' }}
              onClick={e => e.target.select()}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="topbar-btn save" onClick={handleCopy}>
                {copyFeedback ? '✓ Copied!' : '📋 Copy to Clipboard'}
              </button>
              <button className="topbar-btn" onClick={() => setShowExport(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}

function WallMarker({ w, onRemove, onToggle }) {
  const t = WALL_TYPES.find(x => x.id === w.type);
  if (!t) return null;

  if (w.type === 'wall') {
    const width = w.horizontal ? 4.5 : 1.2, height = w.horizontal ? 1.2 : 4.5;
    return (
      <g onClick={e => { e.stopPropagation(); onRemove(w.id); }} style={{ cursor: 'pointer' }} onDoubleClick={e => { e.stopPropagation(); onToggle(w.id); }}>
        <defs>
          <pattern id={`wp-${w.id}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="5" height="5" fill={t.color} />
            <rect width="2.5" height="5" fill="rgba(0,0,0,0.5)" />
          </pattern>
        </defs>
        <rect x={`${w.x - width/2}%`} y={`${w.y - height/2}%`} width={`${width}%`} height={`${height}%`} fill={`url(#wp-${w.id})`} stroke={t.color} strokeWidth="1.5" rx="1" />
        <text x={`${w.x}%`} y={`${w.y + 0.4}%`} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="white" fontWeight="bold" fontFamily="monospace" style={{ pointerEvents: 'none' }}>W</text>
      </g>
    );
  }

  if (w.type === 'hatch') {
    const size = 3.5;
    return (
      <g onClick={e => { e.stopPropagation(); onRemove(w.id); }} style={{ cursor: 'pointer' }}>
        <defs>
          <pattern id={`hp-${w.id}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="5" height="5" fill={t.color} />
            <rect width="2.5" height="5" fill="rgba(0,0,0,0.5)" />
          </pattern>
        </defs>
        <rect x={`${w.x - size/2}%`} y={`${w.y - size/2}%`} width={`${size}%`} height={`${size}%`} fill={`url(#hp-${w.id})`} stroke={t.color} strokeWidth="1.5" />
        <text x={`${w.x}%`} y={`${w.y + 0.3}%`} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="white" fontWeight="bold" fontFamily="monospace" style={{ pointerEvents: 'none' }}>H</text>
      </g>
    );
  }

  if (w.type === 'door') {
    return (
      <g onClick={e => { e.stopPropagation(); onRemove(w.id); }} style={{ cursor: 'pointer' }}>
        <rect x={`${w.x - 1.5}%`} y={`${w.y - 2.5}%`} width="3%" height="5%" fill={t.color + '33'} stroke={t.color} strokeWidth="1.5" rx="1" />
        <text x={`${w.x}%`} y={`${w.y + 0.3}%`} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill={t.color} fontWeight="bold" fontFamily="monospace" style={{ pointerEvents: 'none' }}>D</text>
      </g>
    );
  }

  if (w.type === 'window') {
    return (
      <g onClick={e => { e.stopPropagation(); onRemove(w.id); }} style={{ cursor: 'pointer' }}>
        <rect x={`${w.x - 2}%`} y={`${w.y - 1}%`} width="4%" height="2%" fill={t.color + '33'} stroke={t.color} strokeWidth="1.5" rx="1" />
        <line x1={`${w.x}%`} y1={`${w.y - 1}%`} x2={`${w.x}%`} y2={`${w.y + 1}%`} stroke={t.color} strokeWidth="1" />
        <text x={`${w.x + 2.5}%`} y={`${w.y + 0.3}%`} dominantBaseline="middle" fontSize="8" fill={t.color} fontWeight="bold" fontFamily="monospace" style={{ pointerEvents: 'none' }}>W</text>
      </g>
    );
  }

  if (w.type === 'softwall') {
    const width = w.horizontal ? 4 : 1, height = w.horizontal ? 1 : 4;
    return (
      <g onClick={e => { e.stopPropagation(); onRemove(w.id); }} style={{ cursor: 'pointer' }}>
        <rect x={`${w.x - width/2}%`} y={`${w.y - height/2}%`} width={`${width}%`} height={`${height}%`} fill={t.color + '44'} stroke={t.color} strokeWidth="1" strokeDasharray="3 2" rx="1" />
        <text x={`${w.x}%`} y={`${w.y + 0.3}%`} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill={t.color} fontWeight="bold" fontFamily="monospace" style={{ pointerEvents: 'none' }}>S</text>
      </g>
    );
  }

  return null;
}

function HoverPreview({ x, y, type }) {
  const t = WALL_TYPES.find(w => w.id === type);
  if (!t) return null;
  return (
    <circle cx={`${x}%`} cy={`${y}%`} r="1.5%" fill={t.color + '44'} stroke={t.color} strokeWidth="1" strokeDasharray="3 2" style={{ pointerEvents: 'none' }} />
  );
}

// Translucent preview of an auto-detected element. Click = remove from list.
// When the detector provides tight dimensions (w, h in %) we use those; the
// fixed-size fallbacks below only apply for legacy markers without dims.
function SuggestionMarker({ w, onReject }) {
  const t = WALL_TYPES.find(x => x.id === w.type);
  if (!t) return null;
  const handle = (e) => { e.stopPropagation(); onReject(w.id); };

  // Prefer detector-supplied dimensions
  let ww, wh;
  if (w.w != null && w.h != null) {
    ww = w.w; wh = w.h;
  } else if (w.type === 'wall') {
    ww = w.horizontal ? 4.5 : 1.2;
    wh = w.horizontal ? 1.2 : 4.5;
  } else if (w.type === 'door') {
    ww = 1.4; wh = 1.4;
  } else {
    ww = 3.5; wh = 3.5;
  }

  // Draw EXACTLY at detected dimensions — no padding, no border (border was
  // making markers visually larger than the underlying yellow wall).
  const px = w.x - ww / 2;
  const py = w.y - wh / 2;
  return (
    <g onClick={handle} style={{ cursor: 'pointer', opacity: 0.85 }}>
      <rect x={`${px}%`} y={`${py}%`} width={`${ww}%`} height={`${wh}%`}
        fill={t.color + '88'} stroke="none" />
    </g>
  );
}
