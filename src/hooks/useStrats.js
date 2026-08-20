import { useState, useEffect, useRef } from 'react';
import { migrateStrat } from '../utils/stratSchema';

export const FOLDERS_STORAGE_KEY = 'clav-strat-folders';

function loadFolders() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FOLDERS_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(folder => folder && folder.id && folder.name) : [];
  } catch { return []; }
}

function loadStrats() {
  try {
    const saved = localStorage.getItem('clav-strats');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    // Guard against a corrupt/non-array payload (e.g. `"null"`, `"{}"`, a
    // truncated write, or an older app version) so the library never crashes.
    return Array.isArray(parsed) ? parsed.map(migrateStrat).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function useStrats() {
  const [strats, setStrats] = useState(loadStrats);
  const [folders, setFolders] = useState(loadFolders);
  const stratsRef = useRef(strats);
  useEffect(() => { stratsRef.current = strats; }, [strats]);

  useEffect(() => {
    // Never let a storage write (e.g. quota exceeded) crash the whole app.
    try {
      localStorage.setItem('clav-strats', JSON.stringify(strats));
    } catch (e) {
      console.error('[useStrats] save failed:', e);
    }
  }, [strats]);
  useEffect(() => {
    try { localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders)); } catch {}
  }, [folders]);

  const saveStrat = (strat) => {
    const id = strat.id || `strat-${Date.now()}`;
    const now = new Date().toISOString();
    const migrated = migrateStrat(strat) || {};
    const newStrat = {
      ...JSON.parse(JSON.stringify(migrated)),
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

  const createFolder = (name, parentId = null) => {
    const folder = { id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: String(name).trim().slice(0, 80), parentId };
    if (!folder.name) return null;
    setFolders(previous => [...previous, folder]);
    return folder;
  };
  const renameFolder = (id, name) => setFolders(previous => previous.map(folder => folder.id === id ? { ...folder, name: String(name).trim().slice(0, 80) } : folder));
  const deleteFolder = id => {
    setFolders(previous => previous.filter(folder => folder.id !== id));
    setStrats(previous => previous.map(strat => strat.folderId === id ? { ...strat, folderId: null } : strat));
  };
  const moveStratToFolder = (id, folderId) => setStrats(previous => previous.map(strat => strat.id === id ? { ...strat, folderId: folderId || null } : strat));
  const importFolders = incoming => {
    if (!Array.isArray(incoming)) return;
    setFolders(previous => {
      const ids = new Set(previous.map(folder => folder.id));
      return [...previous, ...incoming.filter(folder => folder?.id && folder.name && !ids.has(folder.id))];
    });
  };

  // Merge an imported list into the current strats. Matching ids are resolved by
  // updatedAt (newer wins); unknown strats are added. Returns { added, updated, skipped }.
  // Computed synchronously from the current value so the returned stats are real.
  const importStrats = (incoming) => {
    if (!Array.isArray(incoming)) throw new Error('Import must be an array of strats.');
    const stats = { added: 0, updated: 0, skipped: 0 };
    const byId = new Map(stratsRef.current.map(s => [s.id, s]));
    for (const raw of incoming) {
      const migrated = migrateStrat(raw);
      if (!migrated || !migrated.mapId) {
        stats.skipped++;
        continue;
      }
      const id = migrated.id || `strat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const existing = byId.get(id);
      if (existing) {
        if (new Date(migrated.updatedAt || 0) > new Date(existing.updatedAt || 0)) {
          byId.set(id, { ...migrated, id });
          stats.updated++;
        } else {
          stats.skipped++;
        }
      } else {
        byId.set(id, { ...migrated, id });
        stats.added++;
      }
    }
    setStrats(Array.from(byId.values()));
    return stats;
  };

  return { strats, folders, saveStrat, deleteStrat, createFolder, renameFolder, deleteFolder, moveStratToFolder, importFolders, importStrats };
}
