import { getPlaybackPositions, movementPosition, normalizeTimeline } from './timeline';

const lineup = [
  { slotId: 'player-slot-1', name: 'A', color: '#aaa', operator: { name: 'Ash' } },
  { slotId: 'player-slot-2', name: 'B', color: '#bbb', operator: { name: 'Bandit' } },
];

test('interpolates a movement and keeps endpoints deterministic', () => {
  const movement = { start: { x: 10, y: 20 }, end: { x: 50, y: 60 }, startTime: 2, endTime: 6 };
  expect(movementPosition(movement, 1)).toEqual({ x: 10, y: 20 });
  expect(movementPosition(movement, 4)).toEqual({ x: 30, y: 40 });
  expect(movementPosition(movement, 7)).toEqual({ x: 50, y: 60 });
});

test('combines simultaneous and sequential movements by stable owner', () => {
  const timeline = normalizeTimeline({ duration: 12, movements: [
    { id: 'a1', ownerId: 'player-slot-1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, startTime: 0, endTime: 4 },
    { id: 'a2', ownerId: 'player-slot-1', start: { x: 10, y: 0 }, end: { x: 20, y: 0 }, startTime: 4, endTime: 8 },
    { id: 'b1', ownerId: 'player-slot-2', start: { x: 0, y: 10 }, end: { x: 0, y: 30 }, startTime: 2, endTime: 8 },
  ] });
  const positions = getPlaybackPositions(timeline, 5, lineup);
  expect(positions).toHaveLength(2);
  expect(positions.find(position => position.ownerId === 'player-slot-1')).toMatchObject({ x: 12.5, y: 0 });
  expect(positions.find(position => position.ownerId === 'player-slot-2')).toMatchObject({ x: 0, y: 20 });
});

test('missing timeline data safely defaults for older strats', () => {
  expect(normalizeTimeline(null)).toEqual({ duration: 30, movements: [], phases: [] });
});
