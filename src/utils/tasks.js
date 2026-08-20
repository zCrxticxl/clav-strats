import { createElementId } from './elementId';

export function normalizeTasks(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(task => task && typeof task === 'object' && String(task.title || '').trim())
    .map(task => ({
      id: task.id || createElementId(),
      title: String(task.title).trim().slice(0, 120),
      ownerId: task.ownerId || null,
      phaseId: task.phaseId || null,
      elementId: task.elementId || null,
      status: task.status === 'done' ? 'done' : 'open',
    }));
}
