const I = (name) => `/icons/${name}`;

export const GADGETS = {
  frag:           { id: 'frag',           label: 'Frag Grenade',           icon: I('game_r6_grenade_oZvaGDArpb.webp'),                       category: 'utility', count: 2 },
  flashbang:      { id: 'flashbang',      label: 'Stun Grenade',           icon: I('game_r6_flashbang_fZpw9VCsU8.webp'),                    category: 'utility', count: 2 },
  smoke:          { id: 'smoke',          label: 'Smoke Grenade',          icon: I('game_r6_smoke_6892uipVKx.webp'),                       category: 'utility', count: 2 },
  claymore:       { id: 'claymore',       label: 'Claymore',               icon: I('game_r6_gadget_claymore_fee2d.webp'),                  category: 'utility', count: 2 },
  breach_charge:  { id: 'breach_charge',  label: 'Breach Charge',          icon: I('game_r6_breachcharge_T1uh0iBQcb.webp'),                category: 'utility', count: 3 },
  hard_breach:    { id: 'hard_breach',    label: 'Hard Breach Charge',     icon: I('game_r6_hardbreachcharge_im0Re1SIyJ.webp'),            category: 'utility', count: 2 },
  impact_grenade: { id: 'impact_grenade', label: 'Impact Grenade',         icon: I('game_r6_gadget_impactgrenade_79635.webp'),             category: 'utility', count: 2 },
  impact_emp:     { id: 'impact_emp',     label: 'Impact EMP',             icon: I('game_r6_impactemp_TFNXnpbHhS.webp'),                   category: 'utility', count: 2 },
  proximity_mine: { id: 'proximity_mine', label: 'Proximity Mine',         icon: I('game_r6_gadget_proximitymine_966fd.webp'),             category: 'utility', count: 3 },
  nitro_cell:     { id: 'nitro_cell',     label: 'Nitro Cell',             icon: I('R6S_Nitro_Cell.webp'),                                 category: 'utility', count: 1 },
  stun:           { id: 'stun',           label: 'Stun Grenade',           icon: I('game_r6_flashbang_fZpw9VCsU8.webp'),                    category: 'utility', count: 2 },
  barbed_wire:    { id: 'barbed_wire',    label: 'Barbed Wire',            icon: I('game_r6_gadget_barbed_wire_inverted_ObSJo5iz0L.webp'), category: 'utility', count: 2 },
  deploy_shield:  { id: 'deploy_shield',  label: 'Deployable Shield',      icon: I('game_r6_gadget_shield_62709.webp'),                    category: 'utility', count: 1 },
  shield_topdown: { id: 'shield_topdown', label: 'Deployable Shield (TD)', icon: I('game_r6_gadget_shieldtopdown_48f49.webp'),             category: 'utility', count: 1 },
  bp_camera:      { id: 'bp_camera',      label: 'Bulletproof Camera',     icon: I('game_r6_gadget_bulletproofcam_e458d.webp'),            category: 'utility', count: 1 },
  bp_camera_arrow:{ id: 'bp_camera_arrow',label: 'BP Camera Arrow',        icon: I('game_r6_gadget_bulletproofcamarrow_9b4d4.webp'),       category: 'utility', count: 1 },
  candela:        { id: 'candela',        label: 'Candela',                icon: I('game_r6_gadget_candela_invert_NuDgmVdePG.webp'),       category: 'utility', count: 3 },
  barricade:      { id: 'barricade',      label: 'Barricade',              icon: I('game_r6_gadget_barricade_74tfb3.webp'),                category: 'utility', count: 3 },
  reinforcement:  { id: 'reinforcement',  label: 'Reinforcement',          icon: I('game_r6_reinforcement_small_J5FDS2Ieiv.webp'),         category: 'utility', count: 2 },
  cluster_charge: { id: 'cluster_charge', label: 'Cluster Charge',         icon: I('game_r6_cluster__charge_ugh54.webp'),                  category: 'utility', count: 3 },
  trip_wire:      { id: 'trip_wire',      label: 'Trip Wire',              icon: I('game_r6_gadget_trip_connector_white_7456f.webp'),      category: 'utility', count: 3 },
  rotate:         { id: 'rotate',         label: 'Rotate Hole',            icon: I('game_r6_rotate_vkme7.webp'),                           category: 'utility', count: 99 },

  thatcher_emp:   { id: 'thatcher_emp',   label: 'EMP Grenade',            icon: I('game_r6_impactemp_TFNXnpbHhS.webp'),                   category: 'attack', count: 3 },
  ash_breach:     { id: 'ash_breach',     label: 'M120 CREM Breaching',    icon: I('game_r6_cluster__charge_ugh54.webp'),                  category: 'attack', count: 2 },
  thermite_charge:{ id: 'thermite_charge',label: 'Exothermic Charge',      icon: I('game_r6_hardbreachcharge_im0Re1SIyJ.webp'),            category: 'attack', count: 2 },
  fuze_charge:    { id: 'fuze_charge',    label: 'APM-6 Cluster Charge',   icon: I('game_r6_cluster__charge_ugh54.webp'),                  category: 'attack', count: 4 },
  capitao_bow:    { id: 'capitao_bow',    label: 'Tactical Crossbow',      icon: I('game_r6_capitao_firebolt_pofk4.webp'),                 category: 'attack', count: 4 },
  ying_candela:   { id: 'ying_candela',   label: 'Candela',                icon: I('game_r6_gadget_candela_invert_NuDgmVdePG.webp'),       category: 'attack', count: 4 },
  nomad_airjab:   { id: 'nomad_airjab',   label: 'Airjab Launcher',        icon: I('game_r6_gadget_nomad_cae9d.webp'),                     category: 'attack', count: 3 },
  gridlock_trax:  { id: 'gridlock_trax',  label: 'Trax Stinger',           icon: I('game_r6_ability_trax_stingers_fyBlqEOxjW.webp'),       category: 'attack', count: 4 },
  osa_talon:      { id: 'osa_talon',      label: 'Talon-8 Clear Shield',   icon: I('game_r6_gadget_osa_0b0a2.webp'),                       category: 'attack', count: 2 },
  sens_roumat:    { id: 'sens_roumat',    label: 'R.O.U. Projector',       icon: I('game_r6_gadget_sens_bd015.webp'),                      category: 'attack', count: 3 },
  grim_kawan:     { id: 'grim_kawan',     label: 'Kawan Hive Launcher',    icon: I('game_r6_gadget_grim_7591d.webp'),                      category: 'attack', count: 5 },
  brava_kludge:   { id: 'brava_kludge',   label: 'Kludge Drone',           icon: I('game_r6_kludge_drone_l5043.webp'),                     category: 'attack', count: 2 },
  rauora_skopos:  { id: 'rauora_skopos',  label: 'D.O.M. Panel Launcher',  icon: I('game_r6_gadget_rauora_jggh6.webp'),                    category: 'attack', count: 3, placement: 'opening' },
  zero_argus:     { id: 'zero_argus',     label: 'Argus Camera',           icon: I('game_r6_gadget_zero_9a2a9.webp'),                      category: 'attack', count: 4 },

  smoke_gas:      { id: 'smoke_gas',      label: 'Remote Gas Grenade',     icon: I('game_r6_gadget_smoke_68439.webp'),                     category: 'defend', count: 3 },
  mute_jam:       { id: 'mute_jam',       label: 'Signal Disruptor',       icon: I('game_r6_gadget_mute_efb71.webp'),                      category: 'defend', count: 4 },
  castle_panel:   { id: 'castle_panel',   label: 'Armor Panel',            icon: I('game_r6_gadget_castle_96542.webp'),                    category: 'defend', count: 4, placement: 'opening' },
  jager_ads:      { id: 'jager_ads',      label: 'ADS-MK IV "Magpie"',     icon: I('game_r6_gadget_jager_341b0.webp'),                     category: 'defend', count: 3 },
  bandit_shock:   { id: 'bandit_shock',   label: 'CED-1 Shock Wire',       icon: I('game_r6_gadget_bandit_20d5b.webp'),                    category: 'defend', count: 4 },
  frost_mat:      { id: 'frost_mat',      label: 'Welcome Mat',            icon: I('game_r6_gadget_frost_36a76.webp'),                     category: 'defend', count: 3 },
  valk_cam:       { id: 'valk_cam',       label: 'Black Eye Camera',       icon: I('game_r6_gadget_valkyrie_d00b0.webp'),                  category: 'defend', count: 3 },
  echo_yokai:     { id: 'echo_yokai',     label: 'Yokai Drone',            icon: I('game_r6_gadget_echo_39ec6.webp'),                      category: 'defend', count: 3 },
  kapkan_edd:     { id: 'kapkan_edd',     label: 'EDD Mk II Tripwire',     icon: I('game_r6_gadget_kapkan_8cc2f.webp'),                    category: 'defend', count: 5, placement: 'opening' },
  ela_grzmot:     { id: 'ela_grzmot',     label: 'Grzmot Mine',            icon: I('game_r6_gadget_ela_8bb48.webp'),                       category: 'defend', count: 3 },
  maestro_evil:   { id: 'maestro_evil',   label: 'Evil Eye Camera',        icon: I('game_r6_gadget_maestro_f44fd.webp'),                   category: 'defend', count: 2 },
  alibi_prisma:   { id: 'alibi_prisma',   label: 'Prisma Hologram',        icon: I('game_r6_gadget_alibi_56129.webp'),                     category: 'defend', count: 3 },
  mozzie_pest:    { id: 'mozzie_pest',    label: 'Pest Drone Hijacker',    icon: I('game_r6_gadget_mozzie_a35b5.webp'),                    category: 'defend', count: 3 },
  goyo_volcan:    { id: 'goyo_volcan',    label: 'Volcán Shield',          icon: I('game_r6_gadget_goyo_canister_2PB84eNdAJ.webp'),        category: 'defend', count: 4 },
  wamai_magnet:   { id: 'wamai_magnet',   label: 'Mag-NET System',         icon: I('game_r6_gadget_wamai_e4f89.webp'),                     category: 'defend', count: 6 },
  melusi_banshee: { id: 'melusi_banshee', label: 'Banshee Sonic Defense',  icon: I('game_r6_gadget_melusibanshee_98baf.webp'),             category: 'defend', count: 3 },
  aruni_gate:     { id: 'aruni_gate',     label: 'Surya Gate',             icon: I('game_r6_gadget_arunigate_245c3.webp'),                 category: 'defend', count: 3, placement: 'opening' },
  thunder_kona:   { id: 'thunder_kona',   label: 'Kona Station',           icon: I('game_r6_konastation_djxe3.webp'),                      category: 'defend', count: 3 },
  thorn_razor:    { id: 'thorn_razor',    label: 'Razorbloom Shell',       icon: I('game_r6_gadget_thorn_72c2b.webp'),                     category: 'defend', count: 3 },
  azami_kiba:     { id: 'azami_kiba',     label: 'Kiba Barrier',           icon: I('game_r6_gadget_azami_db3fc.webp'),                     category: 'defend', count: 5 },
  azami_topdown:  { id: 'azami_topdown',  label: 'Kiba Barrier (TD)',      icon: I('game_r6_gadget_azamitopdown_85e9d.webp'),              category: 'defend', count: 5 },
  fenrir_dread:   { id: 'fenrir_dread',   label: 'F-NATT Dread Mine',      icon: I('game_r6_f_natt_spaxr.webp'),                           category: 'defend', count: 5 },
  tubarao_zoto:   { id: 'tubarao_zoto',   label: 'Zoto Canister',          icon: I('game_r6_gadget_toxicbabe_ccc99.webp'),                 category: 'defend', count: 4 },
  toxicbabe_smoke:{ id: 'toxicbabe_smoke',label: 'Toxic Babe Smoke',       icon: I('game_r6_gadget_toxicbabesmoke_26376.webp'),            category: 'defend', count: 3 },
  mira_mirror:    { id: 'mira_mirror',    label: 'Black Mirror',           icon: I('game_r6_gadget_mira_fe9df.webp'),                      category: 'defend', count: 2 },
  lesion_gu:      { id: 'lesion_gu',      label: 'Gu Mine',                icon: I('game_r6_gadget_lesion_26865.webp'),                    category: 'defend', count: 8 },
  kaid_electro:   { id: 'kaid_electro',   label: 'Rtila Electroclaw',      icon: I('game_r6_gadget_kaid_74809.webp'),                      category: 'defend', count: 2 },
  thunderbird_kona:{id:'thunderbird_kona',label: 'Kona Healing Station',   icon: I('game_r6_gadget_thunderbird_a6794.webp'),               category: 'defend', count: 3 },
  observation_blocker:{id:'observation_blocker',label:'Observation Blocker',icon: I('R6S_Observation_Blocker.webp'),                       category: 'defend', count: 3 },
  tachanka_shumikha:  {id:'tachanka_shumikha',  label:'Shumikha Launcher', icon: I('game_r6_gadget_smoke_68439.webp'),                    category: 'defend', count: 10 },
  skopos_pantheon:    {id:'skopos_pantheon',     label:'V10 Pantheon Shells',icon: I('game_r6_gadget_thorn_72c2b.webp'),                   category: 'defend', count: 2 },
};

export const GADGET_ICONS = Object.fromEntries(
  Object.entries(GADGETS).map(([k, v]) => [k, v.icon])
);

export const ALL_GADGETS = Object.values(GADGETS);

export const PLAYER_COLORS = [
  '#E8B84B',
  '#4B9CE8',
  '#50E8A0',
  '#E84B4B',
  '#B04BE8',
];

export const EXTENDED_COLORS = [
  // Golds / Oranges
  '#E8B84B', '#F0C860', '#FFD700', '#E8A020',
  '#E8734B', '#FF6B35', '#FF8C00', '#CC5500',
  // Reds / Pinks
  '#E84B4B', '#FF2222', '#FF4F8B', '#FF1493',
  '#D14BB0', '#C2185B', '#FF69B4', '#E91E63',
  // Purples / Blues
  '#B04BE8', '#7B5BE8', '#6A0DAD', '#9C27B0',
  '#4B6FE8', '#1565C0', '#4B9CE8', '#29B6F6',
  // Cyans / Greens
  '#4BC9E8', '#00BCD4', '#4BE8D1', '#00E5FF',
  '#50E8A0', '#00E676', '#7CE85B', '#76FF03',
  // Yellow-greens / Neutrals
  '#C6E84B', '#CDDC39', '#F9F900', '#FFFFFF',
  '#B0B8C4', '#888888', '#5A6678', '#2D3748',
];

export const ROLES = [
  'Hard Breach', 'Support', 'Intel', 'Flank', 'Roam',
  'Anchor', 'Trap', 'Area Denial', 'Shield', 'Entry Frag',
];
