import { buildFloorSVG } from './exportPng';

test('buildFloorSVG keeps the border for gadgets and rotate markers on non-active floors', () => {
  const svg = buildFloorSVG(1000, 800, [
    { type: 'gadget', x: 30, y: 40, color: '#abc', gadget: { icon: '/icon.png' } },
    { type: 'rotate', x: 50, y: 60, color: '#def' },
  ]);

  expect(svg).toContain('stroke="#abc"');
  expect(svg).toContain('stroke="#def"');
  expect(svg).toContain('game_r6_rotate');
});

test('buildFloorSVG shows the connector for wall-attached gadgets', () => {
  const svg = buildFloorSVG(1000, 800, [{
    type:'gadget', wallId:'wall-1', x:52, y:40, anchorX:50, anchorY:40,
    color:'#50E8A0', gadget:{ icon:'/camera.png' },
  }]);
  expect(svg).toContain('x1="50%"');
  expect(svg).toContain('x2="53.35%"');
  expect(svg).not.toContain('<circle cx="50%"');
});

test('buildFloorSVG includes vertical holes on non-active floors', () => {
  const svg = buildFloorSVG(1000, 800, [{
    type:'verticalholes', x:45, y:55, color:'#E84B4B', scale:1.5, rotation:90,
  }]);

  expect((svg.match(/<circle/g) || [])).toHaveLength(4);
  expect(svg).toContain('rotate(90deg)');
  expect(svg).toContain('stroke="#E84B4B"');
});
