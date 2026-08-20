export function recolorElements(elements, ids, color) {
  const targetIds = new Set(ids);
  return elements.map(element => targetIds.has(element.id)
    && element.type !== 'gadget'
    && element.color && element.color !== color
    ? { ...element, color }
    : element);
}
