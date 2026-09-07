import React, { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { useMapQuiz } from './useMapQuiz';
import { QUIZ_RUNS_KEY, readQuizRuns } from '../utils/mapQuiz';

const rooms = Array.from({ length: 7 }, (_, index) => ({ id: `room-${index}`, name: `Room ${index}` }));
global.IS_REACT_ACT_ENVIRONMENT = true;

function Harness({ context, enabled, onReady }) {
  const quiz = useMapQuiz(rooms, context, enabled);
  useEffect(() => onReady(quiz), [quiz, onReady]);
  return null;
}

describe('Map quiz sessions', () => {
  let root;
  let container;
  let quiz;
  let now;
  const mount = (context = '100:0', enabled = true) => act(() => root.render(
    <Harness context={context} enabled={enabled} onReady={value => { quiz = value; }} />,
  ));
  const answerTarget = () => act(() => quiz.submit(quiz.target.name, quiz.target.id));
  const complete = () => { while (quiz.phase === 'running') { now += 1000; answerTarget(); } };

  beforeEach(() => {
    localStorage.clear();
    now = 100;
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mount();
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.restoreAllMocks();
    localStorage.clear();
  });

  test('time starts explicitly, visits every room once and stores exact elapsed duration only at finish', () => {
    expect(quiz.phase).toBe('ready');
    expect(quiz.target).toBeNull();
    now = 5000;
    act(() => quiz.start());
    expect(quiz.startedAt).toBe(5000);
    const visited = [];
    while (quiz.phase === 'running') {
      expect(readQuizRuns()).toHaveLength(0);
      visited.push(quiz.target.id);
      now += 1500;
      answerTarget();
    }
    expect(new Set(visited).size).toBe(rooms.length);
    expect(quiz.phase).toBe('finished');
    expect(quiz.completed).toBe(7);
    expect(quiz.result.durationMs).toBe(10500);
    expect(quiz.leaderboard[0]).toMatchObject({ context: '100:0', durationMs: 10500, mistakes: 0, roomCount: 7 });
    expect(readQuizRuns()).toHaveLength(1);
    mount('100:0', false);
    mount();
    expect(quiz.leaderboard[0].durationMs).toBe(10500);
  });

  test('wrong answer counts a mistake, preserves target, and time continues without artificial penalties', () => {
    act(() => quiz.start());
    const targetId = quiz.target.id;
    const wrong = rooms.find(room => room.id !== targetId);
    now += 2500;
    act(() => quiz.submit(wrong.name, targetId));
    expect(quiz.target.id).toBe(targetId);
    expect(quiz.completed).toBe(0);
    expect(quiz.mistakes).toBe(1);
    complete();
    expect(quiz.result.durationMs).toBe(9500);
    expect(quiz.result.mistakes).toBe(1);
  });

  test('stale target, unrelated drag data, double completion and inactive sessions cannot score', () => {
    act(() => quiz.start());
    const first = quiz.target;
    act(() => quiz.submit('unrelated file', first.id));
    expect(quiz.mistakes).toBe(0);
    act(() => {
      quiz.submit(first.name, first.id);
      quiz.submit(first.name, first.id);
    });
    expect(quiz.completed).toBe(1);
    complete();
    act(() => quiz.submit(first.name, first.id));
    expect(readQuizRuns()).toHaveLength(1);
    mount('100:0', false);
    act(() => quiz.start());
    expect(quiz.phase).toBe('ready');
  });

  test('floor, map, mode and leaving Quiz discard partial runs and separate leaderboards', () => {
    act(() => quiz.start());
    answerTarget();
    mount('100:1');
    expect(quiz.phase).toBe('ready');
    expect(readQuizRuns()).toHaveLength(0);
    act(() => quiz.start());
    complete();
    mount('200:0');
    expect(quiz.leaderboard).toHaveLength(0);
    act(() => quiz.start());
    answerTarget();
    act(() => quiz.changeKind('multiple-choice'));
    expect(quiz.phase).toBe('ready');
    expect(readQuizRuns()).toHaveLength(1);
    mount('100:1');
    expect(quiz.leaderboard).toHaveLength(1);
  });

  test('multiple choice supplies six unique options including the answer, then locks grading until Next', () => {
    act(() => quiz.changeKind('multiple-choice'));
    act(() => quiz.start());
    expect(quiz.choices).toHaveLength(6);
    expect(new Set(quiz.choices).size).toBe(6);
    expect(quiz.choices.filter(name => name === quiz.target.name)).toHaveLength(1);
    const wrong = quiz.choices.find(name => name !== quiz.target.name);
    act(() => quiz.submit(wrong, quiz.target.id));
    expect(quiz.phase).toBe('review');
    expect(quiz.correct).toBe(0);
    expect(quiz.mistakes).toBe(1);
    expect(quiz.feedback.text).toBe(`Answer: ${quiz.target.name}`);
    answerTarget();
    expect(quiz.correct).toBe(0);
    act(() => quiz.nextQuestion());
    while (quiz.phase !== 'finished') {
      answerTarget();
      act(() => quiz.nextQuestion());
    }
    expect(quiz.correct).toBe(6);
    expect(quiz.completed).toBe(7);
    expect(readQuizRuns()).toHaveLength(0);
  });

  test('failed saving retains the result and retry writes exactly one record', () => {
    act(() => quiz.start());
    const write = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    complete();
    const resultId = quiz.result.id;
    expect(quiz.phase).toBe('finished');
    expect(quiz.saved).toBe(false);
    expect(quiz.storageError).toMatch(/could not be saved/);
    write.mockRestore();
    act(() => quiz.retrySave());
    act(() => quiz.retrySave());
    expect(readQuizRuns()).toHaveLength(1);
    expect(quiz.leaderboard[0].id).toBe(resultId);
    expect(quiz.saved).toBe(true);
    expect(quiz.storageError).toBe('');
  });

  test('corrupt leaderboard cannot crash the page or be silently overwritten', () => {
    localStorage.setItem(QUIZ_RUNS_KEY, 'corrupt');
    mount('100:1');
    expect(quiz.storageError).toMatch(/Could not load/);
    act(() => quiz.start());
    complete();
    expect(quiz.saved).toBe(false);
    expect(localStorage.getItem(QUIZ_RUNS_KEY)).toBe('corrupt');
  });
});
