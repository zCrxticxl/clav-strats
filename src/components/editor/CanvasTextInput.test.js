import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { CanvasTextInput } from './CanvasTextInput';

global.IS_REACT_ACT_ENVIRONMENT = true;

test('submits text exactly once on Enter', () => {
  const onSubmit = jest.fn();
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<CanvasTextInput clientX={100} clientY={120} value="Push" color="#fff" onChange={() => {}} onSubmit={onSubmit} onCancel={() => {}}/>));
  const input = document.body.querySelector('[role="dialog"] input');
  act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true })));
  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(onSubmit).toHaveBeenCalledWith('Push');
  act(() => root.unmount());
});

test('Escape cancels without submitting', () => {
  const onSubmit = jest.fn();
  const onCancel = jest.fn();
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<CanvasTextInput clientX={100} clientY={120} value="Cancel" color="#fff" onChange={() => {}} onSubmit={onSubmit} onCancel={onCancel}/>));
  const input = document.body.querySelector('[role="dialog"] input');
  act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true })));
  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onSubmit).not.toHaveBeenCalled();
  act(() => root.unmount());
});

test('renders a visible dialog and submits with its button', () => {
  const onSubmit = jest.fn();
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<CanvasTextInput clientX={240} clientY={180} value="Hold" color="#E8B84B" onChange={() => {}} onSubmit={onSubmit} onCancel={() => {}}/>));
  const dialog = document.body.querySelector('[role="dialog"][aria-label="Text platzieren"]');
  expect(dialog).not.toBeNull();
  expect(dialog.style.position).toBe('fixed');
  const addButton = Array.from(dialog.querySelectorAll('button')).find(button => button.textContent === 'Hinzufügen');
  act(() => addButton.dispatchEvent(new MouseEvent('click', { bubbles:true })));
  expect(onSubmit).toHaveBeenCalledWith('Hold');
  act(() => root.unmount());
});
