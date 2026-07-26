import React from 'react';

export function renderSpecialEditorElement({ el, key, glow, onClick, onMouseDown, onContextMenu }) {
  if (!['rotate', 'headline', 'feetline', 'verticalholes'].includes(el.type)) return undefined;
  const color = el.color;
  if (el.type === 'verticalholes') {
    const scale = el.scale || 1;
    const width = 2.2 * scale;
    const height = 5.2 * scale;
    const radius = 0.42 * scale;
    const rotation = el.rotation || 0;
    const rotationStyle = rotation
      ? { transform:`rotate(${rotation}deg)`, transformOrigin:'center', transformBox:'fill-box' }
      : {};
    return <g
      key={key}
      data-element-type="verticalholes"
      style={{ ...glow, ...rotationStyle }}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
    >
      <rect
        x={`${el.x - width / 2}%`}
        y={`${el.y - height / 2}%`}
        width={`${width}%`}
        height={`${height}%`}
        rx={`${width * 0.35}%`}
        fill="rgba(8,10,14,0.82)"
        stroke={color}
        strokeWidth="1.4"
        strokeDasharray="2 1"
        style={{ cursor:'pointer' }}
      />
      {[-1.5, -0.5, 0.5, 1.5].map(offset => (
        <circle
          key={offset}
          cx={`${el.x}%`}
          cy={`${el.y + offset * scale}%`}
          r={`${radius}%`}
          fill="rgba(0,0,0,0.95)"
          stroke={color}
          strokeWidth="1"
          style={{ pointerEvents:'none' }}
        />
      ))}
    </g>;
  }
  if (el.type === 'headline' || el.type === 'feetline') {
    const label = el.type === 'headline' ? 'H' : 'F';
    return <g key={key} style={glow} onClick={onClick} onMouseDown={onMouseDown} onContextMenu={onContextMenu}>
      <circle cx={`${el.x}%`} cy={`${el.y}%`} r="1.2%" fill="transparent" style={{ cursor: 'pointer' }}/>
      <text x={`${el.x}%`} y={`${el.y}%`} textAnchor="middle" dominantBaseline="middle" fontSize="24" fontFamily="Arial,sans-serif" fontWeight="900" fill={color} stroke="rgba(0,0,0,0.8)" strokeWidth="1.5" paintOrder="stroke" style={{ pointerEvents: 'none', userSelect: 'none' }}>{label}</text>
    </g>;
  }
  const scale = el.scale || 1;
  const horizontal = el.horizontal !== false;
  const width = el.w != null ? el.w * scale : (horizontal ? 4.5 : 0.9) * scale;
  const height = el.h != null ? el.h * scale : (horizontal ? 0.9 : 4.5) * scale;
  const radius = Math.min(width, height) / 2;
  const start = -Math.PI / 2;
  const end = start + Math.PI * 1.55;
  const startX = el.x + radius * Math.cos(start);
  const startY = el.y + radius * Math.sin(start);
  const endX = el.x + radius * Math.cos(end);
  const endY = el.y + radius * Math.sin(end);
  const tangentX = -Math.sin(end);
  const tangentY = Math.cos(end);
  const arrowSize = radius * 0.35;
  return <g key={key} style={glow} onClick={onClick} onMouseDown={onMouseDown} onContextMenu={onContextMenu}>
    <circle cx={`${el.x}%`} cy={`${el.y}%`} r={`${radius + 0.3}%`} fill="transparent" style={{ cursor: 'pointer' }}/>
    <path d={`M ${startX}% ${startY}% A ${radius}% ${radius}% 0 1 1 ${endX}% ${endY}%`} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" style={{ pointerEvents: 'none' }}/>
    <polygon points={`${endX}%,${endY}% ${endX - (tangentX * arrowSize + tangentY * arrowSize * 0.5)}%,${endY - (tangentY * arrowSize - tangentX * arrowSize * 0.5)}% ${endX - (tangentX * arrowSize - tangentY * arrowSize * 0.5)}%,${endY - (tangentY * arrowSize + tangentX * arrowSize * 0.5)}%`} fill={color} style={{ pointerEvents: 'none' }}/>
    <circle cx={`${el.x}%`} cy={`${el.y}%`} r="1.5%" fill={color + '33'} stroke={color} strokeWidth="0.8" style={{ pointerEvents: 'none' }}/>
    <image href="/icons/game_r6_rotate_vkme7.webp" x={`${el.x - 2}%`} y={`${el.y - 2}%`} width="4%" height="4%" preserveAspectRatio="xMidYMid meet" style={{ pointerEvents: 'none' }}/>
  </g>;
}
