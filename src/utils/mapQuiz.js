export const QUIZ_RUNS_KEY = 'clav-map-quiz-runs-v1';

export function shuffleRooms(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function roomChoices(rooms, target) {
  if (!target) return [];
  const names = [...new Set(rooms.map(room => room.name))].filter(name => name !== target.name);
  return shuffleRooms([target.name, ...shuffleRooms(names).slice(0, 5)]);
}

export function formatQuizTime(milliseconds) {
  const centiseconds = Math.floor(milliseconds / 10);
  const minutes = Math.floor(centiseconds / 6000);
  const seconds = Math.floor(centiseconds / 100) % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds % 100).padStart(2, '0')}`;
}

export function readQuizRuns() {
  const saved = JSON.parse(localStorage.getItem(QUIZ_RUNS_KEY) || '[]');
  if (!Array.isArray(saved)) throw new Error('Invalid leaderboard');
  return saved.filter(run => run && typeof run.id === 'string' && typeof run.context === 'string'
    && Number.isFinite(run.durationMs) && run.durationMs > 0
    && Number.isInteger(run.mistakes) && run.mistakes >= 0
    && Number.isInteger(run.roomCount) && run.roomCount > 0
    && typeof run.finishedAt === 'string' && Number.isFinite(Date.parse(run.finishedAt)));
}

export function rankQuizRuns(runs, context, roomCount) {
  return runs.filter(run => run.context === context && run.roomCount === roomCount)
    .sort((a, b) => a.durationMs - b.durationMs || a.mistakes - b.mistakes || a.finishedAt.localeCompare(b.finishedAt))
    .slice(0, 10);
}

export function saveQuizRun(run) {
  const previous = readQuizRuns().filter(item => item.id !== run.id);
  const matching = rankQuizRuns([...previous, run], run.context, run.roomCount);
  const records = [...previous.filter(item => item.context !== run.context || item.roomCount !== run.roomCount), ...matching];
  localStorage.setItem(QUIZ_RUNS_KEY, JSON.stringify(records));
  return records;
}
