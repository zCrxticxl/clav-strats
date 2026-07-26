import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { CollabBar } from './CollabUI';
import { parseCollabInvite } from '../../utils/collabInvite';

jest.mock('../../hooks/useCollab', () => ({
  getCollabUrl: () => globalThis.localStorage.getItem('clav-collab-url') || 'ws://localhost:1234',
}));

global.IS_REACT_ACT_ENVIRONMENT = true;

const collab = {
  connected:true,
  synced:true,
  self:{ name:'Host', color:'#E8B84B' },
  peers:[],
};

test('copies a self-contained invitation with room and server', async () => {
  localStorage.setItem('clav-collab-url', 'wss://bright-map.trycloudflare.com');
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable:true,
    value:{ writeText },
  });
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(
    <CollabBar
      collab={collab}
      room="room-123"
      onLeave={() => {}}
      onToast={() => {}}
    />
  ));

  await act(async () => {
    container.querySelector('button[title="Copy the complete invitation code"]').click();
  });

  const invitation = parseCollabInvite(writeText.mock.calls[0][0]);
  expect(invitation).toMatchObject({
    room:'room-123',
    serverUrl:'wss://bright-map.trycloudflare.com',
  });
  act(() => root.unmount());
});

test('shows that automatic server and tunnel startup is in progress', async () => {
  let finishStart;
  const onStart = jest.fn(() => new Promise(resolve => { finishStart = resolve; }));
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(
    <CollabBar
      collab={collab}
      room={null}
      onStart={onStart}
      onJoin={() => {}}
      onToast={() => {}}
    />
  ));

  act(() => container.querySelector('button[title="Automatically start a server and public tunnel"]').click());
  expect(container.textContent).toContain('Starting server & tunnel');

  await act(async () => finishStart());
  expect(container.textContent).toContain('Start Live Collab');
  act(() => root.unmount());
});
