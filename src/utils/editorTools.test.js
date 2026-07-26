import { getEditorCursor } from './editorTools';

test('getEditorCursor reflects the active editor tool', () => {
  expect(getEditorCursor('select')).toBe('default');
  expect(getEditorCursor('operator', { id: 'ash' })).toBe('copy');
  expect(getEditorCursor('rotate')).toBe('cell');
  expect(getEditorCursor('verticalholes')).toBe('cell');
});
