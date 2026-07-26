import { syncYMap, yMapToObject } from './collabSync';

function makeMap(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    get: key => data.get(key), set: (key, value) => data.set(key, value),
    delete: key => data.delete(key), keys: () => data.keys(), forEach: fn => data.forEach((value, key) => fn(value, key)),
  };
}

test('syncYMap updates changed entries and removes deleted ones in one local transaction', () => {
  const yMap = makeMap({ keep: { x: 1 }, remove: { x: 2 } });
  const ydoc = { transact: jest.fn(callback => callback()) };

  syncYMap(ydoc, yMap, [['keep', { x: 1 }], ['add', { x: 3 }]]);

  expect(ydoc.transact).toHaveBeenCalledWith(expect.any(Function), 'local');
  expect(yMapToObject(yMap)).toEqual({ keep: { x: 1 }, add: { x: 3 } });
});
