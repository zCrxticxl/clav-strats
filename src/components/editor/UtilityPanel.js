import React from 'react';

export function UtilityPanel({ lineup, gadgetCounts }) {
  return <section className="utility-panel" aria-label="Utility accounting">
    <div className="sidebar-section-title">UTILITY <span className="task-count">live counts</span></div>
    {lineup.map(player => {
      const gadgets = [player.operator?.gadget, player.secondaryGadget].filter(Boolean);
      if (!gadgets.length) return null;
      return <div className="utility-player" key={player.slotId}>
        <div className="utility-player-name" style={{ color: player.color }}>{player.name}</div>
        {gadgets.map(gadget => {
          const used = gadgetCounts[`${player.slotId}:${gadget.id}`] || 0;
          const total = gadget.count ?? 99;
          return <div className="utility-row" key={gadget.id} title={`${gadget.label}: ${total - used} remaining`}>
            <img src={gadget.icon} alt="" />
            <span>{gadget.label}</span>
            <b>{total >= 99 ? '∞' : `${Math.max(0, total - used)}/${total}`}</b>
          </div>;
        })}
      </div>;
    })}
    {!lineup.some(player => player.operator?.gadget || player.secondaryGadget) && <div className="timeline-empty">Choose operators to track utility.</div>}
  </section>;
}
