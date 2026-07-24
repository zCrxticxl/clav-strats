import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * useEditorHistory — manages a piece of state with full undo/redo support.
 *
 *   const [elements, setElements, { undo, redo, canUndo, canRedo, reset }] = useEditorHistory([]);
 *
 * Notes:
 *  - Pushes a snapshot to history BEFORE every state change (debounced via groupKey
 *    so that many small drag-events are merged into one undo step).
 *  - Holds maxSize=100 snapshots to keep memory bounded.
 *  - reset(value) replaces both current state and history (use when loading a strat).
 */
export function useEditorHistory(initial = []) {
  const [state, setStateInternal] = useState(initial);
  const historyRef = useRef([]);    // past snapshots (oldest → newest)
  const futureRef  = useRef([]);    // redo stack
  const lastGroupRef = useRef(null);
  const lastGroupTime = useRef(0);
  const maxSize = 100;

  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick(n => n + 1), []);

  // setState replacement: accepts (next | (prev) => next, opts?: { groupKey?: string })
  const setState = useCallback((updater, opts) => {
    setStateInternal(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next === prev) return prev;
      const now = Date.now();
      const sameGroup = opts?.groupKey
        && opts.groupKey === lastGroupRef.current
        && (now - lastGroupTime.current) < 600;
      if (!sameGroup) {
        historyRef.current.push(prev);
        if (historyRef.current.length > maxSize) historyRef.current.shift();
      }
      lastGroupRef.current = opts?.groupKey || null;
      lastGroupTime.current = now;
      futureRef.current = [];
      return next;
    });
    bump();
  }, [bump]);

  const undo = useCallback(() => {
    setStateInternal(curr => {
      if (historyRef.current.length === 0) return curr;
      const prev = historyRef.current.pop();
      futureRef.current.push(curr);
      lastGroupRef.current = null;
      return prev ?? curr;
    });
    bump();
  }, [bump]);

  const redo = useCallback(() => {
    setStateInternal(curr => {
      if (futureRef.current.length === 0) return curr;
      const next = futureRef.current.pop();
      historyRef.current.push(curr);
      lastGroupRef.current = null;
      return next ?? curr;
    });
    bump();
  }, [bump]);

  // Replace state without recording in history (used when loading a saved strat)
  const reset = useCallback((value) => {
    historyRef.current = [];
    futureRef.current  = [];
    lastGroupRef.current = null;
    setStateInternal(value);
    bump();
  }, [bump]);

  // Apply an external (remote/collab) state without pushing to history and
  // without clearing the local undo stack — keeps undo usable during collab.
  const applyRemote = useCallback((updater) => {
    setStateInternal(prev => (typeof updater === 'function' ? updater(prev) : updater));
    bump();
  }, [bump]);
  
  // suppress unused warning — tick is only read to trigger re-renders
  void tick;

  // Global shortcuts: Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z or Ctrl+Y = redo
  useEffect(() => {
    const onKey = (e) => {
      // Don't trigger when typing in inputs
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  return [
    state,
    setState,
    {
      undo,
      redo,
      reset,
      applyRemote,
      canUndo: historyRef.current.length > 0,
      canRedo: futureRef.current.length > 0,
      historySize: historyRef.current.length,
    },
  ];
}
