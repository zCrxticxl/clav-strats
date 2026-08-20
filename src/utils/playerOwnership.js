import { PLAYER_COLORS } from '../data/gadgets';

export const PLAYER_SLOT_COUNT = PLAYER_COLORS.length;

export function playerSlotId(index) {
  return `player-slot-${index + 1}`;
}

export function normalizeLineup(players) {
  const source = Array.isArray(players) ? players : [];
  return PLAYER_COLORS.map((defaultColor, index) => {
    const player = source[index] || {};
    return {
      name: player.name || `Player ${index + 1}`,
      color: player.color || defaultColor,
      operator: player.operator || null,
      role: player.role || '',
      gadget: player.gadget || player.operator?.gadget || null,
      secondaryGadget: player.secondaryGadget || null,
      backups: Array.isArray(player.backups) ? player.backups : [],
      slotId: player.slotId || player.playerId || playerSlotId(index),
    };
  });
}

export function normalizeLineupsByContext(lineupsByContext) {
  if (!lineupsByContext || typeof lineupsByContext !== 'object') return {};
  return Object.fromEntries(
    Object.entries(lineupsByContext).map(([key, players]) => [key, normalizeLineup(players)])
  );
}

export function findPlayerByOwner(lineup, ownerId) {
  return normalizeLineup(lineup).find(player => player.slotId === ownerId) || null;
}

export function findPlayerByColor(lineup, color) {
  return normalizeLineup(lineup).find(player => player.color === color) || null;
}

export function getOwnerIdForColor(lineup, color) {
  return findPlayerByColor(lineup, color)?.slotId || null;
}

export function migrateOwnedElements(elements, lineupsByContext, fallbackContext) {
  const lineups = normalizeLineupsByContext(lineupsByContext);
  const fallbackLineup = lineups[`${fallbackContext.mapId || 'none'}:${fallbackContext.side || 'defend'}`] || [];
  return (Array.isArray(elements) ? elements : []).map(element => {
    if (!['gadget', 'reinforcement', 'operator'].includes(element.type)) return element;
    const contextKey = `${element.mapId || fallbackContext.mapId || 'none'}:${element.side || fallbackContext.side || 'defend'}`;
    const lineup = lineups[contextKey] || fallbackLineup;
    const owner = findPlayerByOwner(lineup, element.ownerId)
      || findPlayerByColor(lineup, element.color);
    if (!owner) return element;
    if (element.ownerId === owner.slotId && element.color === owner.color) return element;
    return { ...element, ownerId: owner.slotId, color: owner.color };
  });
}
