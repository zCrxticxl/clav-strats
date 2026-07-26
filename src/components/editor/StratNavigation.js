import React from 'react';

export function StratNavigation({ stratName, onNameChange, mapPicker, selectedMap, stratId, strats, onOpenStrat, onNewStrat }) {
  const mapStrats = selectedMap ? strats.filter(strat => strat.mapId === selectedMap) : [];
  return (
    <>
      <input className="topbar-input" value={stratName} onChange={event => onNameChange(event.target.value)} placeholder="Strat name..."/>
      {mapPicker}
      {selectedMap && mapStrats.length > 0 && (
        <select className="topbar-select" value={stratId || ''} style={{ maxWidth:160 }}
          onChange={event => event.target.value ? onOpenStrat(event.target.value) : onNewStrat()}>
          <option value="">+ New Strat</option>
          {mapStrats.map(strat => <option key={strat.id} value={strat.id}>{strat.name}</option>)}
        </select>
      )}
    </>
  );
}
