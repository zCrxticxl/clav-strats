import { useState } from 'react';
import {
  ATTACHED_GADGET_SIZE, getAttachedGadgetPosition, getDefaultAttachmentSide,
  markerSupportsGadget, upsertAttachedGadget,
} from '../../utils/gadgetPlacement';
import { recolorElements } from '../../utils/elementColor';

export const WALL_COLORS = {
  wall: '#E8B84B',
  hatch: '#E87B4B',
  door: '#4B9CE8',
  window: '#4B9CE8', // same as door — treated as one type
  softwall: '#B04BE8',
};

export function InteractiveWall({
  w, activeTool, activeColor, elements, setElements, reinforceCount, showToast,
  selectedFloor, selectedMap, onHoverChange, pendingGadget, imgAspect,
  selectedIds = [], onSelectElement,
}) {
  const reinforcementOnMarker = elements.find(e => e.wallId === w.id && e.type === 'reinforcement');
  const barricadeOnMarker = elements.find(e => e.wallId === w.id && e.type === 'barricade');
  const gadgetsOnMarker = elements.filter(e => e.wallId === w.id && e.type === 'gadget');
  const gadgetOnMarker = gadgetsOnMarker[0];
  const clickedElement = reinforcementOnMarker || barricadeOnMarker || gadgetOnMarker;
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

    if (activeTool === 'select' && clickedElement?.color && clickedElement.color !== activeColor) {
      setElements(prev => recolorElements(prev, [clickedElement.id], activeColor));
      return;
    }

    if (activeTool === 'eraser' && clickedElement) {
      setElements(prev => prev.filter(el => el.wallId !== w.id));
      return;
    }
    if (activeTool === 'reinforcement' && (w.type === 'wall' || w.type === 'hatch')) {
      if (reinforcementOnMarker) {
        // Different color → reassign to that player. Same color → toggle orientation.
        if (reinforcementOnMarker.color !== activeColor) {
          setElements(prev => prev.map(el => el.wallId === w.id && el.type === 'reinforcement' ? { ...el, color: activeColor } : el));
        } else {
          setElements(prev => prev.map(el => el.wallId === w.id && el.type === 'reinforcement' ? { ...el, horizontal: !el.horizontal } : el));
        }
        return;
      }
      if (reinforceCount >= 10) { showToast('Max 10 Reinforcements!'); return; }
      setElements(prev => {
        const filtered = prev.filter(el => !(el.wallId === w.id && el.type === 'reinforcement'));
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
    if (pendingCanAttach && pendingGadget) {
      setElements(prev => upsertAttachedGadget(prev, w, pendingGadget, activeColor, {
        floor:selectedFloor, mapId:selectedMap,
      }));
      return;
    }
    if (activeTool === 'barricade' && isOpening) {
      if (barricadeOnMarker) {
        if (barricadeOnMarker.color === activeColor) {
          setElements(prev => prev.filter(el => !(el.wallId === w.id && el.type === 'barricade')));
        } else {
          setElements(prev => prev.map(el => el.wallId === w.id && el.type === 'barricade' ? { ...el, color: activeColor } : el));
        }
        return;
      }
      setElements(prev => {
        const filtered = prev.filter(el => !(el.wallId === w.id && el.type === 'barricade'));
        return [...filtered, {
          id: Date.now(), type: 'barricade', wallId: w.id,
          x: w.x, y: w.y, w: w.w, h: w.h,
          color: activeColor, floor: selectedFloor, mapId: selectedMap,
        }];
      });
    }
  };

  const baseColor  = WALL_COLORS[w.type] || '#888';
  const hasReinforce = !!reinforcementOnMarker;
  const hasBarricade = !!barricadeOnMarker;
  const isHatch = w.type === 'hatch';
  const isWall  = w.type === 'wall';
  const isDoor  = w.type === 'door';
  const isWin   = w.type === 'window';
  const isSoft  = w.type === 'softwall';
  const gadgetOnOpening = (isDoor || isWin) ? gadgetsOnMarker.length > 0 : false;

  const isOpening = isDoor || isWin;
  const pendingCanAttach = activeTool === 'gadget' && markerSupportsGadget(pendingGadget, w);
  const canInteract =
    (activeTool === 'reinforcement' && (isWall || isHatch)) ||
    (activeTool === 'barricade'     && isOpening)           ||
    pendingCanAttach                                       ||
    (activeTool === 'select' && !!clickedElement) ||
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
  const doorW    = w.horizontal ? (3.4 / ar) : 1.6;
  const doorH    = w.horizontal ? 1.6 : (3.4 * ar);
  const attachedSlotSpacingScale = Math.max(1, ...gadgetsOnMarker.map(element => element.scale || 1));
  const handleGadgetClick = (e, gadgetElement) => {
    if (!gadgetElement) return;
    if (activeTool === 'eraser') {
      e.stopPropagation();
      setElements(prev => prev.filter(el => el.id !== gadgetElement.id));
      return;
    }
    if (gadgetElement.color !== activeColor) {
      e.stopPropagation();
      setElements(prev => recolorElements(prev, [gadgetElement.id], activeColor));
      onSelectElement?.(gadgetElement.id, false);
      return;
    }
    if (pendingCanAttach && pendingGadget) {
      e.stopPropagation();
      setElements(prev => upsertAttachedGadget(prev, w, pendingGadget, activeColor, {
        floor:selectedFloor, mapId:selectedMap,
      }));
      return;
    }
    if (activeTool === 'select') {
      e.stopPropagation();
      onSelectElement?.(gadgetElement.id, e.shiftKey);
    }
  };

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
                stroke={reinforcementOnMarker.color}
                strokeWidth="1.5"
                strokeDasharray={isSoft ? '3 2' : undefined}
                rx="0.4"
              />
            )}
            {hasReinforce && (
              <rect
                x={`${w.x - wallW/2}%`} y={`${w.y - wallH/2}%`}
                width={`${wallW}%`} height={`${wallH}%`}
                fill={reinforcementOnMarker.color + '55'} rx="0.4"
                style={{ pointerEvents: 'none' }}
              />
            )}
            {/* Invisible click target — slightly larger than visual for usability */}
            <rect
              x={`${w.x - Math.max(wallW, 0.8)/2}%`} y={`${w.y - Math.max(wallH, 0.8)/2}%`}
              width={`${Math.max(wallW, 0.8)}%`} height={`${Math.max(wallH, 0.8)}%`}
              fill="transparent"
            />
            {pendingCanAttach && <rect
              x={`${w.x - Math.max(wallW, 0.8)/2}%`} y={`${w.y - Math.max(wallH, 0.8)/2}%`}
              width={`${Math.max(wallW, 0.8)}%`} height={`${Math.max(wallH, 0.8)}%`}
              fill={activeColor + '22'} stroke={activeColor} strokeWidth="1.2" strokeDasharray="2 1"
              style={{ pointerEvents:'none' }}
            />}
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
              stroke={hasReinforce ? reinforcementOnMarker.color : baseColor}
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
                fill={reinforcementOnMarker.color + '55'}
                style={{ pointerEvents: 'none' }}
              />
            )}
          </>
        );
      })()}

      {/* Door / Window — only render when something placed OR tool can interact */}
      {isOpening && (hasBarricade || gadgetOnOpening || canInteract) && (() => {
        // Use actual door dims; only apply a small minimum so tiny detections stay clickable
        const bw = doorW * 1.1;
        const bh = doorH * 1.1;
        const ow = hasBarricade ? bw : Math.max(doorW, 1.6);
        const oh = hasBarricade ? bh : Math.max(doorH, 1.6);
        return (
          <>
            {hasBarricade && (() => {
              const pid = `barricp-${w.id}`;
              return (
                <>
                  <defs>
                    <pattern id={pid} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <rect width="3" height="6" fill={barricadeOnMarker.color + 'CC'}/>
                    </pattern>
                  </defs>
                  <rect
                    x={`${w.x - bw/2}%`} y={`${w.y - bh/2}%`}
                    width={`${bw}%`} height={`${bh}%`}
                    fill={`url(#${pid})`}
                    stroke={barricadeOnMarker.color}
                    strokeWidth="1.5"
                    rx="0.3"
                    style={{ pointerEvents: 'none' }}
                  />
                  <rect
                    x={`${w.x - bw/2}%`} y={`${w.y - bh/2}%`}
                    width={`${bw}%`} height={`${bh}%`}
                    fill={barricadeOnMarker.color + '44'} rx="0.3"
                    style={{ pointerEvents: 'none' }}
                  />
                  <text
                    x={`${w.x}%`} y={`${w.y + 0.3}%`}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize="22" fontFamily="Arial,sans-serif" fontWeight="900"
                    fill={barricadeOnMarker.color} stroke="rgba(0,0,0,0.8)" strokeWidth="1.5" paintOrder="stroke"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>B</text>
                </>
              );
            })()}
            {!hasBarricade && canInteract && (
              <rect
                x={`${w.x - ow/2}%`} y={`${w.y - oh/2}%`}
                width={`${ow}%`} height={`${oh}%`}
                fill={baseColor + '2E'}
                stroke={baseColor}
                strokeWidth="1.6"
                strokeDasharray="2.5 1.5"
                rx="0.3"
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

      {gadgetsOnMarker.map((gadgetElement, index) => {
        if (!gadgetElement.gadget?.icon) return null;
        const slot = gadgetElement.attachmentSlot ?? index;
        const side = gadgetElement.attachmentSide ?? getDefaultAttachmentSide(w);
        const scale = gadgetElement.scale || 1;
        const size = ATTACHED_GADGET_SIZE * scale;
        const half = size / 2;
        const imageInset = size * 0.04;
        const position = getAttachedGadgetPosition(w, {
          slot, side, scale, slotSpacingScale:attachedSlotSpacingScale,
        });
        const selected = selectedIds.includes(gadgetElement.id);
        return <g key={gadgetElement.id}>
          <line x1={`${w.x}%`} y1={`${w.y}%`} x2={`${position.x}%`} y2={`${position.y}%`}
            stroke={gadgetElement.color} strokeWidth="1.1" strokeDasharray="2 1.2"
            strokeLinecap="round" style={{ pointerEvents:'none' }}/>
          <rect x={`${position.x - half}%`} y={`${position.y - half}%`}
            width={`${size}%`} height={`${size}%`}
            fill="rgba(8,10,14,0.92)" stroke={selected ? '#fff' : gadgetElement.color}
            strokeWidth={selected ? '1.8' : '1.2'} rx="0.45"
            style={{ pointerEvents:'none', filter:selected ? `drop-shadow(0 0 4px ${gadgetElement.color})` : undefined }}/>
          <image href={gadgetElement.gadget.icon}
            x={`${position.x - half + imageInset}%`} y={`${position.y - half + imageInset}%`}
            width={`${size - imageInset * 2}%`} height={`${size - imageInset * 2}%`}
            style={{
              pointerEvents:'none',
              transform:`rotate(${gadgetElement.rotation || 0}deg)`,
              transformOrigin:'center', transformBox:'fill-box',
            }}/>
          <rect x={`${position.x - half - 0.25}%`} y={`${position.y - half - 0.25}%`}
            width={`${size + 0.5}%`} height={`${size + 0.5}%`}
            fill="transparent" data-gadget-hitbox="true" data-gadget-id={gadgetElement.id}
            onClick={e => handleGadgetClick(e, gadgetElement)}
            onContextMenu={e => {
              e.preventDefault();
              e.stopPropagation();
              setElements(prev => prev.filter(element => element.id !== gadgetElement.id));
            }}/>
        </g>;
      })}

      {/* Keep the label above connector lines so the wall remains readable. */}
      {hasReinforce && (
        <text
          x={`${w.x}%`} y={`${w.y + 0.35}%`}
          textAnchor="middle" dominantBaseline="middle"
          fontSize="24" fontFamily="Arial,sans-serif" fontWeight="900"
          fill={reinforcementOnMarker.color} stroke="rgba(0,0,0,0.8)" strokeWidth="1.5" paintOrder="stroke"
          style={{ pointerEvents: 'none', userSelect: 'none' }}>R</text>
      )}


    </g>
  );
}
