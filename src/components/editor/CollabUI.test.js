import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { CollabBar } from './CollabUI';
import { parseCollabInvite } from '../../utils/collabInvite';

global.IS_REACT_ACT_ENVIRONMENT = true;

const collab = {
  connected:true,
  synced:true,
  unreachable:false,
  serverUrl:'wss://bright-map.trycloudflare.com',
  self:{ name:'Host', color:'#E8B84B' },
  peers:[],
};

test('copies a self-contained invitation with room and server', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable:true,
    value:{ writeText },
  });
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(
    <CollabBar
      collab={{ ...collab, serverUrl:'ws://127.0.0.1:4321' }}
      room="room-123"
      inviteServerUrl="wss://bright-map.trycloudflare.com"
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

test('reports an unreachable endpoint instead of connecting forever', () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(
    <CollabBar
      collab={{ ...collab, connected:false, synced:false, unreachable:true, serverUrl:'wss://dead.trycloudflare.com' }}
      room="room-123"
      onLeave={() => {}}
      onToast={() => {}}
    />
  ));

  expect(container.textContent).toContain('unreachable');
  expect(container.textContent).not.toContain('connect…');
  expect(container.querySelector('[title*="dead.trycloudflare.com"]')).not.toBeNull();
  act(() => root.unmount());
});

test('shows the live state once connected and synced', () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(
    <CollabBar collab={collab} room="room-123" onLeave={() => {}} onToast={() => {}} />
  ));

  expect(container.textContent).toContain('live');
  act(() => root.unmount());
});

test('disables stale invitations while a replacement tunnel starts', () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(
    <CollabBar
      collab={{ ...collab, connected:false, unreachable:true }}
      room="room-123"
      recovering
      onLeave={() => {}}
      onToast={() => {}}
    />
  ));

  expect(container.textContent).toContain('repairing…');
  expect(container.querySelector('button[title*="becomes available"]').disabled).toBe(true);
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
