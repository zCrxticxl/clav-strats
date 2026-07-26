import React from 'react';

export function StylePalette({ activeColor, colors, strokeWidth, onColor, onStrokeWidth }) {
  return <>
    <div className="sidebar-section">
      <div className="sidebar-section-title" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}><span>Color</span><label title="Pick custom color" style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}><span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>CUSTOM</span><div style={{ width:20, height:20, borderRadius:'50%', background:activeColor, border:'2px solid var(--border-accent)', overflow:'hidden', flexShrink:0 }}><input type="color" value={activeColor} onChange={event => onColor(event.target.value)} style={{ opacity:0, width:'200%', height:'200%', cursor:'pointer', marginLeft:'-50%', marginTop:'-50%' }}/></div></label></div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>{colors.map(color => <div key={color} onClick={() => onColor(color)} style={{ width:18, height:18, borderRadius:'50%', background:color, cursor:'pointer', flexShrink:0, border:activeColor === color ? '2px solid white' : '2px solid transparent', boxShadow:activeColor === color ? `0 0 6px ${color}` : 'none', transform:activeColor === color ? 'scale(1.25)' : 'scale(1)', transition:'transform 0.1s' }}/>)}</div>
    </div>
    <div className="sidebar-section"><div className="sidebar-section-title">Stroke width</div><input type="range" min="1" max="10" value={strokeWidth} onChange={event => onStrokeWidth(Number(event.target.value))} className="stroke-slider"/><div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{strokeWidth}px</div></div>
  </>;
}
