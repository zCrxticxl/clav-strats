import {
  migrateOwnedElements, normalizeLineup, normalizeLineupsByContext,
} from './playerOwnership';

test('normalizes legacy players with stable slot ownership', () => {
  const lineup = normalizeLineup([{ color: '#abc', name: 'A' }]);
  expect(lineup[0]).toMatchObject({ name: 'A', color: '#abc', slotId: 'player-slot-1' });
  expect(lineup[4].slotId).toBe('player-slot-5');
});

test('migrates legacy element colors into stable owner metadata', () => {
  const lineups = normalizeLineupsByContext({ 'bank:defend': [{ color: '#abc', name: 'A' }] });
  const [gadget, wall] = migrateOwnedElements([
    { id: 'g', type: 'gadget', color: '#abc', mapId: 'bank' },
    { id: 'w', type: 'reinforcement', color: '#def', mapId: 'bank' },
  ], lineups, { mapId: 'bank', side: 'defend' });

  expect(gadget).toMatchObject({ ownerId: 'player-slot-1', color: '#abc' });
  expect(wall.ownerId).toBeUndefined();
});
