import { CURRENT_STRAT_SCHEMA_VERSION, parseBackupPayload, migrateStrat } from './stratSchema';

test('migrates old strats with safe defaults without changing a saved attacker side', () => {
  const old = migrateStrat({ mapId: 'bank', side: 'attack', elements: [] });
  expect(old).toMatchObject({ schemaVersion: CURRENT_STRAT_SCHEMA_VERSION, side: 'attack', timeline: { movements: [] } });
});

test('defaults missing side and timeline data for legacy strats', () => {
  expect(migrateStrat({ mapId: 'bank' })).toMatchObject({ side: 'defend', timeline: { duration: 30, movements: [] } });
});

test('validates backup envelopes while accepting version one', () => {
  expect(parseBackupPayload({ app: 'clav-strats', version: 1, strats: [{ mapId: 'bank' }] })).toHaveLength(1);
  expect(() => parseBackupPayload({ app: 'other', version: 1, strats: [] })).toThrow(/Clav.Strats/);
  expect(() => parseBackupPayload({ app: 'clav-strats', version: 99, strats: [] })).toThrow(/newer/);
});
