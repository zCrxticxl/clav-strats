import React from 'react';

// Catches any render/runtime error and shows a recovery screen instead of a
// blank window. Offers a reload and a last-resort data reset (with backup).
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  backupThenReset = () => {
    try {
      const data = localStorage.getItem('clav-strats');
      if (data) {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clav-strats-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }
    } catch { /* ignore */ }
    try {
      localStorage.removeItem('clav-strats');
      localStorage.removeItem('clav-walls-v2');
      localStorage.removeItem('clav-lineups-v2');
    } catch { /* ignore */ }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#080A0E', color: '#E8EDF2',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16, fontFamily: 'system-ui, sans-serif', padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#E8B84B' }}>Something went wrong</div>
        <div style={{ fontSize: 13, color: '#8A9BB0', maxWidth: 460 }}>
          The app hit an error and stopped rendering. Reload to try again. If it keeps
          happening, your saved data may be corrupt — you can back it up and reset.
        </div>
        <pre style={{ fontSize: 11, color: '#E84B4B', maxWidth: 520, overflow: 'auto', maxHeight: 120 }}>
          {String(this.state.error?.message || this.state.error)}
        </pre>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => window.location.reload()}
            style={{ padding: '9px 16px', borderRadius: 6, border: '1px solid #E8B84B', background: 'rgba(232,184,75,0.12)', color: '#E8B84B', cursor: 'pointer', fontSize: 13 }}>
            Reload
          </button>
          <button onClick={this.backupThenReset}
            style={{ padding: '9px 16px', borderRadius: 6, border: '1px solid #E84B4B', background: 'rgba(232,75,75,0.12)', color: '#ff8080', cursor: 'pointer', fontSize: 13 }}>
            Back up &amp; reset data
          </button>
        </div>
      </div>
    );
  }
}
