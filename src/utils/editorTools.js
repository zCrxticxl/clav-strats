export function getEditorCursor(activeTool, pendingOp, pendingGadget) {
  if (activeTool === 'eraser') return 'crosshair';
  if (activeTool === 'operator' && pendingOp) return 'copy';
  if (activeTool === 'gadget' && pendingGadget) return 'copy';
  if (['reinforcement', 'barricade', 'rotate', 'headline', 'feetline', 'verticalholes', 'gadget'].includes(activeTool)) return 'cell';
  return activeTool === 'select' ? 'default' : 'crosshair';
}
