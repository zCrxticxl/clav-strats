import React from 'react';

export function CanvasActions({
  selectedCount, canDetectWalls, detectingWalls, showGrid, zoom, exporting,
  onDeleteSelection, onDetectWalls, onToggleGrid, onResetView, onClear,
  onExport, onOpenLineup,
}) {
  return (
    <>
      {selectedCount > 0 && <button className="topbar-btn" onClick={onDeleteSelection}>🗑 {selectedCount} delete</button>}
      <button className="topbar-btn" onClick={onDetectWalls} disabled={!canDetectWalls || detectingWalls}
        title="Re-detect walls/doors/hatches from blueprint"
        style={{ borderColor:'#50E8A0', color:'#50E8A0', opacity:(!canDetectWalls || detectingWalls) ? 0.4 : 1 }}>
        {detectingWalls ? '⏳' : '🤖'} Re-Detect
      </button>
      <button className={`topbar-btn ${showGrid ? 'save' : ''}`} onClick={onToggleGrid} title="Toggle grid">⊞ Grid</button>
      <button className="topbar-btn" onClick={onResetView} title="Reset zoom">🔍 {Math.round(zoom * 100)}%</button>
      <button className="topbar-btn" onClick={onClear}>Clear</button>
      <button className="topbar-btn" disabled={exporting} onClick={onExport}
        style={{ opacity:exporting ? 0.5 : 1, borderColor:'rgba(232,184,75,0.4)', color:'var(--accent-gold)' }}>
        {exporting ? '⏳' : '📷'} PNG
      </button>
      <button className="topbar-btn" onClick={onOpenLineup} title="Load a saved lineup">📋 Lineup</button>
    </>
  );
}
