import React, { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { useStrats } from './useStrats';

global.IS_REACT_ACT_ENVIRONMENT = true;

function Harness({ onReady }) {
  const value = useStrats();
  useEffect(() => onReady(value), [onReady, value]);
  return null;
}

describe('useStrats', () => {
  let container;
  let root;
  let api;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
  });

  const mount = () => act(() => {
    root.render(<Harness onReady={value => { api = value; }} />);
  });

  test('loads an empty list when storage is empty', () => {
    mount();
    expect(api.strats).toEqual([]);
  });

  test('recovers from corrupt or non-array storage instead of crashing', () => {
    localStorage.setItem('clav-strats', '{"not":"an array"}');
    mount();
    expect(api.strats).toEqual([]);

    localStorage.setItem('clav-strats', 'not json at all');
    mount();
    expect(api.strats).toEqual([]);
  });

  test('saveStrat assigns id/timestamps and does not mutate the input', () => {
    mount();
    const input = { name: 'A', mapId: 'bank', tags: [] };
    let saved;
    act(() => { saved = api.saveStrat(input); });

    expect(saved.id).toMatch(/^strat-/);
    expect(saved.createdAt).toBeTruthy();
    expect(saved.updatedAt).toBeTruthy();
    expect(input.id).toBeUndefined();
    expect(api.strats).toHaveLength(1);
    expect(api.strats[0]).toEqual(saved);
  });

  test('saveStrat updates an existing strat in place by id', () => {
    mount();
    let first;
    act(() => { first = api.saveStrat({ id: 'x', name: 'X', mapId: 'bank' }); });
    act(() => { api.saveStrat({ id: 'x', name: 'X2', mapId: 'bank' }); });
    expect(api.strats).toHaveLength(1);
    expect(api.strats[0].name).toBe('X2');
    expect(api.strats[0].id).toBe('x');
    expect(first.id).toBe('x');
  });

  test('importStrats returns real added/updated/skipped stats', () => {
    localStorage.setItem('clav-strats', JSON.stringify([
      { id: 'a', name: 'A-old', mapId: 'bank', updatedAt: '2024-01-01T00:00:00Z' },
    ]));
    mount();

    let stats;
    act(() => {
      stats = api.importStrats([
        { id: 'a', name: 'A-new', mapId: 'bank', updatedAt: '2024-02-01T00:00:00Z' },
        { id: 'b', name: 'B', mapId: 'clubhouse' },
        { name: 'missing mapId' },
        null,
        'garbage',
      ]);
    });

    expect(stats).toEqual({ added: 1, updated: 1, skipped: 3 });
    expect(api.strats.map(s => s.name).sort()).toEqual(['A-new', 'B']);
  });

  test('importStrats keeps the newer local strat on an older import', () => {
    localStorage.setItem('clav-strats', JSON.stringify([
      { id: 'a', name: 'Local-new', mapId: 'bank', updatedAt: '2024-03-01T00:00:00Z' },
    ]));
    mount();

    let stats;
    act(() => {
      stats = api.importStrats([
        { id: 'a', name: 'Old-import', mapId: 'bank', updatedAt: '2024-01-01T00:00:00Z' },
      ]);
    });

    expect(stats).toEqual({ added: 0, updated: 0, skipped: 1 });
    expect(api.strats.map(s => s.name)).toEqual(['Local-new']);
  });

  test('importStrats rejects a non-array', () => {
    mount();
    expect(() => api.importStrats({ strats: [] })).toThrow(/array/i);
  });
});
