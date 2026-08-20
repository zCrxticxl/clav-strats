import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeTimeline } from '../utils/timeline';

export function useTimelinePlayback(timeline) {
  const normalized = normalizeTimeline(timeline);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const frameRef = useRef(null);
  const clockRef = useRef(null);

  const stopFrame = useCallback(() => {
    if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  useEffect(() => {
    setCurrentTime(value => Math.min(value, normalized.duration));
  }, [normalized.duration]);

  useEffect(() => {
    if (!isPlaying) {
      stopFrame();
      return undefined;
    }
    clockRef.current = performance.now() - currentTime * 1000;
    const tick = now => {
      const next = Math.min(normalized.duration, (now - clockRef.current) / 1000);
      setCurrentTime(next);
      if (next >= normalized.duration) {
        setIsPlaying(false);
        frameRef.current = null;
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return stopFrame;
  }, [isPlaying, normalized.duration, stopFrame]);

  useEffect(() => () => stopFrame(), [stopFrame]);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const restart = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);
  const scrub = useCallback(value => {
    setCurrentTime(Math.min(normalized.duration, Math.max(0, numberValue(value))));
  }, [normalized.duration]);

  return { currentTime, isPlaying, play, pause, restart, scrub };
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
