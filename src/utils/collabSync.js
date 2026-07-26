export function yMapToObject(yMap) {
  const value = {};
  yMap.forEach((entry, key) => { value[key] = entry; });
  return value;
}

export function yMapKeys(yMap) {
  return new Set(Array.from(yMap.keys()).map(String));
}

/**
 * Push local entries into a shared Y.Map.
 *
 * Deletion is the subtle part. Naively removing every key that is missing from
 * the local list treats "my list" as the whole truth, which destroys entries a
 * peer added between our last pull and this push — exactly what happens when
 * two people draw at the same time.
 *
 * So a key is only deleted when this client previously observed it (through its
 * own write or a remote pull) and has since dropped it locally. Keys that
 * appeared concurrently were never observed here and are left untouched.
 *
 * @param knownKeys Set of keys this client already observed. Pass null to keep
 *                  the legacy "local list is authoritative" behaviour.
 * @returns the set of keys this client knows about after the push.
 */
export function syncYMap(ydoc, yMap, entries, knownKeys = null) {
  const localKeys = new Set();
  ydoc.transact(() => {
    for (const [key, value] of entries) {
      const normalizedKey = String(key);
      localKeys.add(normalizedKey);
      if (JSON.stringify(yMap.get(normalizedKey)) !== JSON.stringify(value)) {
        yMap.set(normalizedKey, value);
      }
    }
    const deletable = knownKeys ? Array.from(knownKeys) : Array.from(yMap.keys()).map(String);
    for (const key of deletable) {
      if (!localKeys.has(key) && yMap.get(key) !== undefined) yMap.delete(key);
    }
  }, 'local');
  return localKeys;
}
