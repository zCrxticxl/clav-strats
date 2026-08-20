import { recolorElements } from './elementColor';

test('changes a regular element color without adding or replacing elements', () => {
  const elements = [{ id:1, type:'text', color:'#old' }, { id:2, type:'text', color:'#keep' }];
  const result = recolorElements(elements, [1], '#selected');
  expect(result).toHaveLength(2);
  expect(result[0]).toMatchObject({ id:1, type:'text', color:'#selected' });
  expect(result[1]).toBe(elements[1]);
});

test('does not recolor owner-locked gadgets', () => {
  const gadget = { id:1, type:'gadget', gadget:{ id:'camera' }, color:'#old' };
  expect(recolorElements([gadget], [1], '#selected')).toEqual([gadget]);
});
