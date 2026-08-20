import { DEFENDERS } from './operators';

test('uses the official Denari entry instead of the invalid Deadbolt entry', () => {
  const denari = DEFENDERS.find(operator => operator.id === 'denari');

  expect(denari).toMatchObject({
    name:'Denari',
    role:'Area Denial',
    gadget:{ id:'trip_wire', label:'T.R.I.P. Connector', count:7 },
  });
  expect(DEFENDERS.some(operator => operator.id === 'deadbolt')).toBe(false);
  expect(DEFENDERS.some(operator => operator.name === 'Deadlock')).toBe(false);
});

test('keeps the corrected Melusi and Wamai loadouts', () => {
  const melusi = DEFENDERS.find(operator => operator.id === 'melusi');
  const wamai = DEFENDERS.find(operator => operator.id === 'wamai');

  expect(melusi.gadget).toMatchObject({ id: 'melusi_banshee', count: 4 });
  expect(wamai.secondaries.map(gadget => gadget.id)).toEqual(['proximity_mine', 'nitro_cell', 'deploy_shield']);
  expect(wamai.secondaries.some(gadget => gadget.id === 'impact_grenade')).toBe(false);
});
