export function yMapToObject(yMap) {
  const value = {};
  yMap.forEach((entry, key) => { value[key] = entry; });
  return value;
}

export function syncYMap(ydoc, yMap, entries) {
  ydoc.transact(() => {
    const keys = new Set();
    for (const [key, value] of entries) {
      const normalizedKey = String(key);
      keys.add(normalizedKey);
      if (JSON.stringify(yMap.get(normalizedKey)) !== JSON.stringify(value)) {
        yMap.set(normalizedKey, value);
      }
    }
    for (const key of Array.from(yMap.keys())) {
      if (!keys.has(key)) yMap.delete(key);
    }
  }, 'local');
}
