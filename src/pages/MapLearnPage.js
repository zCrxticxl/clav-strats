import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ALL_MAPS } from '../data/maps';
import { MAP_ROOM_CALLOUTS } from '../data/mapRoomCallouts';

const CURRENT_MAP_IDS = {
  700: 'bank', 100: 'border', 300: 'chalet', 200: 'clubhouse',
  500: 'consulate', 1900: 'fortress', 1000: 'kafe', 1700: 'nighthaven',
};

function makeQuestion(rooms) {
  if (!rooms.length) return { answer: null };
  return { answer: rooms[Math.floor(Math.random() * rooms.length)] };
}

export default function MapLearnPage() {
  const maps = useMemo(() => Object.values(MAP_ROOM_CALLOUTS).filter(item => CURRENT_MAP_IDS[item.mapId] && ALL_MAPS.some(map => map.id === CURRENT_MAP_IDS[item.mapId])), []);
  const [mapId, setMapId] = useState(String(maps[0]?.mapId || ''));
  const map = maps.find(item => String(item.mapId) === mapId) || maps[0];
  const currentMapId = CURRENT_MAP_IDS[map?.mapId];
  const currentMap = ALL_MAPS.find(item => item.id === currentMapId);
  const floors = Object.keys(map?.floors || {}).filter(value => currentMap?.floors[Number(value)]).sort((a, b) => Number(a) - Number(b));
  const [floor, setFloor] = useState(floors[0] || '0');
  const roomData = map?.floors?.[floor] || null;
  const rooms = roomData?.rooms || [];
  const [mode, setMode] = useState('explore');
  const [question, setQuestion] = useState(() => makeQuestion(rooms));
  const [selected, setSelected] = useState(null);
  const [quizInput, setQuizInput] = useState('');
  const [quizResult, setQuizResult] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const quizTimerRef = useRef(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showBoundaries, setShowBoundaries] = useState(true);

  useEffect(() => {
    setFloor(Object.keys(map?.floors || {}).sort((a, b) => Number(a) - Number(b))[0] || '0');
  }, [map]);
  useEffect(() => {
    if (quizTimerRef.current) { clearTimeout(quizTimerRef.current); quizTimerRef.current = null; }
    setQuestion(makeQuestion(rooms));
    setSelected(null);
    setQuizInput('');
    setQuizResult(null);
  }, [floor, mapId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (quizTimerRef.current) clearTimeout(quizTimerRef.current); }, []);

  const changeMap = next => { setMapId(next); setMode('explore'); };
  const changeFloor = next => setFloor(next);
  const answer = () => {
    const entered = quizInput.trim();
    if (!entered || !question.answer) return;
    const correct = entered.toLowerCase() === question.answer.name.toLowerCase();
    setQuizResult(correct ? 'Correct' : `Answer: ${question.answer.name}`);
    setScore(current => ({ correct: current.correct + (correct ? 1 : 0), total: current.total + 1 }));
    if (quizTimerRef.current) clearTimeout(quizTimerRef.current);
    quizTimerRef.current = setTimeout(() => { quizTimerRef.current = null; setQuizInput(''); setQuizResult(null); setQuestion(makeQuestion(rooms)); }, 900);
  };

  return <div className="map-learn-page">
    <div className="map-learn-header">
      <div><div className="map-learn-kicker">MAP KNOWLEDGE</div><h1>Map Learn</h1><p>Room boundaries and callouts on the local Clav blueprints.</p></div>
    </div>
    <div className="map-learn-controls">
      <select value={mapId} onChange={event => changeMap(event.target.value)}>{maps.map(item => <option key={item.mapId} value={item.mapId}>{item.name}</option>)}</select>
      <div className="map-learn-mode"><button className={mode === 'explore' ? 'active' : ''} onClick={() => setMode('explore')}>Explore</button><button className={mode === 'quiz' ? 'active' : ''} onClick={() => { setMode('quiz'); setQuestion(makeQuestion(rooms)); setQuizResult(null); }}>Quiz</button></div>
      <div className="map-learn-mode"><button className={showLabels ? 'active' : ''} onClick={() => setShowLabels(value => !value)}>Labels</button><button className={showBoundaries ? 'active' : ''} onClick={() => setShowBoundaries(value => !value)}>Boundaries</button></div>
      <span className="map-learn-score">{mode === 'quiz' ? `${score.correct}/${score.total}` : `${rooms.length} rooms`}</span>
    </div>
    <div className="map-learn-body">
      <div className="map-learn-map">
        <div className="map-learn-floor-tabs">{floors.map(item => <button key={item} className={floor === item ? 'active' : ''} onClick={() => changeFloor(item)}>{currentMap?.floors[Number(item)] || `Floor ${Number(item) + 1}`}</button>)}</div>
        {currentMap ? <div className="map-learn-canvas">
          <img src={`/blueprints/map-learn-${map.mapId}-${floor}.png`} alt={`${currentMap?.name} ${currentMap?.floors[Number(floor)]} blueprint`} />
          <svg className="map-learn-room-overlay" viewBox="0 0 4000 3000" preserveAspectRatio="xMidYMid meet" aria-label="Room boundaries">
             {rooms.map(room => {
              const target = mode === 'quiz' && question.answer?.id === room.id;
              return <g key={room.id} className={`${target ? 'quiz-target' : ''} ${mode === 'quiz' && !target ? 'quiz-hidden' : ''}`}>
                <path d={room.path} className={`map-learn-room-boundary ${showBoundaries || target ? '' : 'hidden'}`} onClick={() => setSelected(room.name)} />
                <text x={room.centerX} y={room.centerY} className={`map-learn-room-label ${showLabels || target ? '' : 'hidden'}`}>{target ? '?' : room.name}</text>
              </g>;
             })}
           </svg>
        </div> : <div className="canvas-placeholder">No current blueprint available</div>}
        <div className="map-learn-attribution">Local Clav blueprint with current room boundaries. No external service is required at runtime.</div>
      </div>
      <aside className="map-learn-side">
        {mode === 'explore' ? <>
          <h2>Room callouts</h2><p>Click a boundary or label to study the room name.</p>
          <div className="map-learn-callouts">{rooms.map(room => <button key={room.id} className={selected === room.name ? 'selected' : ''} onClick={() => setSelected(room.name)}>{room.name}</button>)}</div>
          {selected && <div className="map-learn-selected">Study label<strong>{selected}</strong><small>Use this exact room name for team communication.</small></div>}
        </> : <>
          <h2>Name the room</h2><p>Find the highlighted boundary and type the room callout yourself.</p><div className="map-learn-prompt">?</div>
          <div className="map-learn-answer"><input value={quizInput} onChange={event => setQuizInput(event.target.value)} onKeyDown={event => event.key === 'Enter' && answer()} placeholder="Room name..." /><button onClick={answer}>Check</button></div>
          {quizResult && <div className={`map-learn-result ${quizResult === 'Correct' ? 'correct' : 'wrong'}`}>{quizResult}</div>}
        </>}
      </aside>
    </div>
  </div>;
}
