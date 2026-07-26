import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { InteractiveWall } from './InteractiveWall';

global.IS_REACT_ACT_ENVIRONMENT = true;

const wall = { id:'wall-1', type:'wall', x:40, y:30, w:4, h:0.7, horizontal:true };
const baseProps = {
  w:wall,
  activeColor:'#4B9CE8',
  reinforceCount:0,
  showToast:jest.fn(),
  selectedFloor:'1F',
  selectedMap:'bank',
  onHoverChange:jest.fn(),
  pendingGadget:null,
  imgAspect:1.5,
};

test('renders an empty interactive wall without a runtime error', () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(
    <svg>
      <InteractiveWall {...baseProps} activeTool="select" elements={[]} setElements={() => {}}/>
    </svg>
  ));
  expect(container.querySelector('g')).not.toBeNull();
  act(() => root.unmount());
});

test('clicking the offset gadget recolors only that gadget', () => {
  let elements = [
    { id:'reinforcement-1', type:'reinforcement', wallId:wall.id, color:'#E8B84B' },
    {
      id:'gadget-1', type:'gadget', wallId:wall.id, color:'#E8B84B',
      gadget:{ id:'breach_charge', icon:'breach.webp' },
    },
  ];
  const setElements = updater => {
    elements = typeof updater === 'function' ? updater(elements) : updater;
  };
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(
    <svg>
      <InteractiveWall {...baseProps} activeTool="select" elements={elements} setElements={setElements}/>
    </svg>
  ));

  act(() => container.querySelector('[data-gadget-hitbox="true"]')
    .dispatchEvent(new MouseEvent('click', { bubbles:true })));

  expect(elements.find(element => element.id === 'gadget-1').color).toBe('#4B9CE8');
  expect(elements.find(element => element.id === 'reinforcement-1').color).toBe('#E8B84B');
  act(() => root.unmount());
});

test('renders multiple wall gadgets without an anchor dot and keeps each selectable', () => {
  const onSelectElement = jest.fn();
  const elements = [
    { id:'reinforcement-1', type:'reinforcement', wallId:wall.id, color:'#E8B84B' },
    {
      id:'gadget-1', type:'gadget', wallId:wall.id, color:'#4B9CE8',
      attachmentSlot:0, attachmentSide:-1,
      gadget:{ id:'mira_mirror', icon:'mira.webp' },
    },
    {
      id:'gadget-2', type:'gadget', wallId:wall.id, color:'#4B9CE8',
      attachmentSlot:1, attachmentSide:1, rotation:90,
      gadget:{ id:'aruni_gate', icon:'aruni.webp' },
    },
  ];
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(
    <svg>
      <InteractiveWall
        {...baseProps}
        activeTool="select"
        elements={elements}
        setElements={() => {}}
        selectedIds={['gadget-2']}
        onSelectElement={onSelectElement}
      />
    </svg>
  ));

  const hitboxes = container.querySelectorAll('[data-gadget-hitbox="true"]');
  expect(hitboxes).toHaveLength(2);
  expect(container.querySelector('circle')).toBeNull();
  expect([...container.querySelectorAll('text')].some(node => node.textContent === 'R')).toBe(true);
  expect(container.querySelector('image[href="aruni.webp"]').style.transform).toBe('rotate(90deg)');

  act(() => hitboxes[1].dispatchEvent(new MouseEvent('click', { bubbles:true })));
  expect(onSelectElement).toHaveBeenCalledWith('gadget-2', false);
  act(() => root.unmount());
});
