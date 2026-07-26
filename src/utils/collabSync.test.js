import { syncYMap, yMapKeys, yMapToObject } from './collabSync';

function makeMap(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    get: key => data.get(key), set: (key, value) => data.set(key, value),
    delete: key => data.delete(key), keys: () => data.keys(), forEach: fn => data.forEach((value, key) => fn(value, key)),
  };
}

const makeDoc = () => ({ transact: jest.fn(callback => callback()) });

test('syncYMap updates changed entries and removes deleted ones in one local transaction', () => {
  const yMap = makeMap({ keep: { x: 1 }, remove: { x: 2 } });
  const ydoc = makeDoc();

  syncYMap(ydoc, yMap, [['keep', { x: 1 }], ['add', { x: 3 }]]);

  expect(ydoc.transact).toHaveBeenCalledWith(expect.any(Function), 'local');
  expect(yMapToObject(yMap)).toEqual({ keep: { x: 1 }, add: { x: 3 } });
});

test('keeps entries a peer added concurrently instead of sweeping them away', () => {
  const yMap = makeMap({ shared: { x: 0 } });
  const ydoc = makeDoc();

  // Both clients start from the same observed state.
  let clientA = syncYMap(ydoc, yMap, [['shared', { x: 0 }]], null);
  const clientB = new Set(clientA);

  // Peer B adds an element and pushes it.
  syncYMap(ydoc, yMap, [['shared', { x: 0 }], ['b-arrow', { x: 2 }]], clientB);

  // Client A draws at the same time and pushes before it pulled B's arrow.
  clientA = syncYMap(ydoc, yMap, [['shared', { x: 0 }], ['a-arrow', { x: 1 }]], clientA);

  expect(yMapToObject(yMap)).toEqual({
    shared: { x: 0 }, 'b-arrow': { x: 2 }, 'a-arrow': { x: 1 },
  });
});

test('still deletes entries the client itself removed after observing them', () => {
  const yMap = makeMap({ shared: { x: 0 }, 'a-arrow': { x: 1 } });
  const ydoc = makeDoc();

  const known = yMapKeys(yMap);
  syncYMap(ydoc, yMap, [['shared', { x: 0 }]], known);

  expect(yMapToObject(yMap)).toEqual({ shared: { x: 0 } });
});

test('yMapKeys reports the observed keys as strings', () => {
  expect(yMapKeys(makeMap({ a: 1, b: 2 }))).toEqual(new Set(['a', 'b']));
});
