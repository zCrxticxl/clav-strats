import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * useEditorViewport — manages zoom + pan state for the canvas container.
 *
 * Returns:
 *   containerRef  — attach to the outer canvas div
 *   vpState       — { zoom, panX, panY } for rendering
 *   vpRef         — same values as a ref (always current, never stale in callbacks)
 *   startPan(e)   — call on middle-mouse-down to begin panning
 *   resetView()   — snap back to zoom=1, pan=0
 */
export function useEditorViewport() {
  const containerRef = useRef(null);
  const vpRef        = useRef({ zoom: 1, panX: 0, panY: 0 });
  const [vpState, setVpState] = useState({ zoom: 1, panX: 0, panY: 0 });

  const isPanning = useRef(false);
  const panStart  = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const setVp = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(vpRef.current) : updater;
    vpRef.current = next;
    setVpState(next);
  }, []);

  // Zoom: reads vpRef directly, never stale
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const rect   = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setVp(prev => {
      const nextZoom = Math.min(Math.max(prev.zoom * factor, 0.15), 12);
      const worldX = (mouseX - prev.panX) / prev.zoom;
      const worldY = (mouseY - prev.panY) / prev.zoom;
      return {
        zoom: nextZoom,
        panX: mouseX - worldX * nextZoom,
        panY: mouseY - worldY * nextZoom,
      };
    });
  }, [setVp]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Middle-mouse pan
  useEffect(() => {
    const onMove = e => {
      if (!isPanning.current) return;
      setVp(prev => ({
        ...prev,
        panX: panStart.current.ox + e.clientX - panStart.current.x,
        panY: panStart.current.oy + e.clientY - panStart.current.y,
      }));
    };
    const onUp = () => { isPanning.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [setVp]);

  const startPan = useCallback((e) => {
    isPanning.current = true;
    panStart.current  = {
      x: e.clientX, y: e.clientY,
      ox: vpRef.current.panX, oy: vpRef.current.panY,
    };
  }, []);

  const resetView = useCallback(() => setVp({ zoom: 1, panX: 0, panY: 0 }), [setVp]);

  return { containerRef, vpRef, vpState, startPan, resetView };
}
