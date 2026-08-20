import React, { useEffect, useState } from 'react';
import { COMMON_CALLOUTS, MAP_CALLOUTS } from '../../data/callouts';

const STORAGE_KEY = 'clav-callouts-v1';

export function CalloutPanel({ mapId, onPlace }) {
  const [custom, setCustom] = useState(() => {
    try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
  });
  const [value, setValue] = useState('');
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(custom)); } catch {} }, [custom]);
  const add = () => { const name = value.trim().slice(0, 48); if (!name || custom.includes(name)) return; setCustom(previous => [...previous, name]); setValue(''); };
  return <section className="callout-panel" aria-label="Map callouts">
    <div className="sidebar-section-title">CALLOUTS</div>
    <div className="callout-hint">Choose a label, then click the map to place it.</div>
    <div className="callout-list">{[...new Set([...(MAP_CALLOUTS[mapId] || []), ...COMMON_CALLOUTS, ...custom])].map(callout => <button key={callout} onClick={() => onPlace(callout)}>{callout}</button>)}</div>
    <div className="callout-add"><input value={value} onChange={event => setValue(event.target.value)} onKeyDown={event => event.key === 'Enter' && add()} placeholder="Custom callout" /><button onClick={add}>+</button></div>
  </section>;
}
