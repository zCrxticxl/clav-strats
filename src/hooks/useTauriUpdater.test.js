import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useTauriUpdater } from './useTauriUpdater';

jest.mock('@tauri-apps/plugin-updater', () => ({
  check: jest.fn(),
}));

jest.mock('@tauri-apps/plugin-process', () => ({
  relaunch: jest.fn(),
}));

global.IS_REACT_ACT_ENVIRONMENT = true;

function UpdaterHarness() {
  useTauriUpdater();
  return null;
}

describe('useTauriUpdater', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    root = createRoot(container);
    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      configurable: true,
      value: {},
    });
    window.confirm = jest.fn(() => true);
    check.mockReset();
    relaunch.mockReset();
  });

  afterEach(() => {
    act(() => root.unmount());
    delete window.__TAURI_INTERNALS__;
  });

  test('downloads, installs and relaunches when an update is accepted', async () => {
    const downloadAndInstall = jest.fn().mockResolvedValue(undefined);
    check.mockResolvedValue({
      available: true,
      version: '1.0.2',
      body: 'Release notes',
      downloadAndInstall,
    });

    await act(async () => {
      root.render(<UpdaterHarness />);
    });

    expect(check).toHaveBeenCalledTimes(1);
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Update 1.0.2'));
    expect(downloadAndInstall).toHaveBeenCalledTimes(1);
    expect(relaunch).toHaveBeenCalledTimes(1);
  });

  test('does not download an update that the user declines', async () => {
    const downloadAndInstall = jest.fn();
    window.confirm.mockReturnValue(false);
    check.mockResolvedValue({
      available: true,
      version: '1.0.2',
      downloadAndInstall,
    });

    await act(async () => {
      root.render(<UpdaterHarness />);
    });

    expect(downloadAndInstall).not.toHaveBeenCalled();
    expect(relaunch).not.toHaveBeenCalled();
  });
});
