import React from 'react';

export function ToolPalette({
  tools, activeTool, activeColor, reinforcementCount, rotateOrientation,
  gadgetCategory, gadgets, onSelectTool, onRotateOrientation, onGadgetCategory,
  onGadgetDragStart, onGadgetDragEnd,
}) {
  return <div className="sidebar-section">
    <div className="sidebar-section-title">Tools</div>
    <div className="tool-grid">{tools.map(tool => <button key={tool.id} className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`} onClick={() => onSelectTool(tool.id)} title={tool.label}>
      <span>{tool.emoji}</span><span className="tool-btn-label">{tool.label}</span>
    </button>)}</div>
    {activeTool === 'reinforcement' && <div style={{ marginTop:8, padding:'5px 8px', background:'var(--bg-panel)', borderRadius:4, fontFamily:'var(--font-mono)', fontSize:10, color:reinforcementCount >= 10 ? 'var(--accent-red)' : 'var(--accent-gold)' }}>🧱 {reinforcementCount}/10 · walls/hatches only</div>}
    {activeTool === 'rotate' && <div style={{ marginTop:8, padding:'6px 8px', background:'var(--bg-panel)', borderRadius:4, display:'flex', gap:6, alignItems:'center' }}>
      <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)' }}>Orient:</span>
      {['h', 'v'].map(orientation => <button key={orientation} onClick={() => onRotateOrientation(orientation)} style={{ flex:1, background:rotateOrientation === orientation ? activeColor + '33' : 'var(--bg-surface)', border:`1px solid ${rotateOrientation === orientation ? activeColor : 'var(--border-subtle)'}`, color:rotateOrientation === orientation ? activeColor : 'var(--text-secondary)', borderRadius:3, padding:'3px 8px', cursor:'pointer', fontFamily:'var(--font-display)', fontSize:11, fontWeight:700 }}>{orientation === 'h' ? '↔ H' : '↕ V'}</button>)}
    </div>}
    {activeTool === 'gadget' && <div style={{ marginTop:8 }}>
      <div className="sidebar-section-title" style={{ marginBottom:6 }}>Choose Gadget</div>
      <div style={{ display:'flex', gap:3, marginBottom:6 }}>{[{id:'all',label:'All'},{id:'utility',label:'Utility'},{id:'attack',label:'⚔ ATK'},{id:'defend',label:'🛡 DEF'}].map(category => <button key={category.id} onClick={() => onGadgetCategory(category.id)} style={{ flex:1, background:gadgetCategory === category.id ? activeColor + '33' : 'var(--bg-panel)', border:`1px solid ${gadgetCategory === category.id ? activeColor : 'var(--border-subtle)'}`, color:gadgetCategory === category.id ? activeColor : 'var(--text-secondary)', borderRadius:3, padding:'3px 4px', cursor:'pointer', fontSize:10, fontFamily:'var(--font-display)', fontWeight:700 }}>{category.label}</button>)}</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:4, maxHeight:280, overflowY:'auto' }}>{gadgets.filter(gadget => gadgetCategory === 'all' || gadget.category === gadgetCategory).map(gadget => <div key={gadget.id} draggable title={`${gadget.label} (drag onto the map)`} style={{ aspectRatio:'1', background:'var(--bg-panel)', border:'1px solid var(--border-subtle)', borderRadius:4, padding:3, cursor:'grab', display:'flex', alignItems:'center', justifyContent:'center' }} onDragStart={event => onGadgetDragStart(event, gadget)} onDragEnd={onGadgetDragEnd}>
        <img src={gadget.icon} alt={gadget.label} style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
      </div>)}</div>
      <div style={{ marginTop:6, padding:'4px 8px', background:'rgba(80,232,160,0.08)', border:'1px solid rgba(80,232,160,0.35)', borderRadius:3, fontSize:11, color:'#50E8A0', fontFamily:'var(--font-mono)', lineHeight:1.5 }}>↕ Drag a gadget from the grid onto the map</div>
    </div>}
  </div>;
}
