import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { UNREACHABLE_AFTER_MS, useCollab } from './useCollab';

const mockProviders = [];

jest.mock('yjs', () => {
  class FakeMap extends Map {
    observe() {}
    unobserve() {}
  }

  class Doc {
    constructor() {
      this.maps = new Map();
    }

    getMap(name) {
      if (!this.maps.has(name)) this.maps.set(name, new FakeMap());
      return this.maps.get(name);
    }

    destroy() {}
  }

  return { Doc };
});

jest.mock('y-websocket', () => {
  class FakeAwareness {
    constructor() {
      this.clientID = 1;
      this.handlers = new Map();
      this.states = new Map([[this.clientID, {}]]);
    }

    setLocalStateField(key, value) {
      this.states.set(this.clientID, {
        ...this.states.get(this.clientID),
        [key]: value,
      });
    }

    getStates() {
      return this.states;
    }

    on(event, handler) {
      this.handlers.set(event, handler);
    }

    off(event, handler) {
      if (this.handlers.get(event) === handler) this.handlers.delete(event);
    }
  }

  class WebsocketProvider {
    constructor(serverUrl, room) {
      this.serverUrl = serverUrl;
      this.room = room;
      this.wsconnected = false;
      this.awareness = new FakeAwareness();
      this.handlers = new Map();
      this.destroyed = false;
      mockProviders.push(this);
    }

    on(event, handler) {
      this.handlers.set(event, handler);
    }

    off(event, handler) {
      if (this.handlers.get(event) === handler) this.handlers.delete(event);
    }

    emit(event, value) {
      if (event === 'status') this.wsconnected = value.status === 'connected';
      this.handlers.get(event)?.(value);
    }

    destroy() {
      this.destroyed = true;
    }
  }

  return { WebsocketProvider };
});

global.IS_REACT_ACT_ENVIRONMENT = true;

let latestCollab;

function CollabHarness({ room, serverUrl }) {
  latestCollab = useCollab(room, serverUrl);
  return null;
}

describe('useCollab connection health', () => {
  let container;
  let root;

  beforeEach(() => {
    jest.useFakeTimers();
    mockProviders.length = 0;
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    jest.useRealTimers();
  });

  test('marks both an initial failure and a later disconnect as unreachable', () => {
    act(() => root.render(
      <CollabHarness room="room-123" serverUrl="wss://first.trycloudflare.com" />
    ));
    const provider = mockProviders[0];

    act(() => jest.advanceTimersByTime(UNREACHABLE_AFTER_MS));
    expect(latestCollab.unreachable).toBe(true);

    act(() => provider.emit('status', { status:'connected' }));
    expect(latestCollab.connected).toBe(true);
    expect(latestCollab.unreachable).toBe(false);

    act(() => provider.emit('status', { status:'disconnected' }));
    act(() => jest.advanceTimersByTime(UNREACHABLE_AFTER_MS - 1));
    expect(latestCollab.unreachable).toBe(false);
    act(() => jest.advanceTimersByTime(1));
    expect(latestCollab.unreachable).toBe(true);
  });

  test('reconnects with a replacement endpoint and destroys the stale provider', () => {
    act(() => root.render(
      <CollabHarness room="room-123" serverUrl="wss://first.trycloudflare.com" />
    ));
    const staleProvider = mockProviders[0];

    act(() => root.render(
      <CollabHarness room="room-123" serverUrl="wss://second.trycloudflare.com" />
    ));

    expect(staleProvider.destroyed).toBe(true);
    expect(mockProviders[1].serverUrl).toBe('wss://second.trycloudflare.com');
    expect(latestCollab.serverUrl).toBe('wss://second.trycloudflare.com');
  });
});
