import React from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Tutorial from './components/Tutorial';
import HomePage from './pages/HomePage';
import LibraryPage from './pages/LibraryPage';
import EditorPage from './pages/EditorPage';
import LineupPage from './pages/LineupPage';
import WallEditorPage from './pages/WallEditorPage';
import { useTauriUpdater } from './hooks/useTauriUpdater';
import './App.css';

function NavBar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">
          <span className="brand-icon">⬡</span>
          <span className="brand-name">CLAV<span className="brand-accent">.STRATS</span></span>
        </Link>
      </div>
      <div className="navbar-links">
        <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>
        <Link to="/library" className={`nav-link ${isActive('/library') ? 'active' : ''}`}>Library</Link>
        <Link to="/lineup" className={`nav-link ${isActive('/lineup') ? 'active' : ''}`}>Lineup</Link>
        <Link to="/wall-editor" className={`nav-link ${isActive('/wall-editor') ? 'active' : ''}`} style={{ fontSize: 11, opacity: 0.5 }}>Wall Editor</Link>
        <Link to="/editor" className="nav-link">
          <span className="nav-cta">+ New Strat</span>
        </Link>
      </div>
    </nav>
  );
}

export default function App() {
  useTauriUpdater();
  return (
    <Router>
      <div className="app">
        <NavBar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/lineup" element={<LineupPage />} />
            <Route path="/wall-editor" element={<WallEditorPage />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/editor/:stratId" element={<EditorPage />} />
          </Routes>
        </main>
        <Tutorial />
      </div>
    </Router>
  );
}
