import { useState, useEffect } from 'react';

export function useStrats() {
  const [strats, setStrats] = useState(() => {
    try {
      const saved = localStorage.getItem('clav-strats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    // Never let a storage write (e.g. quota exceeded) crash the whole app.
    try {
      localStorage.setItem('clav-strats', JSON.stringify(strats));
    } catch (e) {
      console.error('[useStrats] save failed:', e);
    }
  }, [strats]);

  const saveStrat = (strat) => {
    const id = strat.id || `strat-${Date.now()}`;
    const now = new Date().toISOString();
    const newStrat = {
      ...JSON.parse(JSON.stringify(strat)),
      id,
      updatedAt: now,
      createdAt: strat.createdAt || now,
    };
    setStrats(prev => {
      const existing = prev.findIndex(s => s.id === id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newStrat;
        return updated;
      }
      return [newStrat, ...prev];
    });
    return newStrat;
  };

  const deleteStrat = (id) => {
    setStrats(prev => prev.filter(s => s.id !== id));
  };

  const getStratsByMap = (mapId) => strats.filter(s => s.mapId === mapId);

  const hasDuplicateName = (name, excludeId) =>
    strats.some(s => s.id !== excludeId && s.name?.toLowerCase().trim() === name?.toLowerCase().trim());

  // Merge an imported list into the current strats. Matching ids are resolved by
  // updatedAt (newer wins); unknown strats are added. Returns { added, updated, skipped }.
  const importStrats = (incoming) => {
    if (!Array.isArray(incoming)) throw new Error('Import must be an array of strats.');
    const stats = { added: 0, updated: 0, skipped: 0 };
    setStrats(prev => {
      const byId = new Map(prev.map(s => [s.id, s]));
      for (const raw of incoming) {
        if (!raw || typeof raw !== 'object' || !raw.mapId) { stats.skipped++; continue; }
        const id = raw.id || `strat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const existing = byId.get(id);
        if (existing) {
          if (new Date(raw.updatedAt || 0) > new Date(existing.updatedAt || 0)) {
            byId.set(id, { ...raw, id }); stats.updated++;
          } else stats.skipped++;
        } else {
          byId.set(id, { ...raw, id }); stats.added++;
        }
      }
      return Array.from(byId.values());
    });
    return stats;
  };

  return { strats, saveStrat, deleteStrat, getStratsByMap, hasDuplicateName, importStrats };
}
