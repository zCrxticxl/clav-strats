import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { StratActions } from './StratActions';

global.IS_REACT_ACT_ENVIRONMENT = true;

test('forwards all topbar strat actions', () => {
  const callbacks = {
    onNew: jest.fn(),
    onDuplicate: jest.fn(),
    onEditNote: jest.fn(),
    onSave: jest.fn(),
  };
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<StratActions description="Setup note" {...callbacks} />));

  const buttons = [...container.querySelectorAll('button')];
  expect(buttons.map(button => button.textContent.trim())).toEqual(['＋ New', '⧉ Copy', '📝 Note ✓', '💾 Save']);
  act(() => buttons.forEach(button => button.click()));
  Object.values(callbacks).forEach(callback => expect(callback).toHaveBeenCalledTimes(1));

  act(() => root.unmount());
});
