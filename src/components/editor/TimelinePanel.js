import React, { useEffect, useMemo, useState } from 'react';
import { getActivePhase, getPlaybackPositions, normalizeTimeline } from '../../utils/timeline';

const fieldStyle = {
  width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
  color: 'var(--text-primary)', borderRadius: 4, padding: '5px 6px', fontSize: 11,
};

export function TimelinePanel({ timeline, onChange, lineup, playback, playbackMode, onExitPlayback, onExport, onExportGif, pointPick, onRequestPoint, pickedPoint }) {
  const normalized = normalizeTimeline(timeline);
  const [ownerId, setOwnerId] = useState(lineup[0]?.slotId || '');
  const [draft, setDraft] = useState({ startX: 50, startY: 50, endX: 70, endY: 50, startTime: 0, endTime: 8 });
  const [phaseDraft, setPhaseDraft] = useState({ name: 'Setup', startTime: 0, endTime: 5, color: '#E8B84B' });
  const selectedPlayer = lineup.find(player => player.slotId === ownerId) || lineup[0];
  const positions = useMemo(() => getPlaybackPositions(normalized, playback.currentTime, lineup), [normalized, playback.currentTime, lineup]);
  const activePhase = getActivePhase(normalized, playback.currentTime);

  useEffect(() => {
    if (!pickedPoint) return;
    setDraft(current => ({
      ...current,
      ...(pickedPoint.kind === 'start'
        ? { startX: pickedPoint.x, startY: pickedPoint.y }
        : { endX: pickedPoint.x, endY: pickedPoint.y }),
    }));
  }, [pickedPoint]);

  const updateTimeline = next => onChange(normalizeTimeline(next));
  const addMovement = () => {
    if (!selectedPlayer) return;
    const movement = {
      id: `movement-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ownerId: selectedPlayer.slotId,
      start: { x: Number(draft.startX), y: Number(draft.startY) },
      end: { x: Number(draft.endX), y: Number(draft.endY) },
      startTime: Number(draft.startTime),
      endTime: Number(draft.endTime),
    };
    updateTimeline({ ...normalized, duration: Math.max(normalized.duration, movement.endTime), movements: [...normalized.movements, movement] });
  };
  const updateMovement = (id, patch) => updateTimeline({
    ...normalized,
    movements: normalized.movements.map(movement => movement.id === id ? { ...movement, ...patch } : movement),
  });
  const addPhase = () => updateTimeline({
    ...normalized,
    phases: [...normalized.phases, { ...phaseDraft, id: `phase-${Date.now()}` }],
    duration: Math.max(normalized.duration, Number(phaseDraft.endTime) || 1),
  });

  return (
    <section className="timeline-panel" aria-label="Strategy timeline">
      <div className="timeline-panel-heading">
        <div><span className="timeline-kicker">ROUND PLAN</span><h2>Timeline</h2></div>
        <span className="timeline-time">{playback.currentTime.toFixed(1)}s / {normalized.duration.toFixed(1)}s{activePhase ? ` · ${activePhase.name}` : ''}</span>
      </div>
      <div className="timeline-controls">
        <button className="topbar-btn" onClick={playback.isPlaying ? playback.pause : playback.play}>{playback.isPlaying ? 'Pause' : 'Play'}</button>
        <button className="topbar-btn" onClick={playback.restart}>Restart</button>
        {playbackMode && <button className="topbar-btn" onClick={onExitPlayback}>Edit static</button>}
        <input aria-label="Timeline position" type="range" min="0" max={normalized.duration} step="0.1" value={playback.currentTime} onChange={event => playback.scrub(event.target.value)} />
      </div>
      <div className="timeline-ruler"><span>0s</span><span>{(normalized.duration / 2).toFixed(0)}s</span><span>{normalized.duration.toFixed(0)}s</span></div>
      <label className="timeline-duration">Total seconds
        <input type="number" min="1" max="300" step="1" value={normalized.duration} onChange={event => updateTimeline({ ...normalized, duration: Number(event.target.value) })} />
      </label>

      <div className="timeline-phases">
        <div className="timeline-subtitle">Round phases</div>
        <div className="timeline-phase-add">
          <input style={fieldStyle} placeholder="Phase name" value={phaseDraft.name} onChange={event => setPhaseDraft(current => ({ ...current, name: event.target.value }))} />
          <input style={fieldStyle} type="number" min="0" value={phaseDraft.startTime} onChange={event => setPhaseDraft(current => ({ ...current, startTime: event.target.value }))} />
          <input style={fieldStyle} type="number" min="0" value={phaseDraft.endTime} onChange={event => setPhaseDraft(current => ({ ...current, endTime: event.target.value }))} />
          <button className="topbar-btn" onClick={addPhase}>+ Phase</button>
        </div>
        {normalized.phases.map(phase => <div className="timeline-phase-row" key={phase.id}>
          <span style={{ color: phase.color }}>{phase.name}</span>
          <span>{phase.startTime}s → {phase.endTime}s</span>
          <button onClick={() => updateTimeline({ ...normalized, phases: normalized.phases.filter(item => item.id !== phase.id) })}>×</button>
        </div>)}
      </div>

      <div className="timeline-add-card">
        <div className="timeline-subtitle">Add movement</div>
        <select style={fieldStyle} value={ownerId} onChange={event => setOwnerId(event.target.value)}>
          {lineup.map(player => <option key={player.slotId} value={player.slotId}>{player.name} {player.operator ? `· ${player.operator.name}` : ''}</option>)}
        </select>
        <div className="timeline-map-picks">
          <button type="button" className={`topbar-btn ${pointPick === 'start' ? 'save' : ''}`} onClick={() => onRequestPoint(pointPick === 'start' ? null : 'start')}>
            {pointPick === 'start' ? 'Click map: start' : 'Pick start on map'}
          </button>
          <button type="button" className={`topbar-btn ${pointPick === 'end' ? 'save' : ''}`} onClick={() => onRequestPoint(pointPick === 'end' ? null : 'end')}>
            {pointPick === 'end' ? 'Click map: destination' : 'Pick destination'}
          </button>
        </div>
        <div className="timeline-grid-fields">
          {['startX', 'startY', 'endX', 'endY', 'startTime', 'endTime'].map(key => <label key={key}>{key.replace('Time', ' ').replace('X', ' X').replace('Y', ' Y')}
            <input type="number" min="0" max={key.includes('Time') ? 300 : 100} step="0.1" style={fieldStyle} value={draft[key]} onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))} />
          </label>)}
        </div>
        <button className="topbar-btn save" onClick={addMovement}>+ Add movement</button>
      </div>

      <div className="timeline-subtitle">Movements · {normalized.movements.length}</div>
      <div className="timeline-movements">
        {normalized.movements.length === 0 && <div className="timeline-empty">Add a start and destination for each operator.</div>}
        {normalized.movements.map(movement => {
          const player = lineup.find(item => item.slotId === movement.ownerId);
          return <div className="timeline-movement" key={movement.id} style={{ borderColor: `${player?.color || '#8A9BB0'}66` }}>
            <div className="timeline-movement-title" style={{ color: player?.color }}>{player?.name || 'Unknown slot'} <span>{movement.startTime}s → {movement.endTime}s</span></div>
            <div className="timeline-movement-fields">
              <label>Start <input type="number" value={movement.startTime} onChange={event => updateMovement(movement.id, { startTime: Number(event.target.value) })} /></label>
              <label>End <input type="number" value={movement.endTime} onChange={event => updateMovement(movement.id, { endTime: Number(event.target.value) })} /></label>
              <label>From X <input type="number" value={movement.start.x} onChange={event => updateMovement(movement.id, { start: { ...movement.start, x: Number(event.target.value) } })} /></label>
              <label>From Y <input type="number" value={movement.start.y} onChange={event => updateMovement(movement.id, { start: { ...movement.start, y: Number(event.target.value) } })} /></label>
              <label>To X <input type="number" value={movement.end.x} onChange={event => updateMovement(movement.id, { end: { ...movement.end, x: Number(event.target.value) } })} /></label>
              <label>To Y <input type="number" value={movement.end.y} onChange={event => updateMovement(movement.id, { end: { ...movement.end, y: Number(event.target.value) } })} /></label>
            </div>
            <button className="timeline-delete" onClick={() => updateTimeline({ ...normalized, movements: normalized.movements.filter(item => item.id !== movement.id) })}>Delete</button>
          </div>;
        })}
      </div>
      <div className="timeline-preview-note">{positions.length} operator{positions.length === 1 ? '' : 's'} visible at the playhead.</div>
      <div className="timeline-export-actions">
        <button className="topbar-btn" onClick={onExport} disabled={!normalized.movements.length}>Export WebM</button>
        <button className="topbar-btn" onClick={onExportGif} disabled={!normalized.movements.length}>Export GIF</button>
      </div>
    </section>
  );
}
