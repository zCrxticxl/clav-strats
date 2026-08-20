import React, { useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { COMPETITIVE_MAPS, RANKED_MAPS } from '../data/maps';
import { SOCIAL_LINKS } from '../data/links';

const SPACING  = 64;
const INFLUENCE = 260;
const STEP     = 10;
const PULL     = 24;

function distort(x, y, mx, my) {
  const dx = x - mx, dy = y - my;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0 || dist > INFLUENCE) return [x, y];
  const t = 1 - dist / INFLUENCE;
  const pull = t * t * PULL;
  return [
    x + (dx / dist) * pull,
    y + (dy / dist) * pull,
  ];
}

function drawFrame(canvas, mx, my) {
  const ctx = canvas.getContext('2d');
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const active = mx > 0 && my > 0;

  ctx.strokeStyle = 'rgba(232,184,75,0.04)';
  ctx.lineWidth = 1;

  for (let gx = 0; gx < w + SPACING; gx += SPACING) {
    ctx.beginPath();
    let first = true;
    for (let gy = 0; gy <= h; gy += STEP) {
      const [px, py] = active ? distort(gx, gy, mx, my) : [gx, gy];
      first ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      first = false;
    }
    ctx.stroke();
  }

  for (let gy = 0; gy < h + SPACING; gy += SPACING) {
    ctx.beginPath();
    let first = true;
    for (let gx = 0; gx <= w; gx += STEP) {
      const [px, py] = active ? distort(gx, gy, mx, my) : [gx, gy];
      first ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      first = false;
    }
    ctx.stroke();
  }
}

export default function HomePage() {
  const navigate  = useNavigate();
  const canvasRef = useRef(null);
  const mouseRef  = useRef({ x: -999, y: -999 });
  const smoothMouseRef = useRef({ x: -999, y: -999 });
  const rafRef    = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    const tick = () => {
      rafRef.current = null;
      const target = mouseRef.current;
      const smooth = smoothMouseRef.current;
      smooth.x += (target.x - smooth.x) * 0.14;
      smooth.y += (target.y - smooth.y) * 0.14;
      drawFrame(canvas, smooth.x, smooth.y);
      if (Math.abs(target.x - smooth.x) > 0.35 || Math.abs(target.y - smooth.y) > 0.35) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    const schedule = () => {
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(tick);
    };
    const onMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      schedule();
    };
    const onResize = () => { resize(); drawFrame(canvas, smoothMouseRef.current.x, smoothMouseRef.current.y); };
    resize();
    drawFrame(canvas, smoothMouseRef.current.x, smoothMouseRef.current.y);
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMove, { passive: true });

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div>
      <div className="home-bg">
        <div className="home-bg-orb-1" />
        <div className="home-bg-orb-2" />
        <div className="home-bg-orb-3" />
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      </div>
      <div className="home-content">
      <section className="home-hero">
        <div className="hero-badge">RAINBOW SIX SIEGE // STRAT BUILDER</div>
        <h1 className="hero-title">
          Plan your next
          <span>OPERATION</span>
        </h1>
        <p className="hero-sub">
          Build tactical strategies on every competitive map. Draw routes, place operators, share with your team.
        </p>
        <div className="hero-actions">
          <Link to="/editor" className="btn-primary" style={{ fontSize: 18, padding: '14px 36px', letterSpacing: 2 }}>
            + New Strat
          </Link>
          <Link to="/library" className="btn-secondary">📂 Library</Link>
           <a href={SOCIAL_LINKS.buyMeACoffee} target="_blank" rel="noreferrer" className="btn-secondary btn-coffee" title="Support development">☕ Support</a>
        </div>
      </section>

      <section className="maps-section">
        <div className="section-header">
          <h2 className="section-title">Quick Start: Competitive</h2>
          <span className="section-label">PRO LEAGUE</span>
          <div className="section-divider" />
        </div>
        <div className="map-grid">
          {COMPETITIVE_MAPS.map(map => (
            <div
              key={map.id}
              className="map-card"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/editor?map=${map.id}`)}
            >
              {map.preview && <div className="map-card-bg" style={{ backgroundImage: `url(${map.preview})` }} />}
              <div className="map-card-overlay" />
              <div className="map-card-type competitive" style={{ position: 'relative' }}>⬡ Competitive</div>
              <div className="map-card-name" style={{ position: 'relative' }}>{map.name}</div>
              <div className="map-card-floors" style={{ position: 'relative' }}>{map.floors.length} floors</div>
            </div>
          ))}
        </div>
      </section>

      <section className="maps-section" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <h2 className="section-title">Ranked Maps</h2>
          <span className="section-label" style={{ borderColor: 'rgba(75,156,232,0.3)', color: '#4B9CE8', background: 'rgba(75,156,232,0.08)' }}>RANKED</span>
          <div className="section-divider" />
        </div>
        <div className="map-grid">
          {RANKED_MAPS.map(map => (
            <div
              key={map.id}
              className="map-card"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/editor?map=${map.id}`)}
            >
              <div className="map-card-type ranked">⬡ Ranked</div>
              <div className="map-card-name">{map.name}</div>
              <div className="map-card-floors">{map.floors.length} floors</div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ textAlign: 'center', padding: '12px 0 32px', opacity: 0.3, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
         <Link to="/wall-editor" style={{ color: 'inherit', textDecoration: 'none' }}>⚙ Wall Editor</Link>
         <span style={{ margin: '0 8px' }}>·</span>
         <a href={SOCIAL_LINKS.x} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>X @zCrxticxl</a>
      </div>
      </div>
    </div>
  );
}
