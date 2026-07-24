import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStrats } from '../hooks/useStrats';
import { ALL_MAPS } from '../data/maps';

const getMap = (mapId) => ALL_MAPS.find(m => m.id === mapId);

export default function LibraryPage() {
  const { strats, deleteStrat, saveStrat, importStrats } = useStrats();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const handleExport = () => {
    const payload = { app: 'clav-strats', version: 1, exportedAt: new Date().toISOString(), strats };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clav-strats-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const list = Array.isArray(parsed) ? parsed : parsed.strats;
        const stats = importStrats(list);
        window.alert(`Import: ${stats.added} added, ${stats.updated} updated, ${stats.skipped} skipped.`);
      } catch (err) {
        window.alert(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };
  const [filterMap,  setFilterMap]  = useState('all');
  const [filterSide, setFilterSide] = useState('all');
  const [search,     setSearch]     = useState('');
  const [sortBy,     setSortBy]     = useState('newest');

  const filtered = strats
    .filter(s => {
      if (filterMap  !== 'all' && s.mapId !== filterMap)  return false;
      if (filterSide !== 'all' && s.side  !== filterSide) return false;
      if (search && !s.name?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.updatedAt) - new Date(a.updatedAt);
      if (sortBy === 'oldest') return new Date(a.updatedAt) - new Date(b.updatedAt);
      if (sortBy === 'name')   return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'map')    return (a.mapId || '').localeCompare(b.mapId || '');
      return 0;
    });

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (window.confirm('Delete this strat?')) deleteStrat(id);
  };

  const handleDuplicate = (e, strat) => {
    e.stopPropagation();
    const copy = {
      ...JSON.parse(JSON.stringify(strat)),
      id: undefined,
      name: `${strat.name || 'Strat'} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const saved = saveStrat(copy);
    navigate(`/editor/${saved.id}`);
  };

  const getLineupPlayers = (strat) => {
    if (!strat.mapId) return [];
    const key = `${strat.mapId}:${strat.side || 'attack'}`;
    const players = strat.lineupsByContext?.[key] || strat.lineup || [];
    return players.filter(p => p.operator);
  };

  return (
    <div className="library-page">
      <div className="library-header">
        <div>
          <h1 className="library-title">Strat Library</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            {strats.length} strat{strats.length !== 1 ? 's' : ''} saved
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="filter-btn" onClick={handleExport} disabled={strats.length === 0} title="Save all strats as a JSON backup">⬇ Export</button>
          <button className="filter-btn" onClick={() => fileInputRef.current?.click()} title="Import strats from a JSON backup">⬆ Import</button>
          <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleImport} style={{ display: 'none' }} />
          <Link to="/editor" className="btn-primary">+ New Strat</Link>
        </div>
      </div>

      {/* Search + Sort */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          className="op-search"
          style={{ flex: 1, minWidth: 200, fontSize: 14, padding: '8px 14px' }}
          placeholder="Search strats..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1 }}>SORT:</span>
          {[
            { id: 'newest', label: 'Newest' },
            { id: 'oldest', label: 'Oldest' },
            { id: 'name',   label: 'Name' },
            { id: 'map',    label: 'Map' },
          ].map(s => (
            <button key={s.id}
              className={`filter-btn ${sortBy === s.id ? 'active' : ''}`}
              onClick={() => setSortBy(s.id)}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Map Filter */}
      <div className="library-filters">
        <span className="filter-label">MAP:</span>
        <button className={`filter-btn ${filterMap === 'all' ? 'active' : ''}`} onClick={() => setFilterMap('all')}>All</button>
        {ALL_MAPS.map(m => (
          <button key={m.id} className={`filter-btn ${filterMap === m.id ? 'active' : ''}`} onClick={() => setFilterMap(m.id)}>
            {m.preview && <img src={m.preview} alt="" style={{ width: 18, height: 12, objectFit: 'cover', borderRadius: 2, marginRight: 5, verticalAlign: 'middle' }} />}
            {m.name}
          </button>
        ))}
      </div>

      {/* Side Filter */}
      <div className="library-filters">
        <span className="filter-label">SIDE:</span>
        {[
          { id: 'all',    label: 'Both' },
          { id: 'attack', label: '⚔ Attack' },
          { id: 'defend', label: '🛡 Defense' },
        ].map(s => (
          <button key={s.id} className={`filter-btn ${filterSide === s.id ? 'active' : ''}`} onClick={() => setFilterSide(s.id)}>{s.label}</button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No strats found</h3>
          <p style={{ marginBottom: 24 }}>
            {strats.length === 0 ? 'Create your first strat to get started.' : 'Try adjusting your filters.'}
          </p>
          <Link to="/editor" className="btn-primary">+ Create Strat</Link>
        </div>
      ) : (
        <div className="strat-grid">
          {filtered.map(strat => {
            const map = getMap(strat.mapId);
            const players = getLineupPlayers(strat);
            return (
              <div key={strat.id} className="strat-card" onClick={() => navigate(`/editor/${strat.id}`)}>
                <div className="strat-card-preview" style={{
                  backgroundImage: map?.preview ? `url(${map.preview})` : undefined,
                  backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative'
                }}>
                  {map?.preview && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.65))' }} />}
                  <span className="strat-card-preview-label" style={{ position: 'relative' }}>
                    {map?.name || 'No map'} · {strat.floor || '—'}
                  </span>
                  <span style={{
                    position: 'absolute', top: 8, right: 8,
                    background: strat.side === 'attack' ? 'rgba(232,184,75,0.85)' : 'rgba(75,156,232,0.85)',
                    color: '#000', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
                    padding: '2px 7px', borderRadius: 3, letterSpacing: 1,
                  }}>
                    {strat.side === 'attack' ? '⚔ ATK' : '🛡 DEF'}
                  </span>
                </div>

                <div className="strat-card-body">
                  <div className="strat-card-name">{strat.name || 'Untitled Strat'}</div>
                  {players.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', margin: '6px 0' }}>
                      {players.map((p, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: p.color + '18', border: `1px solid ${p.color}44`, borderRadius: 4, padding: '2px 6px' }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 10, color: p.color, fontFamily: 'var(--font-mono)' }}>{p.operator?.name || '?'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="strat-card-meta">
                    {(strat.tags || []).map(tag => (
                      <span key={tag} className="strat-tag">{tag}</span>
                    ))}
                    <span className="strat-tag" style={{ marginLeft: 'auto', opacity: 0.6 }}>
                      {new Date(strat.updatedAt).toLocaleDateString('en-US')}
                    </span>
                  </div>
                </div>

                <div className="strat-card-actions">
                  <Link to={`/editor/${strat.id}`} className="card-btn" onClick={e => e.stopPropagation()}>Edit</Link>
                  <button className="card-btn" onClick={e => handleDuplicate(e, strat)} title="Duplicate">⧉ Copy</button>
                  <button className="card-btn danger" onClick={e => handleDelete(e, strat.id)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
