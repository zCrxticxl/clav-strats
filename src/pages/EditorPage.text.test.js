import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EditorPage from './EditorPage';

jest.mock('../utils/wallDetector', () => ({
  detectWalls: () => Promise.resolve({ walls:[], doors:[], hatches:[] }),
}));
jest.mock('../hooks/useCollab', () => ({
  getCollabUrl: () => 'ws://localhost:1234',
  setCollabUrl: () => {},
  useCollab: () => ({
    enabled:false, connected:false, synced:false, unreachable:false, serverUrl:null,
    self:{ name:'Test', color:'#fff' }, peers:[],
    ydoc:null, yElements:null, yLineups:null, yMeta:null,
    setPresence:() => {},
  }),
}));

global.IS_REACT_ACT_ENVIRONMENT = true;

test('opens the visible text dialog after selecting Text and clicking the canvas', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/editor?map=bank']}>
        <Routes>
          <Route path="/editor" element={<EditorPage/>}/>
        </Routes>
      </MemoryRouter>
    );
  });

  const textButton = container.querySelector('button[title="Text"]');
  expect(textButton).not.toBeNull();
  act(() => textButton.dispatchEvent(new MouseEvent('click', { bubbles:true })));

  const canvas = container.querySelector('.editor-canvas-area');
  expect(canvas).not.toBeNull();
  act(() => canvas.dispatchEvent(new MouseEvent('mousedown', {
    bubbles:true, button:0, clientX:420, clientY:280,
  })));

  const dialog = document.body.querySelector('[role="dialog"][aria-label="Text platzieren"]');
  expect(dialog).not.toBeNull();
  expect(dialog.querySelector('input')).toBe(document.activeElement);

  act(() => root.unmount());
  container.remove();
});

test('places vertical holes after selecting the tool and clicking the canvas', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/editor?map=bank']}>
        <Routes>
          <Route path="/editor" element={<EditorPage/>}/>
        </Routes>
      </MemoryRouter>
    );
  });

  const toolButton = container.querySelector('button[title="Vertical Holes"]');
  expect(toolButton).not.toBeNull();
  act(() => toolButton.dispatchEvent(new MouseEvent('click', { bubbles:true })));

  const canvas = container.querySelector('.editor-canvas-area');
  expect(canvas).not.toBeNull();
  act(() => canvas.dispatchEvent(new MouseEvent('mousedown', {
    bubbles:true, button:0, clientX:420, clientY:280,
  })));

  expect(container.querySelector('[data-element-type="verticalholes"]')).not.toBeNull();

  act(() => root.unmount());
  container.remove();
});
