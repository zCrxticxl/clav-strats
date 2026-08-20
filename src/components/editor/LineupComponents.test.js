import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { LineupStrip } from './LineupComponents';

global.IS_REACT_ACT_ENVIRONMENT = true;

test('opens a lineup card on one click without bubbling gadget interaction', () => {
  const onEdit = jest.fn();
  const onSelectPlayer = jest.fn();
  const onDragGadget = jest.fn();
  const onPointerDragGadget = jest.fn();
  const container = document.createElement('div');
  const root = createRoot(container);
  const lineup = [{
    name: 'Entry', color: '#E8B84B', slotId: 'player-slot-1', role: '',
    operator: { id: 'ash', name: 'Ash', role: 'Entry', icon: '/ash.png', gadget: { id: 'frag', label: 'Frag Grenade', icon: '/frag.png', count: 2 } },
    gadget: { id: 'frag', label: 'Frag Grenade', icon: '/frag.png', count: 2 },
    secondaryGadget: null,
  }];

  act(() => root.render(<LineupStrip lineup={lineup} side="attack" onEdit={onEdit} onDragGadget={onDragGadget} onPointerDragGadget={onPointerDragGadget} onSelectPlayer={onSelectPlayer} />));
  const card = container.querySelector('.lineup-strip-card');
  act(() => card.click());
  expect(onEdit).not.toHaveBeenCalled();
  expect(onSelectPlayer).toHaveBeenCalledTimes(1);

  const edit = container.querySelector('.lineup-strip-edit');
  act(() => edit.click());
  expect(onEdit).toHaveBeenCalledTimes(1);

  const gadget = container.querySelector('.lineup-strip-gadget');
  const pointerDown = new Event('pointerdown', { bubbles: true });
  Object.defineProperties(pointerDown, { button: { value: 0 }, pointerId: { value: 7 } });
  act(() => gadget.dispatchEvent(pointerDown));
  expect(onPointerDragGadget).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 'frag' }), '#E8B84B', 'player-slot-1');
  act(() => gadget.click());
  expect(onEdit).toHaveBeenCalledTimes(1);
  act(() => gadget.dispatchEvent(new Event('dragend', { bubbles: true })));
  expect(onDragGadget).toHaveBeenLastCalledWith(null, null);

  act(() => root.unmount());
});

test('exposes a pointer drag source for lineup gadgets', () => {
  const onPointerDragGadget = jest.fn();
  const container = document.createElement('div');
  const root = createRoot(container);
  const gadget = { id: 'frag', label: 'Frag Grenade', icon: '/frag.png', count: 2 };
  const lineup = [{
    name: 'Entry', color: '#E8B84B', slotId: 'player-slot-1', role: '',
    operator: { id: 'ash', name: 'Ash', role: 'Entry', icon: '/ash.png', gadget },
  }];

  act(() => root.render(<LineupStrip lineup={lineup} side="attack" onEdit={() => {}} onPointerDragGadget={onPointerDragGadget} />));
  const source = container.querySelector('.lineup-strip-gadget');
  const event = new Event('pointerdown', { bubbles: true });
  Object.defineProperties(event, { button: { value: 0 }, pointerId: { value: 11 } });
  act(() => source.dispatchEvent(event));

  expect(onPointerDragGadget).toHaveBeenCalledWith(expect.anything(), gadget, '#E8B84B', 'player-slot-1');
  expect(source.draggable).toBe(false);
  act(() => root.unmount());
});
