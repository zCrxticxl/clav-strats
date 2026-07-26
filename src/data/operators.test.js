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
