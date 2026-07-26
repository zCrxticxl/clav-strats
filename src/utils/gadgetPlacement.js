export const WALL_MARKER_TYPES = new Set(['wall', 'softwall', 'hatch']);
export const OPENING_MARKER_TYPES = new Set(['door', 'window']);
export const ATTACHED_GADGET_SIZE = 3;
export const ATTACHED_GADGET_GAP = 1.5;
export const ATTACHED_GADGET_SLOT_GAP = 0.65;

export function requiresMarker(gadget) {
  return gadget?.placement === 'opening' || gadget?.placement === 'wall';
}

export function supportsWallAttachment(gadget) {
  return gadget?.placement === 'wall';
}

export function markerSupportsGadget(gadget, marker) {
  if (!gadget || !marker) return false;
  if (!requiresMarker(gadget)) return false;
  if (Array.isArray(gadget.markerTypes)) return gadget.markerTypes.includes(marker.type);
  if (gadget.placement === 'opening') return OPENING_MARKER_TYPES.has(marker.type);
  if (supportsWallAttachment(gadget)) return WALL_MARKER_TYPES.has(marker.type);
  return false;
}

export function findNearestGadgetMarker(gadget, point, markers, maxDistance = 8) {
  let nearest = null;
  for (const marker of markers) {
    if (!markerSupportsGadget(gadget, marker)) continue;
    const distance = Math.hypot(marker.x - point.x, marker.y - point.y);
    if (distance <= maxDistance && (!nearest || distance < nearest.distance)) {
      nearest = { marker, distance };
    }
  }
  return nearest;
}

export function getDefaultAttachmentSide(marker) {
  return marker.horizontal !== false
    ? (marker.y > 6 ? -1 : 1)
    : (marker.x < 94 ? 1 : -1);
}

function getSlotOffset(slot) {
  if (!slot) return 0;
  const distance = Math.ceil(slot / 2);
  return slot % 2 === 1 ? -distance : distance;
}

export function getAttachedGadgetPosition(marker, options = {}) {
  const slot = options.slot ?? 0;
  const side = options.side === -1 || options.side === 1
    ? options.side
    : getDefaultAttachmentSide(marker);
  const scale = options.scale || 1;
  const slotSpacingScale = options.slotSpacingScale || scale;
  const gadgetSize = ATTACHED_GADGET_SIZE * scale;
  const alongWallOffset = getSlotOffset(slot)
    * (ATTACHED_GADGET_SIZE * slotSpacingScale + ATTACHED_GADGET_SLOT_GAP);
  const horizontal = marker.horizontal !== false;
  if (horizontal) {
    const offset = (marker.h || 0.7) / 2 + gadgetSize / 2 + ATTACHED_GADGET_GAP;
    return { x:marker.x + alongWallOffset, y:marker.y + side * offset };
  }
  const offset = (marker.w || 0.7) / 2 + gadgetSize / 2 + ATTACHED_GADGET_GAP;
  return { x:marker.x + side * offset, y:marker.y + alongWallOffset };
}

export function getNextAttachmentSlot(elements, markerId) {
  const attached = elements.filter(element => element.type === 'gadget' && element.wallId === markerId);
  const usedSlots = new Set(attached.map((element, index) => element.attachmentSlot ?? index));
  let slot = 0;
  while (usedSlots.has(slot)) slot += 1;
  return slot;
}

export function layoutAttachedGadgets(elements, marker) {
  const attached = elements.filter(element => element.type === 'gadget' && element.wallId === marker.id);
  const slotSpacingScale = Math.max(1, ...attached.map(element => element.scale || 1));
  let fallbackSlot = 0;
  return elements.map(element => {
    if (element.type !== 'gadget' || element.wallId !== marker.id) return element;
    const attachmentSlot = element.attachmentSlot ?? fallbackSlot;
    fallbackSlot += 1;
    const attachmentSide = element.attachmentSide ?? getDefaultAttachmentSide(marker);
    const position = getAttachedGadgetPosition(marker, {
      slot:attachmentSlot, side:attachmentSide, scale:element.scale, slotSpacingScale,
    });
    return {
      ...element, ...position, attachmentSlot, attachmentSide,
      anchorX:marker.x, anchorY:marker.y,
    };
  });
}

export function upsertAttachedGadget(elements, marker, gadget, color, meta = {}) {
  const attached = elements.filter(element => element.type === 'gadget' && element.wallId === marker.id);
  const attachmentSlot = getNextAttachmentSlot(elements, marker.id);
  const attachmentSide = meta.attachmentSide === -1 || meta.attachmentSide === 1
    ? meta.attachmentSide
    : getDefaultAttachmentSide(marker);
  const position = getAttachedGadgetPosition(marker, {
    slot:attachmentSlot, side:attachmentSide, scale:meta.scale,
  });
  return layoutAttachedGadgets([...elements, {
    id:Date.now() + attached.length, type:'gadget', wallId:marker.id, gadget,
    x:position.x, y:position.y, anchorX:marker.x, anchorY:marker.y,
    attachmentSlot, attachmentSide, rotation:0,
    color, ...meta,
  }], marker);
}
