import {
  findNearestGadgetMarker, getAttachedGadgetPosition, markerSupportsGadget,
  layoutAttachedGadgets, requiresMarker, supportsWallAttachment,
  upsertAttachedGadget,
} from './gadgetPlacement';
import { GADGETS } from '../data/gadgets';

const wall = { id:'wall-1', type:'wall', x:50, y:40, horizontal:true, w:4, h:0.7 };
const door = { id:'door-1', type:'door', x:20, y:20, horizontal:false };

test('matches gadgets only to compatible markers', () => {
  expect(markerSupportsGadget({ placement:'wall' }, wall)).toBe(true);
  expect(markerSupportsGadget({ placement:'wall' }, door)).toBe(false);
  expect(markerSupportsGadget({ placement:'opening' }, door)).toBe(true);
  expect(requiresMarker({ placement:'wall-or-free' })).toBe(false);
  expect(findNearestGadgetMarker({ placement:'wall' }, { x:51, y:40 }, [door, wall])?.marker).toBe(wall);
});

test('only exclusive wall/opening gadgets attach to markers', () => {
  const hatch = { id:'hatch-1', type:'hatch', x:30, y:30 };
  expect(markerSupportsGadget(GADGETS.mira_mirror, wall)).toBe(true);
  expect(markerSupportsGadget(GADGETS.mira_mirror, hatch)).toBe(false);
  expect(markerSupportsGadget(GADGETS.aruni_gate, wall)).toBe(true);
  expect(markerSupportsGadget(GADGETS.aruni_gate, hatch)).toBe(true);
  expect(supportsWallAttachment(GADGETS.mira_mirror)).toBe(true);

  const freelyPlaceable = [
    'ash_breach', 'azami_kiba', 'bp_camera', 'breach_charge', 'candela',
    'ela_grzmot', 'fenrir_dread', 'fuze_charge', 'goyo_volcan', 'hard_breach',
    'jager_ads', 'kaid_electro', 'maestro_evil', 'melusi_banshee',
    'mozzie_pest', 'nitro_cell', 'nomad_airjab', 'proximity_mine', 'smoke_gas',
    'thermite_charge', 'thorn_razor', 'tubarao_zoto', 'valk_cam',
    'wamai_magnet', 'ying_candela', 'zero_argus',
  ];
  for (const id of freelyPlaceable) {
    expect(markerSupportsGadget(GADGETS[id], wall)).toBe(false);
    expect(markerSupportsGadget(GADGETS[id], door)).toBe(false);
  }

  for (const id of ['barricade', 'castle_panel', 'kapkan_edd', 'rauora_skopos']) {
    expect(markerSupportsGadget(GADGETS[id], door)).toBe(true);
    expect(markerSupportsGadget(GADGETS[id], wall)).toBe(false);
  }
});

test('offsets multiple attached gadgets into separate slots on one marker', () => {
  expect(getAttachedGadgetPosition(wall).x).toBe(50);
  expect(getAttachedGadgetPosition(wall).y).toBeCloseTo(36.65);
  const first = upsertAttachedGadget([], wall, { id:'camera' }, '#111', { floor:'1F' });
  const second = upsertAttachedGadget(first, wall, { id:'other' }, '#222', { floor:'1F' });
  expect(second).toHaveLength(2);
  expect(second[0]).toMatchObject({ gadget:{ id:'camera' }, attachmentSlot:0, wallId:'wall-1' });
  expect(second[1]).toMatchObject({ gadget:{ id:'other' }, attachmentSlot:1, wallId:'wall-1' });
  expect(second[0].x).not.toBe(second[1].x);
  expect(second[0].y).toBe(second[1].y);
});

test('supports changing the side and orientation data independently', () => {
  const above = getAttachedGadgetPosition(wall, { slot:0, side:-1 });
  const below = getAttachedGadgetPosition(wall, { slot:0, side:1 });
  expect(above.x).toBe(below.x);
  expect(above.y).toBeLessThan(wall.y);
  expect(below.y).toBeGreaterThan(wall.y);
});

test('keeps scaled gadgets in separate non-overlapping wall slots', () => {
  const laidOut = layoutAttachedGadgets([
    {
      id:'large', type:'gadget', wallId:wall.id, attachmentSlot:0,
      attachmentSide:-1, scale:2,
    },
    {
      id:'regular', type:'gadget', wallId:wall.id, attachmentSlot:1,
      attachmentSide:-1, scale:1,
    },
  ], wall);
  const [large, regular] = laidOut;
  const distance = Math.abs(large.x - regular.x);
  const combinedHalfWidths = (3 * large.scale) / 2 + (3 * regular.scale) / 2;

  expect(distance).toBeGreaterThan(combinedHalfWidths);
  expect(large.y).toBeLessThan(wall.y);
  expect(regular.y).toBeLessThan(wall.y);
});
