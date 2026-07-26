import React, { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { useEditorHistory } from './useEditorHistory';

global.IS_REACT_ACT_ENVIRONMENT = true;

function HistoryHarness({ onReady }) {
  const value = useEditorHistory([]);
  useEffect(() => onReady(value), [onReady, value]);
  return null;
}

describe('useEditorHistory', () => {
  let container;
  let root;
  let history;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => { root.render(<HistoryHarness onReady={value => { history = value; }} />); });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test('undoes and redoes an editor update', () => {
    act(() => history[1]([{ id: 'one' }]));
    expect(history[0]).toEqual([{ id: 'one' }]);
    expect(history[2].canUndo).toBe(true);

    act(() => history[2].undo());
    expect(history[0]).toEqual([]);
    expect(history[2].canRedo).toBe(true);

    act(() => history[2].redo());
    expect(history[0]).toEqual([{ id: 'one' }]);
  });

  test('does not add remote updates to the undo stack', () => {
    act(() => history[2].applyRemote([{ id: 'remote' }]));
    expect(history[0]).toEqual([{ id: 'remote' }]);
    expect(history[2].canUndo).toBe(false);
  });
});
