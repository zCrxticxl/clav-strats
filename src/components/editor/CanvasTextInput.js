import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export function CanvasTextInput({ clientX, clientY, value, color, onChange, onSubmit, onCancel }) {
  const finishedRef = useRef(false);
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const submitOnce = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onSubmit(value);
  };
  const cancelOnce = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onCancel();
  };

  const viewportWidth = window.innerWidth || 1000;
  const viewportHeight = window.innerHeight || 700;
  const left = Math.min(Math.max(clientX ?? viewportWidth / 2, 170), Math.max(170, viewportWidth - 170));
  const top = Math.min(Math.max(clientY ?? viewportHeight / 2, 90), Math.max(90, viewportHeight - 90));

  return createPortal(
    <div role="dialog" aria-label="Text platzieren"
      onMouseDown={event => event.stopPropagation()}
      onMouseUp={event => event.stopPropagation()}
      onClick={event => event.stopPropagation()}
      onDoubleClick={event => event.stopPropagation()}
      onContextMenu={event => event.stopPropagation()}
      style={{
        position:'fixed', left, top, transform:'translate(-50%,-50%)', zIndex:10000,
        width:300, padding:12, borderRadius:7,
        background:'rgba(8,10,14,0.98)', border:`1px solid ${color}`,
        boxShadow:`0 8px 32px rgba(0,0,0,0.65), 0 0 0 1px ${color}44`,
      }}>
      <div style={{ color, fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, marginBottom:8 }}>
        Text platzieren
      </div>
      <input ref={inputRef} value={value} onChange={event => onChange(event.target.value)}
        onKeyDown={event => {
          event.stopPropagation();
          if (event.key === 'Enter') { event.preventDefault(); submitOnce(); }
          if (event.key === 'Escape') { event.preventDefault(); cancelOnce(); }
        }}
        style={{
          boxSizing:'border-box', width:'100%', background:'var(--bg-panel)',
          border:`1px solid ${color}`, color, fontFamily:'var(--font-mono)',
          fontSize:14, padding:'8px 10px', borderRadius:4, outline:'none',
        }}
        placeholder="Text eingeben..."/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginTop:9 }}>
        <span style={{ color:'var(--text-muted)', fontFamily:'var(--font-mono)', fontSize:9 }}>
          Enter = hinzufügen · Esc = abbrechen
        </span>
        <div style={{ display:'flex', gap:6 }}>
          <button type="button" onClick={cancelOnce}
            style={{ padding:'5px 8px', borderRadius:4, cursor:'pointer', background:'var(--bg-panel)', border:'1px solid var(--border-subtle)', color:'var(--text-secondary)' }}>
            Abbrechen
          </button>
          <button type="button" onClick={submitOnce}
            style={{ padding:'5px 8px', borderRadius:4, cursor:'pointer', background:color, border:`1px solid ${color}`, color:'#080a0e', fontWeight:700 }}>
            Hinzufügen
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
