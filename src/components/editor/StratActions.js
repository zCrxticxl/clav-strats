import React from 'react';

export function StratActions({ description, onNew, onDuplicate, onEditNote, onSave }) {
  return (
    <>
      <button className="topbar-btn" onClick={onNew} title="New empty strat">＋ New</button>
      <button className="topbar-btn" title="Duplicate strat" onClick={onDuplicate}>⧉ Copy</button>
      <button
        className="topbar-btn"
        title={description || 'Add a note'}
        style={{
          borderColor: description ? 'rgba(232,184,75,0.5)' : undefined,
          color: description ? 'var(--accent-gold)' : undefined,
        }}
        onClick={onEditNote}
      >
        📝 {description ? 'Note ✓' : 'Note'}
      </button>
      <button className="topbar-btn save" onClick={onSave}>💾 Save</button>
    </>
  );
}
