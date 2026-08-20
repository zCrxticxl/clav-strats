import React, { useMemo, useState } from 'react';
import { normalizeTasks } from '../../utils/tasks';
import { createElementId } from '../../utils/elementId';

export function TaskPanel({ tasks, onChange, lineup, phases = [] }) {
  const normalized = normalizeTasks(tasks);
  const [title, setTitle] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [phaseId, setPhaseId] = useState('');
  const openTasks = useMemo(() => normalized.filter(task => task.status !== 'done'), [normalized]);
  const addTask = () => {
    if (!title.trim()) return;
    onChange([...normalized, { id: createElementId(), title: title.trim(), ownerId: ownerId || null, phaseId: phaseId || null, status: 'open' }]);
    setTitle('');
  };
  const updateTask = (id, patch) => onChange(normalized.map(task => task.id === id ? { ...task, ...patch } : task));
  return (
    <section className="task-panel" aria-label="Strategy tasks">
      <div className="sidebar-section-title">TASKS <span className="task-count">{openTasks.length} open</span></div>
      <div className="task-add">
        <input value={title} onChange={event => setTitle(event.target.value)} onKeyDown={event => event.key === 'Enter' && addTask()} placeholder="e.g. Reinforce server wall" />
        <select value={ownerId} onChange={event => setOwnerId(event.target.value)}><option value="">Assign player...</option>{lineup.map(player => <option key={player.slotId} value={player.slotId}>{player.name}</option>)}</select>
        <select value={phaseId} onChange={event => setPhaseId(event.target.value)}><option value="">Any phase</option>{phases.map(phase => <option key={phase.id} value={phase.id}>{phase.name}</option>)}</select>
        <button className="topbar-btn save" onClick={addTask}>+ Add task</button>
      </div>
      <div className="task-list">
        {normalized.map(task => {
          const owner = lineup.find(player => player.slotId === task.ownerId);
          const phase = phases.find(item => item.id === task.phaseId);
          return <div className={`task-row ${task.status === 'done' ? 'done' : ''}`} key={task.id}>
            <input type="checkbox" checked={task.status === 'done'} onChange={event => updateTask(task.id, { status: event.target.checked ? 'done' : 'open' })} />
            <div className="task-row-main"><span>{task.title}</span><small style={{ color: owner?.color }}>{owner?.name || 'Unassigned'}{phase ? ` · ${phase.name}` : ''}</small></div>
            <button onClick={() => onChange(normalized.filter(item => item.id !== task.id))} aria-label={`Delete ${task.title}`}>×</button>
          </div>;
        })}
        {!normalized.length && <div className="timeline-empty">Assign work to players and phases.</div>}
      </div>
    </section>
  );
}
