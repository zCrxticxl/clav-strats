import React, { useEffect, useRef, useState } from 'react';
import { ALL_MAPS } from '../../data/maps';

export function MapPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = ALL_MAPS.find(map => map.id === value);

  useEffect(() => {
    const closeOutside = event => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, []);

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button className="topbar-btn" onClick={() => setOpen(value => !value)} style={{
        display:'flex', alignItems:'center', gap:8, minWidth:160,
        borderColor:open ? 'var(--accent-gold)' : value ? 'rgba(232,184,75,0.4)' : 'rgba(232,75,75,0.5)',
        color:value ? 'var(--accent-gold)' : '#ff8080', fontWeight:600, fontSize:12,
        letterSpacing:1, background:value ? 'rgba(232,184,75,0.06)' : 'rgba(232,75,75,0.06)',
      }}>
        {current?.preview && <img src={current.preview} alt="" style={{ width:28, height:18, objectFit:'cover', borderRadius:2, opacity:0.85 }}/>} {/* map preview */}
        <span>{current ? current.name : '⚠ SELECT MAP'}</span>
        <span style={{ marginLeft:'auto', opacity:0.5 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{
        position:'absolute', top:'100%', left:0, zIndex:999, marginTop:4, background:'var(--bg-deep)',
        border:'1px solid var(--border-accent)', borderRadius:8, padding:10, width:340,
        display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, boxShadow:'0 8px 32px rgba(0,0,0,0.6)',
      }}>
        <div style={{ gridColumn:'1/-1', fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:2, color:'var(--text-muted)', paddingBottom:4 }}>COMPETITIVE</div>
        {ALL_MAPS.filter(map => map.type === 'competitive').map(map => <button key={map.id}
          onClick={() => { onChange(map.id); setOpen(false); }}
          style={{
            display:'flex', alignItems:'center', gap:8, padding:'6px 8px',
            background:value === map.id ? 'rgba(232,184,75,0.12)' : 'rgba(255,255,255,0.03)',
            border:`1px solid ${value === map.id ? 'rgba(232,184,75,0.4)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius:6, cursor:'pointer', textAlign:'left', color:value === map.id ? 'var(--accent-gold)' : 'var(--text-primary)',
            fontSize:12, fontWeight:value === map.id ? 700 : 400, transition:'all 0.1s',
          }}
          onMouseEnter={event => { event.currentTarget.style.background = 'rgba(232,184,75,0.08)'; }}
          onMouseLeave={event => { event.currentTarget.style.background = value === map.id ? 'rgba(232,184,75,0.12)' : 'rgba(255,255,255,0.03)'; }}>
          {map.preview && <img src={map.preview} alt="" style={{ width:36, height:24, objectFit:'cover', borderRadius:3, flexShrink:0 }}/>} {/* map preview */}
          <span>{map.name}</span>
        </button>)}
      </div>}
    </div>
  );
}
