import { createElementId } from './elementId';

export const DEFAULT_TIMELINE = { duration: 30, movements: [], phases: [] };

function number(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeTimeline(value) {
  const source = value && typeof value === 'object' ? value : DEFAULT_TIMELINE;
  const movements = Array.isArray(source.movements) ? source.movements : [];
  const phases = Array.isArray(source.phases) ? source.phases : [];
  const normalizedMovements = movements
      .filter(movement => movement && typeof movement === 'object' && movement.ownerId)
      .map(movement => {
        const startTime = Math.max(0, number(movement.startTime, 0));
        const endTime = Math.max(startTime, number(movement.endTime, startTime + 1));
        return {
          id: movement.id || createElementId(),
          ownerId: movement.ownerId,
          start: { x: number(movement.start?.x, 50), y: number(movement.start?.y, 50) },
          end: { x: number(movement.end?.x, 50), y: number(movement.end?.y, 50) },
          startTime,
          endTime,
        };
      });
  return {
    duration: Math.max(1, number(source.duration, DEFAULT_TIMELINE.duration), ...normalizedMovements.map(movement => movement.endTime)),
    movements: normalizedMovements,
    phases: phases
      .filter(phase => phase && typeof phase === 'object' && String(phase.name || '').trim())
      .map(phase => ({
        id: phase.id || createElementId(),
        name: String(phase.name).trim().slice(0, 48),
        startTime: Math.max(0, number(phase.startTime, 0)),
        endTime: Math.max(0, number(phase.endTime, 5)),
        color: phase.color || '#E8B84B',
      }))
      .map(phase => ({ ...phase, endTime: Math.max(phase.startTime, phase.endTime) })),
  };
}

export function getActivePhase(timeline, time) {
  return normalizeTimeline(timeline).phases.find(phase => time >= phase.startTime && time <= phase.endTime) || null;
}

export function movementPosition(movement, time) {
  if (time <= movement.startTime) return { ...movement.start };
  if (time >= movement.endTime || movement.endTime <= movement.startTime) return { ...movement.end };
  const progress = (time - movement.startTime) / (movement.endTime - movement.startTime);
  return {
    x: movement.start.x + (movement.end.x - movement.start.x) * progress,
    y: movement.start.y + (movement.end.y - movement.start.y) * progress,
  };
}

export function getPlaybackPositions(timeline, time, players = []) {
  const normalized = normalizeTimeline(timeline);
  const byOwner = new Map(players.map(player => [player.slotId, player]));
  const grouped = new Map();
  normalized.movements.forEach(movement => {
    const list = grouped.get(movement.ownerId) || [];
    list.push(movement);
    grouped.set(movement.ownerId, list);
  });

  return [...grouped.entries()].flatMap(([ownerId, movements]) => {
    movements.sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime);
    const movement = movements.find(item => time < item.endTime && time >= item.startTime)
      || movements.filter(item => item.startTime <= time).at(-1)
      || movements[0];
    if (!movement) return [];
    return [{
      ...movement,
      ...movementPosition(movement, time),
      player: byOwner.get(ownerId) || null,
    }];
  });
}
