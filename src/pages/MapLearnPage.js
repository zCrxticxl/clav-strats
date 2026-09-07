import React, { useEffect, useMemo, useState } from 'react';
import { ALL_MAPS } from '../data/maps';
import { MAP_ROOM_CALLOUTS } from '../data/mapRoomCallouts';
import { useMapQuiz } from '../hooks/useMapQuiz';
import MapQuizPanel, { QUIZ_DRAG_TYPE } from '../components/MapQuizPanel';

const CURRENT_MAP_IDS = {
  700: 'bank', 100: 'border', 300: 'chalet', 200: 'clubhouse',
  500: 'consulate', 1900: 'fortress', 1000: 'kafe', 1700: 'nighthaven',
};
const STORAGE_KEY = 'clav-map-learn-v1';

function loadPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const names = saved?.names;
    return {
      names: names && typeof names === 'object' && !Array.isArray(names)
        ? Object.fromEntries(Object.entries(names).filter(([key, name]) => key.split(':').length === 3 && typeof name === 'string' && name.trim() && name.length <= 40)) : {},
      size: Number.isFinite(saved?.size) && saved.size >= 100 && saved.size <= 300 ? saved.size : 100,
    };
  } catch {
    return { names: {}, size: 100 };
  }
}

export default function MapLearnPage() {
  const maps = useMemo(() => Object.values(MAP_ROOM_CALLOUTS).filter(item => CURRENT_MAP_IDS[item.mapId] && ALL_MAPS.some(map => map.id === CURRENT_MAP_IDS[item.mapId])), []);
  const [mapId, setMapId] = useState(String(maps[0]?.mapId || ''));
  const map = maps.find(item => String(item.mapId) === mapId) || maps[0];
  const currentMap = ALL_MAPS.find(item => item.id === CURRENT_MAP_IDS[map?.mapId]);
  const floors = Object.keys(map?.floors || {}).filter(value => currentMap?.floors[Number(value)]).sort((a, b) => Number(a) - Number(b));
  const [floor, setFloor] = useState(floors[0] || '0');
  const rooms = map?.floors?.[floor]?.rooms || [];
  const [mode, setMode] = useState('explore');
  const quiz = useMapQuiz(rooms, `${mapId}:${floor}`, mode === 'quiz');
  const [selectedId, setSelectedId] = useState(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [showCustom, setShowCustom] = useState(true);
  const [preferences, setPreferences] = useState(loadPreferences);
  const [customName, setCustomName] = useState('');
  const [storageError, setStorageError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const selected = rooms.find(room => room.id === selectedId);
  const selectedKey = `${mapId}:${floor}:${selectedId}`;
  const scale = preferences.size / 100;

  useEffect(() => {
    setFloor(Object.keys(map?.floors || {}).sort((a, b) => Number(a) - Number(b))[0] || '0');
  }, [map]);
  useEffect(() => {
    setSelectedId(null);
    setCustomName('');
    setSaveMessage('');
  }, [floor, mapId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectRoom = room => {
    if (mode !== 'explore') return;
    setSelectedId(room.id);
    setCustomName(preferences.names[`${mapId}:${floor}:${room.id}`] || '');
    setSaveMessage('');
  };
  const persist = next => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setPreferences(next);
      setStorageError('');
      return true;
    } catch {
      setStorageError('Could not save on this device. Your changes have not been saved.');
      setSaveMessage('');
      return false;
    }
  };
  const saveCustomName = event => {
    event.preventDefault();
    if (!selected || !customName.trim()) return;
    if (persist({ ...preferences, names: { ...preferences.names, [selectedKey]: customName.trim() } })) {
      setCustomName(customName.trim());
      setShowCustom(true);
      setSaveMessage('Saved on this device.');
    }
  };
  const removeCustomName = () => {
    const names = { ...preferences.names };
    delete names[selectedKey];
    if (persist({ ...preferences, names })) {
      setCustomName('');
      setSaveMessage('Custom name removed.');
    }
  };
  return <div className="map-learn-page">
    <div className="map-learn-header">
      <div><div className="map-learn-kicker">MAP KNOWLEDGE</div><h1>Map Learn</h1><p>Room boundaries and callouts on the local Clav blueprints.</p></div>
    </div>
    <div className="map-learn-controls">
      <select aria-label="Map" value={mapId} onChange={event => { setMapId(event.target.value); setMode('explore'); }}>{maps.map(item => <option key={item.mapId} value={item.mapId}>{item.name}</option>)}</select>
      <div className="map-learn-mode"><button aria-pressed={mode === 'explore'} className={mode === 'explore' ? 'active' : ''} onClick={() => setMode('explore')}>Explore</button><button aria-pressed={mode === 'quiz'} className={mode === 'quiz' ? 'active' : ''} onClick={() => setMode('quiz')}>Quiz</button></div>
      <div className="map-learn-mode" role="group" aria-label="Callout layers">
        <button aria-pressed={showLabels} className={showLabels ? 'active' : ''} onClick={() => setShowLabels(value => !value)}>Default</button>
        <button aria-pressed={showCustom} disabled={mode === 'quiz'} className={`map-learn-custom-toggle ${showCustom ? 'active' : ''}`} onClick={() => setShowCustom(value => !value)}>Custom</button>
        <button aria-pressed={showBoundaries} className={showBoundaries ? 'active' : ''} onClick={() => setShowBoundaries(value => !value)}>Boundaries</button>
      </div>
      <div className="map-learn-size-control">
        <label htmlFor="callout-size">Callout size</label>
        <input id="callout-size" type="range" min="100" max="300" step="5" value={preferences.size} aria-valuetext={`${preferences.size}%`} style={{ '--range-progress': `${(preferences.size - 100) / 2}%` }} onChange={event => persist({ ...preferences, size: Number(event.target.value) })} />
        <output htmlFor="callout-size">{preferences.size}%</output>
      </div>
      <span className="map-learn-score">{mode === 'quiz' ? `${quiz.completed}/${quiz.total} rooms` : `${rooms.length} rooms`}</span>
    </div>
    {storageError && <p className="map-learn-storage-error" role="alert">{storageError}</p>}
    <div className="map-learn-body">
      <div className="map-learn-map">
        <div className="map-learn-floor-tabs">{floors.map(item => <button key={item} className={floor === item ? 'active' : ''} onClick={() => setFloor(item)}>{currentMap?.floors[Number(item)] || `Floor ${Number(item) + 1}`}</button>)}</div>
        {currentMap ? <div className="map-learn-canvas">
          <img src={`/blueprints/map-learn-${map.mapId}-${floor}.png`} alt={`${currentMap.name} ${currentMap.floors[Number(floor)]} blueprint`} />
          <svg className="map-learn-room-overlay" viewBox="0 0 4000 3000" preserveAspectRatio="xMidYMid meet" aria-label="Room boundaries">
            {rooms.map(room => {
              const target = mode === 'quiz' && quiz.target?.id === room.id;
              if (mode === 'quiz' && !target) return null;
              const assignable = target && quiz.kind === 'time-trial' && quiz.phase === 'running';
              const personalName = preferences.names[`${mapId}:${floor}:${room.id}`];
              const customVisible = mode === 'explore' && showCustom && personalName;
              return <g key={room.id} data-room-id={room.id} className={target ? 'quiz-target' : ''}
                role={assignable ? 'button' : undefined} tabIndex={assignable ? 0 : undefined} aria-label={assignable ? 'Assign selected name to highlighted room' : undefined}
                onClick={assignable ? () => quiz.submit(quiz.selected, room.id) : undefined}
                onKeyDown={assignable ? event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); quiz.submit(quiz.selected, room.id); } } : undefined}
                onDragOver={assignable ? event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; } : undefined}
                onDrop={assignable ? event => { event.preventDefault(); quiz.submit(event.dataTransfer.getData(QUIZ_DRAG_TYPE) || event.dataTransfer.getData('text/plain'), room.id); } : undefined}>
                <path d={room.path} className={`map-learn-room-boundary ${showBoundaries || target ? '' : 'hidden'}`} onClick={() => selectRoom(room)} />
                <text x={room.centerX} y={room.centerY} className={`map-learn-room-label ${showLabels || target ? '' : 'hidden'}`} style={{ fontSize: `${(target ? 52 : 28) * scale}px` }} onClick={() => selectRoom(room)}>{target ? '?' : room.name}</text>
                {customVisible && <text x={room.centerX} y={room.centerY + (showLabels ? 40 * scale : 0)} className="map-learn-room-label map-learn-custom-label" style={{ fontSize: `${28 * scale}px` }} onClick={() => selectRoom(room)}>{personalName}</text>}
              </g>;
            })}
          </svg>
        </div> : <div className="canvas-placeholder">No current blueprint available</div>}
        <div className="map-learn-attribution">Local Clav blueprint with current room boundaries. No external service is required at runtime.</div>
      </div>
      <aside className="map-learn-side">
        {mode === 'explore' ? <>
          <h2>Room callouts</h2><p>Select a room to add your own name as a separate layer.</p>
          {selected ? <form className="map-learn-custom-form" onSubmit={saveCustomName}>
            <span className="map-learn-official-label">DEFAULT NAME</span><strong>{selected.name}</strong>
            <label htmlFor="custom-room-name">Your callout</label>
            <input id="custom-room-name" value={customName} onChange={event => { setCustomName(event.target.value); setSaveMessage(''); }} placeholder="e.g. Team meeting point" maxLength="40" autoComplete="off" />
            <div className="map-learn-custom-actions"><button type="submit" disabled={!customName.trim()}>Save name</button><button type="button" disabled={!preferences.names[selectedKey]} onClick={removeCustomName}>Remove</button></div>
            <small>Only on this device. Default names stay unchanged.</small>
            <span className="map-learn-save-status" role="status">{saveMessage}</span>
          </form> : <div className="map-learn-custom-hint">Your names, your layer.<br />Click a room on the map or below to get started.</div>}
          <div className="map-learn-callouts">{rooms.map(room => <button key={room.id} aria-pressed={selectedId === room.id} className={selectedId === room.id ? 'selected' : ''} onClick={() => selectRoom(room)}>{room.name}{preferences.names[`${mapId}:${floor}:${room.id}`] && <span className="map-learn-personal-name">{preferences.names[`${mapId}:${floor}:${room.id}`]}</span>}</button>)}</div>
        </> : <MapQuizPanel quiz={quiz} scope={`${currentMap?.name || 'Map'} / ${currentMap?.floors[Number(floor)] || 'Floor'}`} />}
      </aside>
    </div>
  </div>;
}
