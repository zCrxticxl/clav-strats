import React from 'react';

export function renderBasicEditorElement({ el, preview, key, glow, onClick, onMouseDown, onContextMenu }) {
  if (el.type === 'arrow') {
    const markerId = `arr-${key}`;
    return (
      <g key={key} style={glow} onClick={onClick} onMouseDown={onMouseDown} onContextMenu={onContextMenu}>
        <defs><marker id={markerId} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill={el.color}/></marker></defs>
        <line x1={`${el.x1}%`} y1={`${el.y1}%`} x2={`${el.x2}%`} y2={`${el.y2}%`} stroke={el.color} strokeWidth={el.width || 3} strokeLinecap="round" markerEnd={`url(#${markerId})`} style={{ cursor: 'pointer' }}/>
        <line x1={`${el.x1}%`} y1={`${el.y1}%`} x2={`${el.x2}%`} y2={`${el.y2}%`} stroke="transparent" strokeWidth={16} style={{ cursor: 'pointer' }}/>
      </g>
    );
  }
  if (el.type === 'route') {
    const points = el.points || [{ x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 }];
    const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x}% ${point.y}%`).join(' ');
    return (
      <g key={key} style={glow} onClick={onClick} onMouseDown={onMouseDown} onContextMenu={onContextMenu}>
        <path d={path} stroke={el.color} strokeWidth={el.width || 3} strokeDasharray="5 3" strokeLinecap="round" fill="none" style={{ cursor: 'pointer' }}/>
        <path d={path} stroke="transparent" strokeWidth={14} fill="none" style={{ cursor: 'pointer' }}/>
      </g>
    );
  }
  if (el.type === 'zone') {
    const x = Math.min(el.x1, el.x2);
    const y = Math.min(el.y1, el.y2);
    const width = Math.abs(el.x2 - el.x1);
    const height = Math.abs(el.y2 - el.y1);
    return <rect key={key} x={`${x}%`} y={`${y}%`} width={`${Math.max(width, 0.3)}%`} height={`${Math.max(height, 0.2)}%`} stroke={el.color} strokeWidth={el.width || 2} fill={el.color + '22'} rx="0.3" style={{ cursor: 'pointer', ...glow }} onClick={onClick} onMouseDown={onMouseDown} onContextMenu={onContextMenu}/>;
  }
  if (el.type === 'text') {
    return <text key={key} x={`${el.x}%`} y={`${el.y}%`} fill={el.color} fontSize="14" fontFamily="'Share Tech Mono',monospace" style={{ userSelect: 'none', cursor: 'pointer', ...glow }} onClick={onClick} onMouseDown={onMouseDown}>{el.text}</text>;
  }
  return null;
}
