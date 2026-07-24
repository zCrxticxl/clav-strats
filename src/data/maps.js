// Map definitions + blueprint paths.
// Blueprints live in /public/blueprints/ as .webp files. Only maps that
// actually have files are exposed; otherwise the editor would show empty
// canvases. As you add more files, drop them in /public/blueprints/ and
// extend MAP_BLUEPRINTS below — the floor names below MUST match the keys
// in MAP_BLUEPRINTS for the blueprint to load.

export const COMPETITIVE_MAPS = [
  { id: 'bank',        name: 'Bank',             floors: ['Basement','Ground Floor','1st Floor'],          type: 'competitive', preview: 'https://cdn.siege.gg/maps/bank.jpg' },
  { id: 'border',      name: 'Border',           floors: ['Ground Floor','1st Floor'],                     type: 'competitive', preview: 'https://cdn.siege.gg/maps/border.jpg' },
  { id: 'chalet',      name: 'Chalet',           floors: ['Basement','Ground Floor','1st Floor'],          type: 'competitive', preview: 'https://cdn.siege.gg/maps/chalet.jpg' },
  { id: 'clubhouse',   name: 'Clubhouse',        floors: ['Basement','Ground Floor','2nd Floor'],          type: 'competitive', preview: 'https://cdn.siege.gg/maps/club-house.jpg' },
  { id: 'consulate',   name: 'Consulate',        floors: ['Basement','Ground Floor','1st Floor'],          type: 'competitive', preview: 'https://cdn.siege.gg/maps/consulate.jpg' },
  { id: 'fortress',    name: 'Fortress',         floors: ['Ground Floor','1st Floor'],                     type: 'competitive', preview: 'https://cdn.siege.gg/maps/fortress.jpg' },
  { id: 'kafe',        name: 'Kafe Dostoyevsky', floors: ['Ground Floor','1st Floor','2nd Floor'],         type: 'competitive', preview: 'https://cdn.siege.gg/maps/kafe.jpg' },
  { id: 'nighthaven',  name: 'Nighthaven Labs',  floors: ['Basement','Ground Floor','1st Floor'],          type: 'competitive', preview: 'https://cdn.siege.gg/maps/nighthaven-labs.jpg' },
];

// No new ranked-map blueprints yet; the section is left empty so the UI
// doesn't show maps with no images.
export const RANKED_MAPS = [];

export const ALL_MAPS = [...COMPETITIVE_MAPS, ...RANKED_MAPS];

// New asset names use the *_b/_black naming convention from the upstream
// pack, so we just hard-code each path.
export const MAP_BLUEPRINTS = {
  bank: {
    'Basement':     '/blueprints/game_r6_bank_rework_basement_black_69mIuCZSch.webp',
    'Ground Floor': '/blueprints/game_r6_bank_rework_ground_floor_black_HyQwskDa5h.webp',
    '1st Floor':    '/blueprints/game_r6_bank_rework_top_floor_black_O30qC6KbnM.webp',
  },
  border: {
    'Ground Floor': '/blueprints/game_r6_border_ground_floor_black_Btv0KdCGeF.webp',
    '1st Floor':    '/blueprints/game_r6_map_border_top_floor_black_qzeC58syQb.webp',
  },
  chalet: {
    'Basement':     '/blueprints/game_r6_chalet_rwbasement_b_KV7qAB1tRY.webp',
    'Ground Floor': '/blueprints/game_r6_chalet_rwground_floor_b_jIqhsv1BkV.webp',
    '1st Floor':    '/blueprints/game_r6_chalet_rwtop_floor_b_gXpUkJh1YC.webp',
  },
  clubhouse: {
    'Basement':     '/blueprints/game_r6_clubhouse_basement_b_U1dgunLf7a.webp',
    'Ground Floor': '/blueprints/game_r6_clubhouse_ground_floor_b_XbyN2M07lj.webp',
    '2nd Floor':    '/blueprints/game_r6_clubhouse_top_floor_b_tJp5C7GS2U.webp',
  },
  consulate: {
    'Basement':     '/blueprints/game_r6_consulate_rwbasement_black_IlN1VG0ySz.webp',
    'Ground Floor': '/blueprints/game_r6_consulate_rwground_b_p7WVcdgjJ5.webp',
    '1st Floor':    '/blueprints/game_r6_consulate_rwtop_floor_black_CZhsWe9G2z.webp',
  },
  fortress: {
    'Ground Floor': '/blueprints/game_r6_fortress_black_ground_floor_cr_mljEf6FXz0.webp',
    '1st Floor':    '/blueprints/game_r6_fortress_black_top_floor_cr_mhostxyXD3.webp',
  },
  kafe: {
    'Ground Floor': '/blueprints/game_r6_kafe_ground_floor_b_Ypy9lRiIkg.webp',
    '1st Floor':    '/blueprints/game_r6_kafe_middle_floor_b_js72oR5ncx.webp',
    '2nd Floor':    '/blueprints/game_r6_kafe_top_floor_b_gQhLObBR9t.webp',
  },
  nighthaven: {
    'Basement':     '/blueprints/game_r6_map_nighthaven_basement_black_hekr5H2s1E.webp',
    'Ground Floor': '/blueprints/game_r6_nighthaven_ground_floor_black_tUHybcZRm2.webp',
    '1st Floor':    '/blueprints/game_r6_map_nighthaven_top_floor_black_mrAGnZMJWC.webp',
  },
};
