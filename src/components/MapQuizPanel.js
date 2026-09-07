import React, { useEffect, useState } from 'react';
import { formatQuizTime } from '../utils/mapQuiz';
import './MapQuizPanel.css';

export const QUIZ_DRAG_TYPE = 'application/x-clav-room-name';

function QuizClock({ startedAt, result, running }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) { setElapsed(0); return undefined; }
    const tick = () => setElapsed(Math.max(0, performance.now() - startedAt));
    tick();
    const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, [startedAt, running]);
  return <span className="map-quiz-clock" aria-label="Elapsed time">{formatQuizTime(result?.durationMs || elapsed)}</span>;
}

function Leaderboard({ quiz, scope }) {
  return <section className="map-quiz-leaderboard" aria-label="Personal leaderboard">
    <div className="map-quiz-section-heading"><h3>Personal bests</h3><span>TOP 10</span></div>
    <p>{scope} · {quiz.total} rooms</p>
    {quiz.leaderboard.length ? <div className="map-quiz-table-scroll"><table>
      <caption className="map-quiz-sr-only">Fastest completed runs on {scope}. Ranked by time, then mistakes.</caption>
      <thead><tr><th scope="col">#</th><th scope="col">Time</th><th scope="col">Errors</th><th scope="col">Date</th></tr></thead>
      <tbody>{quiz.leaderboard.map((record, index) => <tr key={record.id} className={quiz.result?.id === record.id ? 'is-latest' : ''}>
        <td>{index + 1}</td><td>{formatQuizTime(record.durationMs)}</td><td>{record.mistakes}</td>
        <td><time dateTime={record.finishedAt} title={new Date(record.finishedAt).toLocaleString()}>{new Date(record.finishedAt).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })}</time></td>
      </tr>)}</tbody>
    </table></div> : <div className="map-quiz-empty">Your first finish sets the time to beat.</div>}
    <small>Saved only on this device. Fastest time wins; mistakes break ties.</small>
  </section>;
}

export default function MapQuizPanel({ quiz, scope }) {
  const [input, setInput] = useState('');
  useEffect(() => setInput(''), [quiz.target?.id, quiz.kind, quiz.phase === 'ready']);
  const timed = quiz.kind === 'time-trial';
  const running = quiz.phase === 'running';
  const reviewing = quiz.phase === 'review';
  const finished = quiz.phase === 'finished';
  const titles = { 'time-trial': 'Beat your best time', 'multiple-choice': 'Pick the room name', typing: 'Name the room' };
  const instructions = {
    'time-trial': 'Match every highlighted room once. Drag a name onto the room, or select a name and click the room. Mistakes cost time, not extra seconds.',
    'multiple-choice': 'Identify the highlighted room from up to six names. One answer per room; review it before moving on.',
    typing: 'Type the official name of the highlighted room. Custom names stay hidden during the quiz.',
  };
  return <div className="map-quiz-panel">
    <div className="map-quiz-modes" role="group" aria-label="Quiz mode">
      {[['time-trial', 'Time Trial'], ['multiple-choice', 'Multiple Choice'], ['typing', 'Type Name']].map(([kind, label]) => <button key={kind} aria-pressed={quiz.kind === kind} onClick={() => quiz.changeKind(kind)}>{label}</button>)}
    </div>
    <h2>{titles[quiz.kind]}</h2>
    <p className="map-quiz-instructions">{instructions[quiz.kind]}</p>
    <div className="map-quiz-metrics">
      {timed ? <QuizClock startedAt={quiz.startedAt} result={quiz.result} running={running} />
        : <strong className="map-quiz-score">{quiz.correct}<span> / {quiz.completed} correct</span></strong>}
      <div className="map-quiz-progress-label"><span>{quiz.completed} / {quiz.total} rooms</span><span>{quiz.mistakes} {quiz.mistakes === 1 ? 'mistake' : 'mistakes'}</span></div>
      <progress max={Math.max(quiz.total, 1)} value={quiz.completed} aria-label="Rooms completed" />
    </div>
    {quiz.phase === 'ready' && <>
      <button className="map-quiz-primary" disabled={!quiz.total} onClick={quiz.start}>{timed ? 'Start run' : 'Start practice'}</button>
      <small className="map-quiz-help">{quiz.total ? `${scope} · Random order, no repeated rooms.` : 'No rooms are available on this floor.'}</small>
    </>}
    {(running || reviewing) && <>
      <div className="map-quiz-section-heading"><h3>Room {quiz.index + 1} of {quiz.total}</h3><button className="map-quiz-text-button" onClick={() => quiz.changeKind(quiz.kind)}>End {timed ? 'run' : 'practice'}</button></div>
      {timed ? <>
        <div className="map-quiz-selected" role="status">{quiz.selected ? <><strong>{quiz.selected}</strong><span>Click the highlighted room to assign.</span></> : 'Select a name below or drag it onto the highlighted room.'}</div>
        <div className="map-quiz-name-list" aria-label="Remaining room names">
          {quiz.remainingNames.map(name => <button key={name} draggable aria-pressed={quiz.selected === name} onClick={() => quiz.selectAnswer(name)} onDragStart={event => {
            event.dataTransfer.setData(QUIZ_DRAG_TYPE, name);
            event.dataTransfer.setData('text/plain', name);
            event.dataTransfer.effectAllowed = 'copy';
          }}>{name}</button>)}
        </div>
        <button className="map-quiz-primary" disabled={!quiz.selected} onClick={() => quiz.submit(quiz.selected, quiz.target.id)}>Check selected name</button>
      </> : quiz.kind === 'multiple-choice' ? <div className="map-quiz-options" aria-label="Answer choices">
        {quiz.choices.map((name, index) => <button key={name} disabled={reviewing} className={reviewing ? name === quiz.target.name ? 'is-correct' : name === quiz.picked ? 'is-wrong' : '' : ''} onClick={() => quiz.submit(name, quiz.target.id)}>
          <span className="map-quiz-option-index">{index + 1}</span><span>{name}</span>
          {reviewing && name === quiz.target.name && <small>Correct answer</small>}
        </button>)}
      </div> : <form className="map-learn-answer" onSubmit={event => { event.preventDefault(); quiz.submit(input, quiz.target.id); }}>
        <input aria-label="Room name" value={input} disabled={reviewing} onChange={event => setInput(event.target.value)} placeholder="Room name..." autoComplete="off" />
        <button disabled={reviewing || !input.trim()}>Check</button>
      </form>}
      {quiz.feedback && <div role="status" className={`map-learn-result ${quiz.feedback.correct ? 'correct' : 'wrong'}`}>{quiz.feedback.text}</div>}
      {reviewing && <button className="map-quiz-primary" onClick={quiz.nextQuestion}>{quiz.index + 1 === quiz.total ? 'See results' : 'Next room'}</button>}
    </>}
    {finished && <div className="map-quiz-finish">
      <h3>{timed ? 'All rooms matched!' : 'Practice complete'}</h3>
      <p>{timed ? `${quiz.total} rooms in ${formatQuizTime(quiz.result.durationMs)}.` : `${quiz.correct} of ${quiz.total} correct (${Math.round(quiz.correct / quiz.total * 100)}%).`}</p>
      {timed && quiz.saved && <span className="map-quiz-saved" role="status">{quiz.leaderboard[0]?.id === quiz.result.id ? 'New personal best!' : 'Run complete. Your top 10 times are kept below.'}</span>}
      {timed && !quiz.saved && <button className="map-quiz-text-button" onClick={quiz.retrySave}>Retry saving time</button>}
      <button className="map-quiz-primary" onClick={quiz.start}>{timed ? 'Run again' : 'Practice again'}</button>
    </div>}
    {quiz.storageError && <p className="map-learn-storage-error" role="alert">{quiz.storageError}</p>}
    {timed && <Leaderboard quiz={quiz} scope={scope} />}
    <small className="map-quiz-help">Changing map, floor or mode ends the current session. Only finished time trials enter your leaderboard.</small>
  </div>;
}
