import { recolorElements } from './elementColor';

test('changes the clicked element color without adding or replacing elements', () => {
  const elements = [{ id:1, type:'gadget', gadget:{ id:'camera' }, color:'#old' }, { id:2, type:'text', color:'#keep' }];
  const result = recolorElements(elements, [1], '#selected');
  expect(result).toHaveLength(2);
  expect(result[0]).toMatchObject({ id:1, type:'gadget', gadget:{ id:'camera' }, color:'#selected' });
  expect(result[1]).toBe(elements[1]);
});
