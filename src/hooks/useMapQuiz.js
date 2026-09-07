import { useEffect, useRef, useState } from 'react';
import { createElementId } from '../utils/elementId';
import { rankQuizRuns, readQuizRuns, roomChoices, saveQuizRun, shuffleRooms } from '../utils/mapQuiz';

const readyRun = kind => ({
  kind, phase: 'ready', order: [], index: 0, correct: 0, mistakes: 0,
  selected: '', feedback: null, choices: [], startedAt: 0, result: null,
});

export function useMapQuiz(rooms, context, enabled) {
  const [run, setRun] = useState(() => readyRun('time-trial'));
  const activeRef = useRef(run);
  const [records, setRecords] = useState([]);
  const [storageError, setStorageError] = useState('');
  const update = next => { activeRef.current = next; setRun(next); };

  useEffect(() => {
    const next = readyRun(activeRef.current.kind);
    activeRef.current = next;
    setRun(next);
    try {
      setRecords(readQuizRuns());
      setStorageError('');
    } catch {
      setRecords([]);
      setStorageError('Could not load your local leaderboard. Existing stored data has not been changed.');
    }
  }, [context, enabled]);

  const changeKind = kind => update(readyRun(kind));
  const start = () => {
    if (!enabled || !rooms.length) return;
    const order = shuffleRooms(rooms);
    update({ ...readyRun(activeRef.current.kind), context, phase: 'running', order,
      startedAt: performance.now(), choices: roomChoices(rooms, order[0]) });
  };
  const storeResult = result => {
    try {
      setRecords(saveQuizRun(result));
      setStorageError('');
      update({ ...activeRef.current, saved: true });
    } catch {
      setStorageError('Your time could not be saved on this device. Keep this result open and retry.');
      update({ ...activeRef.current, saved: false });
    }
  };
  const finish = next => {
    const result = {
      id: createElementId(), context: next.context, roomCount: next.order.length,
      durationMs: Math.max(1, Math.round(performance.now() - next.startedAt)),
      mistakes: next.mistakes, finishedAt: new Date().toISOString(),
    };
    update({ ...next, phase: 'finished', result, selected: '' });
    if (next.kind === 'time-trial') storeResult(result);
  };
  const selectAnswer = name => {
    const current = activeRef.current;
    if (current.phase === 'running' && current.kind === 'time-trial') {
      update({ ...current, selected: name, feedback: null });
    }
  };
  const submit = (name, targetId) => {
    const current = activeRef.current;
    const target = current.order[current.index];
    if (!enabled || current.context !== context || current.phase !== 'running'
      || !target || target.id !== targetId || !name.trim()) return;
    if (current.kind !== 'typing' && !current.order.some(room => room.name === name)) return;
    const correct = name.trim().toLowerCase() === target.name.toLowerCase();
    const next = { ...current, correct: current.correct + (correct ? 1 : 0),
      mistakes: current.mistakes + (correct ? 0 : 1), selected: '', picked: name,
      feedback: { correct, text: correct ? 'Correct' : current.kind === 'time-trial'
        ? 'Not this room. Try again; the clock keeps running.' : `Answer: ${target.name}` } };
    if (current.kind !== 'time-trial') {
      update({ ...next, phase: 'review' });
    } else if (!correct) {
      update(next);
    } else if (current.index + 1 === current.order.length) {
      finish({ ...next, index: current.index + 1 });
    } else {
      update({ ...next, index: current.index + 1 });
    }
  };
  const nextQuestion = () => {
    const current = activeRef.current;
    if (current.phase !== 'review') return;
    const index = current.index + 1;
    if (index === current.order.length) finish({ ...current, index });
    else update({ ...current, index, phase: 'running', feedback: null,
      choices: roomChoices(rooms, current.order[index]) });
  };

  const target = enabled && (run.phase === 'running' || run.phase === 'review') ? run.order[run.index] : null;
  const remainingNames = [...new Set(run.order.slice(run.index).map(room => room.name))].sort((a, b) => a.localeCompare(b));
  return {
    ...run, target, remainingNames, storageError,
    leaderboard: rankQuizRuns(records, context, rooms.length),
    start, changeKind, selectAnswer, submit, nextQuestion,
    retrySave: () => { if (run.result && run.kind === 'time-trial' && !run.saved) storeResult(run.result); },
    completed: run.phase === 'review' ? run.index + 1 : run.index,
    total: rooms.length,
  };
}
