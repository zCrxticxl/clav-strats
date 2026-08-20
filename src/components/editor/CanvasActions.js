import React from 'react';

export function CanvasActions({
  selectedCount, canDetectWalls, detectingWalls, showGrid, zoom, exporting,
  onDeleteSelection, onDetectWalls, onToggleGrid, onResetView, onClear,
  onExport, onOpenLineup, exportReady, onOpenExportFolder, timelineOpen, onToggleTimeline, tasksOpen, onToggleTasks, calloutsOpen, onToggleCallouts,
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
      {exportReady && <button className="topbar-btn" onClick={onOpenExportFolder} title="Open the folder containing exported PNGs">📁 Show folder</button>}
      <button className="topbar-btn" onClick={onOpenLineup} title="Load a saved lineup">📋 Lineup</button>
      <button className={`topbar-btn ${timelineOpen ? 'save' : ''}`} onClick={onToggleTimeline} title="Plan coordinated movement over time">⏱ Timeline</button>
      <button className={`topbar-btn ${tasksOpen ? 'save' : ''}`} onClick={onToggleTasks} title="Assign strategy tasks">✓ Tasks</button>
      <button className={`topbar-btn ${calloutsOpen ? 'save' : ''}`} onClick={onToggleCallouts} title="Place standard or custom map callouts">⌖ Callouts</button>
    </>
  );
}
