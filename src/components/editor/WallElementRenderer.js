import React from 'react';

export function renderWallEditorElement({ el, key, glow, onClick, onMouseDown, onContextMenu }) {
  if (el.type === 'reinforcement') {
    if (el.wallId) return null;
    const scale = el.scale || 1;
    const width = (el.w != null ? el.w : (el.horizontal ? 3.0 : 0.65)) * scale;
    const height = (el.h != null ? el.h : (el.horizontal ? 0.65 : 3.0)) * scale;
    const x = el.x - width / 2;
    const y = el.y - height / 2;
    const patternId = `rp-${key}`;
    const isHatch = el.w != null && el.h != null && Math.abs(el.w - el.h) < el.w * 0.5;
    return (
      <g key={key} style={glow} onClick={onClick} onMouseDown={onMouseDown} onContextMenu={onContextMenu}>
        <defs>{isHatch ? <pattern id={patternId} width="10" height="6" patternUnits="userSpaceOnUse"><rect width="10" height="6" fill={el.color}/><rect width="10" height="3" fill="rgba(0,0,0,0.55)"/></pattern> : <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill={el.color}/><rect width="3" height="6" fill="rgba(0,0,0,0.55)"/></pattern>}</defs>
        <rect x={`${x}%`} y={`${y}%`} width={`${width}%`} height={`${height}%`} fill={`url(#${patternId})`} stroke={el.color} strokeWidth="1.5" rx="0.5" style={{ cursor: 'pointer' }}/>
        <text x={`${el.x}%`} y={`${el.y + 0.35}%`} textAnchor="middle" dominantBaseline="middle" fontSize="24" fontFamily="Arial,sans-serif" fontWeight="900" fill={el.color} stroke="rgba(0,0,0,0.8)" strokeWidth="1.5" paintOrder="stroke" style={{ pointerEvents: 'none', userSelect: 'none' }}>R</text>
      </g>
    );
  }
  if (el.type === 'barricade') {
    if (el.wallId) return null;
    const scale = el.scale || 1;
    const width = (el.w != null ? Math.max(el.w, 1.0) : 1.2) * scale;
    const height = (el.h != null ? Math.max(el.h, 1.0) : 2.4) * scale;
    const patternId = `barr-${el.id}`;
    return (
      <g key={key} style={glow} onClick={onClick} onMouseDown={onMouseDown} onContextMenu={onContextMenu}>
        <defs><pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="6" fill={el.color + 'CC'}/></pattern></defs>
        <rect x={`${el.x - width / 2}%`} y={`${el.y - height / 2}%`} width={`${width}%`} height={`${height}%`} fill={`url(#${patternId})`} rx="0.3" style={{ cursor: 'pointer' }}/>
        <text x={`${el.x}%`} y={`${el.y + 0.3}%`} textAnchor="middle" dominantBaseline="middle" fontSize="22" fontFamily="Arial,sans-serif" fontWeight="900" fill={el.color} stroke="rgba(0,0,0,0.8)" strokeWidth="1.5" paintOrder="stroke" style={{ pointerEvents: 'none', userSelect: 'none' }}>B</text>
      </g>
    );
  }
  return undefined;
}
