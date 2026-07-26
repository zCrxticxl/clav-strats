import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderSpecialEditorElement } from './SpecialElementRenderer';

const handlers = { key: 'item', glow: {}, onClick: jest.fn(), onMouseDown: jest.fn(), onContextMenu: jest.fn() };

test('renders headline and feetline labels with their existing SVG styling', () => {
  const headline = renderToStaticMarkup(renderSpecialEditorElement({ ...handlers, el: { type: 'headline', x: 10, y: 20, color: '#E8B84B' } }));
  const feetline = renderToStaticMarkup(renderSpecialEditorElement({ ...handlers, el: { type: 'feetline', x: 30, y: 40, color: '#4B9CE8' } }));

  expect(headline).toContain('>H</text>');
  expect(headline).toContain('fill="#E8B84B"');
  expect(feetline).toContain('>F</text>');
  expect(feetline).toContain('fill="#4B9CE8"');
});

test('renders the rotation arc, arrowhead and icon with the previous geometry', () => {
  const markup = renderToStaticMarkup(renderSpecialEditorElement({
    ...handlers,
    el: { type: 'rotate', x: 50, y: 60, color: '#50E8A0', horizontal: true },
  }));

  expect(markup).toContain('A 0.45% 0.45% 0 1 1');
  expect(markup).toContain('<polygon');
  expect(markup).toContain('game_r6_rotate_vkme7.webp');
  expect(markup).toContain('stroke="#50E8A0"');
});

test('renders a scalable vertical hole pattern', () => {
  const markup = renderToStaticMarkup(renderSpecialEditorElement({
    ...handlers,
    el: {
      type:'verticalholes', x:50, y:60, color:'#E84B4B',
      scale:1.5, rotation:90,
    },
  }));

  expect(markup).toContain('data-element-type="verticalholes"');
  expect((markup.match(/<circle/g) || [])).toHaveLength(4);
  expect(markup).toContain('rotate(90deg)');
  expect(markup).toContain('stroke="#E84B4B"');
});
