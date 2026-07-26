import { createElementId } from './elementId';

test('creates unique ids even when many are made in the same millisecond', () => {
  const ids = new Set(Array.from({ length: 5000 }, () => createElementId()));
  expect(ids.size).toBe(5000);
});

test('falls back to a unique id when crypto.randomUUID is unavailable', () => {
  const original = globalThis.crypto;
  Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });
  try {
    const ids = new Set(Array.from({ length: 2000 }, () => createElementId()));
    expect(ids.size).toBe(2000);
    expect([...ids][0]).toMatch(/^el-/);
  } finally {
    Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true });
  }
});
