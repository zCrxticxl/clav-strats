import React from 'react';

export function HistoryActions({ history }) {
  return <><button className="topbar-btn" onClick={history.undo} disabled={!history.canUndo} title="Undo (Ctrl+Z)" style={{ opacity: history.canUndo ? 1 : 0.4, cursor: history.canUndo ? 'pointer' : 'not-allowed' }}>↶</button><button className="topbar-btn" onClick={history.redo} disabled={!history.canRedo} title="Redo (Ctrl+Shift+Z)" style={{ opacity: history.canRedo ? 1 : 0.4, cursor: history.canRedo ? 'pointer' : 'not-allowed' }}>↷</button></>;
}
