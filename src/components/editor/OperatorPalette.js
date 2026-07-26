import React from 'react';
import { OpIcon } from './OpIcons';

export function OperatorPalette({ activeTool, activeColor, side, search, operators, pendingOperator, onSearch, onOperatorMouseDown }) {
  return <>
    <div className="sidebar-section" style={{ flex:1 }}><div className="sidebar-section-title">Operators — {side === 'attack' ? '⚔ ATK' : '🛡 DEF'}</div><input className="op-search" placeholder="Search operator..." value={search} onChange={event => onSearch(event.target.value)}/><div className="op-list">{operators.map(operator => <div key={operator.id} className="op-item" draggable={false} style={{ cursor:'grab', userSelect:'none', background:pendingOperator?.id === operator.id ? activeColor + '22' : undefined, border:pendingOperator?.id === operator.id ? `1px solid ${activeColor}55` : undefined }} title="Drag onto the map" onDragStart={event => event.preventDefault()} onMouseDown={event => onOperatorMouseDown(event, operator)}><OpIcon op={operator} color={activeColor}/><div className="op-info"><div className="op-name">{operator.name}</div><div className="op-role">{operator.role}</div></div></div>)}</div></div>
    {activeTool === 'operator' && <div className="sidebar-section" style={{ background:'rgba(80,232,160,0.08)', borderColor:'rgba(80,232,160,0.35)' }}><div style={{ fontSize:11, color:'#50E8A0', fontFamily:'var(--font-mono)', lineHeight:1.5 }}>↕ Drag operator cards from the list onto the map</div></div>}
    {activeTool === 'route' && <div className="sidebar-section" style={{ background:'rgba(232,184,75,0.08)', borderColor:'rgba(232,184,75,0.35)' }}><div style={{ fontSize:11, color:'var(--accent-gold)', fontFamily:'var(--font-mono)', lineHeight:1.6 }}>Click to set waypoints · Double-click or Enter to finish · Backspace = undo point · Esc = cancel</div></div>}
  </>;
}
