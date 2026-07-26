import React from 'react';

export function renderGadgetElement({ el, preview, key, glow, onClick, onMouseDown, onContextMenu, hoveredElIdRef }) {
  if (el.type !== 'gadget') return undefined;
  if (el.wallId) return null;
  const size = 3.4 * (el.scale || 1);
  const padding = size * 0.1;
  const rotation = el.rotation || 0;
  const rotationStyle = rotation ? { transform: `rotate(${rotation}deg)`, transformOrigin: '50% 50%', transformBox: 'fill-box' } : {};
  return (
    <g key={key} style={{ ...glow, ...rotationStyle }} onClick={onClick} onMouseDown={onMouseDown} onContextMenu={onContextMenu}
      onMouseEnter={preview ? undefined : () => { hoveredElIdRef.current = el.id; }}
      onMouseLeave={preview ? undefined : () => { hoveredElIdRef.current = null; }}>
      <rect x={`${el.x - size / 2}%`} y={`${el.y - size / 2}%`} width={`${size}%`} height={`${size}%`} fill="rgba(8,10,14,0.85)" stroke={el.color} strokeWidth="1.5" rx="0.6" style={{ cursor: 'pointer' }}/>
      {el.gadget?.icon && <image href={el.gadget.icon} x={`${el.x - size / 2 + padding}%`} y={`${el.y - size / 2 + padding}%`} width={`${size - padding * 2}%`} height={`${size - padding * 2}%`} style={{ pointerEvents: 'none' }}/>} {/* gadget icon */}
    </g>
  );
}
