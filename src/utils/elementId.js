// Element ids must be globally unique, not just unique on this machine.
// The collaboration layer keys the shared Yjs map by element id, so two clients
// creating an element in the same millisecond would otherwise produce the same
// key and silently overwrite each other. A random uuid removes that class of bug.
export function createElementId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  const random = () => Math.random().toString(36).slice(2, 10);
  return `el-${Date.now().toString(36)}-${random()}${random()}`;
}
