import { formatQuizTime, QUIZ_RUNS_KEY, rankQuizRuns, readQuizRuns, roomChoices, saveQuizRun, shuffleRooms } from './mapQuiz';

const makeRun = (id, durationMs, context = '100:0', mistakes = 0) => ({
  id, durationMs, context, mistakes, roomCount: 17, finishedAt: '2026-09-07T12:00:00.000Z',
});

afterEach(() => { localStorage.clear(); jest.restoreAllMocks(); });

test('shuffle preserves every room exactly once without mutating input', () => {
  const input = ['a', 'b', 'c', 'd'];
  jest.spyOn(Math, 'random').mockReturnValue(0);
  const shuffled = shuffleRooms(input);
  expect(shuffled).toEqual(['b', 'c', 'd', 'a']);
  expect(input).toEqual(['a', 'b', 'c', 'd']);
});

test('small floors and duplicated room names never create duplicate or fabricated choices', () => {
  const rooms = [{ name: 'Hall' }, { name: 'Stairs' }, { name: 'Hall' }];
  expect(roomChoices(rooms, rooms[0]).sort()).toEqual(['Hall', 'Stairs']);
  expect(roomChoices([], null)).toEqual([]);
});

test('timer formats minutes, seconds and centiseconds without wrapping after one minute', () => {
  expect(formatQuizTime(0)).toBe('00:00.00');
  expect(formatQuizTime(61999)).toBe('01:01.99');
  expect(formatQuizTime(3600000)).toBe('60:00.00');
});

test('leaderboard ranks top ten by duration and then mistakes, preserving other map/floor records', () => {
  const records = Array.from({ length: 12 }, (_, index) => makeRun(String(index), 5000 + index * 1000));
  records.push(makeRun('other', 100, '200:1'));
  localStorage.setItem(QUIZ_RUNS_KEY, JSON.stringify(records));
  const saved = saveQuizRun(makeRun('new', 4000));
  expect(rankQuizRuns(saved, '100:0', 17)).toHaveLength(10);
  expect(rankQuizRuns(saved, '100:0', 17)[0].id).toBe('new');
  expect(rankQuizRuns(saved, '200:1', 17)[0].id).toBe('other');
  expect(rankQuizRuns(saved, '100:0', 18)).toEqual([]);
  expect(rankQuizRuns([makeRun('wrong', 4000, '100:0', 2), makeRun('clean', 4000)], '100:0', 17)[0].id).toBe('clean');
});

test('invalid persisted rows are ignored and duplicate result saves remain idempotent', () => {
  localStorage.setItem(QUIZ_RUNS_KEY, JSON.stringify([null, { durationMs: -1 }, makeRun('a', 1000)]));
  expect(readQuizRuns()).toHaveLength(1);
  saveQuizRun(makeRun('a', 1000));
  expect(readQuizRuns()).toHaveLength(1);
});
