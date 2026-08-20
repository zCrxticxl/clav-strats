import { migrateOwnedElements, normalizeLineup, normalizeLineupsByContext } from './playerOwnership';
import { normalizeTimeline } from './timeline';
import { normalizeTasks } from './tasks';

export const CURRENT_STRAT_SCHEMA_VERSION = 2;
export const CURRENT_BACKUP_VERSION = 2;

export function migrateStrat(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const mapId = value.mapId || '';
  const side = value.side === 'attack' || value.side === 'defend' ? value.side : 'defend';
  let lineupsByContext = normalizeLineupsByContext(value.lineupsByContext);
  if (Object.keys(lineupsByContext).length === 0 && Array.isArray(value.lineup)) {
    lineupsByContext = { [`${mapId || 'none'}:${side}`]: normalizeLineup(value.lineup) };
  }
  const elements = Array.isArray(value.elements) ? value.elements : [];
  return {
    ...value,
    schemaVersion: CURRENT_STRAT_SCHEMA_VERSION,
    side,
    elements: migrateOwnedElements(elements, lineupsByContext, { mapId, side }),
    lineupsByContext,
    timeline: normalizeTimeline(value.timeline),
    tasks: normalizeTasks(value.tasks),
  };
}

export function parseBackupPayload(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Backup must contain a strat array.');
  }
  if (value.app && value.app !== 'clav-strats') throw new Error('This file is not a Clav.Strats backup.');
  if (Number(value.version || 1) > CURRENT_BACKUP_VERSION) throw new Error('This backup was created by a newer app version.');
  if (!Array.isArray(value.strats)) throw new Error('Backup must contain a strat array.');
  return value.strats;
}
