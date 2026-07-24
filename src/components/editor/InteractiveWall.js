import { useState } from 'react';
import { GADGETS } from '../../data/gadgets';

export const WALL_COLORS = {
  wall: '#E8B84B',
  hatch: '#E87B4B',
  door: '#4B9CE8',
  window: '#4B9CE8', // same as door — treated as one type
  softwall: '#B04BE8',
};

// Derived automatically from gadgets with placement: 'opening'
export const OPENING_GADGETS = new Set(
  Object.values(GADGETS).filter(g => g.placement === 'opening').map(g => g.id)
);

export function InteractiveWall({ w, activeTool, activeColor, elements, setElements, reinforceCount, showToast, selectedFloor, selectedMap, onHoverChange, pendingGadget, imgAspect }) {
  const existing = elements.find(e => e.wallId === w.id);
  const [hovered, setHovered] = useState(false);

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // always try to remove — filter is idempotent; keep same ref if nothing matched
    setElements(prev => {
      const next = prev.filter(el => el.wallId !== w.id);
      return next.length === prev.length ? prev : next;
    });
  };

  const handleClick = (e) => {
    e.stopPropagation();

    if (activeTool === 'eraser' && existing) {
      setElements(prev => prev.filter(el => el.wallId !== w.id));
      return;
    }
    if (activeTool === 'reinforcement' && (w.type === 'wall' || w.type === 'hatch')) {
      if (existing?.type === 'reinforcement') {
        setElements(prev => prev.map(el => el.wallId === w.id ? { ...el, horizontal: !el.horizontal } : el));
        return;
      }
      if (reinforceCount >= 10) { showToast('Max 10 Reinforcements!'); return; }
      setElements(prev => {
        const filtered = prev.filter(el => el.wallId !== w.id);
        return [...filtered, {
          id: Date.now(), type: 'reinforcement', wallId: w.id,
          x: w.x, y: w.y, w: w.w, h: w.h,
          color: activeColor,
          horizontal: w.horizontal !== undefined ? w.horizontal : false,
          floor: selectedFloor, mapId: selectedMap,
        }];
      });
      return;
    }
    if (pendingIsOpeningGadget && isOpening && pendingGadget) {
      const gadgetEl = elements.find(e => e.wallId === w.id && e.type === 'gadget');
      if (gadgetEl) {
        // Remove existing gadget on this opening
        setElements(prev => prev.filter(el => el.wallId !== w.id || el.type !== 'gadget'));
      } else {
        setElements(prev => [...prev, {
          id: Date.now(), type: 'gadget', wallId: w.id,
          gadget: pendingGadget, x: w.x, y: w.y,
          color: activeColor, floor: selectedFloor, mapId: selectedMap,
        }]);
      }
      return;
    }
    if (activeTool === 'barricade' && isOpening) {
      if (existing?.type === 'barricade') {
        if (existing.color === activeColor) {
          setElements(prev => prev.filter(el => el.wallId !== w.id));
        } else {
          setElements(prev => prev.map(el => el.wallId === w.id ? { ...el, color: activeColor } : el));
        }
        return;
      }
      setElements(prev => {
        const filtered = prev.filter(el => el.wallId !== w.id);
        return [...filtered, {
          id: Date.now(), type: 'barricade', wallId: w.id,
          x: w.x, y: w.y, w: w.w, h: w.h,
          color: activeColor, floor: selectedFloor, mapId: selectedMap,
        }];
      });
    }
  };

  const baseColor  = WALL_COLORS[w.type] || '#888';
  const hasReinforce = existing?.type === 'reinforcement';
  const hasBarricade = existing?.type === 'barricade';
  const isHatch = w.type === 'hatch';
  const isWall  = w.type === 'wall';
  const isDoor  = w.type === 'door';
  const isWin   = w.type === 'window';
  const isSoft  = w.type === 'softwall';
  const gadgetOnOpening = (isDoor || isWin) ? elements.find(e => e.wallId === w.id && e.type === 'gadget') : null;

  const isOpening = isDoor || isWin;
  const pendingIsOpeningGadget = activeTool === 'gadget' && pendingGadget?.placement === 'opening';
  const canInteract =
    (activeTool === 'reinforcement' && (isWall || isHatch)) ||
    (activeTool === 'barricade'     && isOpening)           ||
    (pendingIsOpeningGadget         && isOpening)           ||
    activeTool === 'eraser';

  const hoverStyle = {
    cursor: canInteract ? 'pointer' : 'default',
    ...(canInteract && hovered ? { filter: `drop-shadow(0 0 4px ${activeColor})` } : {}),
  };

  const wallW    = w.w != null ? w.w : (w.horizontal ? 2.0 : 0.35);
  const wallH    = w.h != null ? w.h : (w.horizontal ? 0.35 : 2.0);
  const hatchSz  = w.w != null && w.h != null ? Math.max(w.w, w.h) : 2.0;
  // Doors: scale with map aspect ratio so they look correct in screen pixels.
  // 1% x-width ≠ 1% y-height on non-square maps; compensate so a door appears ~2:1 (tall:wide).
  const ar       = imgAspect || 1.5;
  const doorW    = w.horizontal ? (2.0 / ar) : 1.0;
  const doorH    = w.horizontal ? 1.0 : (2.0 * ar);

  return (
    <g
      onClick={canInteract ? handleClick : undefined}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => { onHoverChange?.(w.id); setHovered(true); }}
      onMouseLeave={() => { onHoverChange?.(null); setHovered(false); }}
      style={hoverStyle}>
      {/* Wall / softwall */}
      {(isWall || isSoft) && (() => {
        const pid = `wallp-${w.id}`;
        return (
          <>
            {hasReinforce && isWall && (
              <defs>
                <pattern id={pid} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="5" height="5" fill={baseColor}/>
                  <rect width="2.5" height="5" fill="rgba(0,0,0,0.5)"/>
                </pattern>
              </defs>
            )}
            {hasReinforce && (
              <rect
                x={`${w.x - wallW/2}%`} y={`${w.y - wallH/2}%`}
                width={`${wallW}%`} height={`${wallH}%`}
                fill={`url(#${pid})`}
                stroke={existing.color}
                strokeWidth="1.5"
                strokeDasharray={isSoft ? '3 2' : undefined}
                rx="0.4"
              />
            )}
            {hasReinforce && (
              <rect
                x={`${w.x - wallW/2}%`} y={`${w.y - wallH/2}%`}
                width={`${wallW}%`} height={`${wallH}%`}
                fill={existing.color + '55'} rx="0.4"
                style={{ pointerEvents: 'none' }}
              />
            )}
            {/* Invisible click target — slightly larger than visual for usability */}
            <rect
              x={`${w.x - Math.max(wallW, 0.8)/2}%`} y={`${w.y - Math.max(wallH, 0.8)/2}%`}
              width={`${Math.max(wallW, 0.8)}%`} height={`${Math.max(wallH, 0.8)}%`}
              fill="transparent"
            />
          </>
        );
      })()}

      {/* Hatch */}
      {isHatch && (() => {
        const s   = hatchSz;
        const pid = `hatchp-${w.id}`;
        const clickSz = Math.max(s, 0.8); // minimal padding for clickability
        return (
          <>
            <defs>
              <pattern id={pid} width="10" height="6" patternUnits="userSpaceOnUse">
                <rect width="10" height="6" fill={baseColor}/>
                <rect width="10" height="3" fill="rgba(0,0,0,0.5)"/>
              </pattern>
            </defs>
            {/* Always-visible hatch outline (dim when not reinforced) */}
            <rect
              x={`${w.x - s/2}%`} y={`${w.y - s/2}%`}
              width={`${s}%`} height={`${s}%`}
              fill={hasReinforce ? `url(#${pid})` : baseColor + '18'}
              stroke={hasReinforce ? existing.color : baseColor}
              strokeWidth={hasReinforce ? '1.5' : '1'}
              strokeDasharray={hasReinforce ? undefined : '2 1.5'}
              rx="0.3"
            />
            {/* H label */}
            {!hasReinforce && (
              <text x={`${w.x}%`} y={`${w.y + 0.35}%`}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="24" fontFamily="Arial,sans-serif" fontWeight="900"
                fill={baseColor} stroke="rgba(0,0,0,0.8)" strokeWidth="1.5" paintOrder="stroke"
                style={{ pointerEvents: 'none', userSelect: 'none' }}>H</text>
            )}
            {/* Larger click target */}
            <rect
              x={`${w.x - clickSz/2}%`} y={`${w.y - clickSz/2}%`}
              width={`${clickSz}%`} height={`${clickSz}%`}
              fill="transparent"
            />
            {hasReinforce && (
              <rect
                x={`${w.x - s/2}%`} y={`${w.y - s/2}%`}
                width={`${s}%`} height={`${s}%`}
                fill={existing.color + '55'}
                style={{ pointerEvents: 'none' }}
              />
            )}
          </>
        );
      })()}

      {/* Door / Window — only render when something placed OR tool can interact */}
      {isOpening && (hasBarricade || gadgetOnOpening || canInteract) && (() => {
        // Use actual door dims; only apply a small minimum so tiny detections stay clickable
        const bw = doorW * 1.05;
        const bh = doorH * 1.05;
        const ow = hasBarricade ? bw : Math.max(doorW, 1.0);
        const oh = hasBarricade ? bh : Math.max(doorH, 1.0);
        return (
          <>
            {hasBarricade && (() => {
              const pid = `barricp-${w.id}`;
              return (
                <>
                  <defs>
                    <pattern id={pid} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <rect width="3" height="6" fill={existing.color + 'CC'}/>
                    </pattern>
                  </defs>
                  <rect
                    x={`${w.x - bw/2}%`} y={`${w.y - bh/2}%`}
                    width={`${bw}%`} height={`${bh}%`}
                    fill={`url(#${pid})`}
                    rx="0.3"
                    style={{ pointerEvents: 'none' }}
                  />
                  <text
                    x={`${w.x}%`} y={`${w.y + 0.3}%`}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize="22" fontFamily="Arial,sans-serif" fontWeight="900"
                    fill={existing.color} stroke="rgba(0,0,0,0.8)" strokeWidth="1.5" paintOrder="stroke"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>B</text>
                </>
              );
            })()}
            {!hasBarricade && canInteract && (
              <rect
                x={`${w.x - ow/2}%`} y={`${w.y - oh/2}%`}
                width={`${ow}%`} height={`${oh}%`}
                fill={baseColor + '18'}
                stroke={baseColor}
                strokeWidth="0.8"
                strokeDasharray="2 1.5"
                rx="0.3"
              />
            )}
            {/* Opening gadget */}
            {gadgetOnOpening && gadgetOnOpening.gadget?.icon && (
              <image
                href={gadgetOnOpening.gadget.icon}
                x={`${w.x - 1.2}%`} y={`${w.y - 1.2}%`} width="2.4%" height="2.4%"
                style={{ pointerEvents: 'none' }}
              />
            )}
            {/* Transparent click target */}
            <rect
              x={`${w.x - Math.max(ow, 1.2)/2}%`} y={`${w.y - Math.max(oh, 1.2)/2}%`}
              width={`${Math.max(ow, 1.2)}%`} height={`${Math.max(oh, 1.2)}%`}
              fill="transparent"
            />
          </>
        );
      })()}

      {/* Reinforce label */}
      {hasReinforce && (
        <text
          x={`${w.x}%`} y={`${w.y + 0.35}%`}
          textAnchor="middle" dominantBaseline="middle"
          fontSize="24" fontFamily="Arial,sans-serif" fontWeight="900"
          fill={existing.color} stroke="rgba(0,0,0,0.8)" strokeWidth="1.5" paintOrder="stroke"
          style={{ pointerEvents: 'none', userSelect: 'none' }}>R</text>
      )}


    </g>
  );
}
