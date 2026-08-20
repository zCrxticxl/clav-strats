import { useEffect, useRef, useState } from 'react';
import { syncYMap, yMapKeys, yMapToObject } from '../utils/collabSync';

export function useEditorCollaboration({
  collab, room, elements, lineupsByContext, timeline, tasks, meta, history,
  applyingRemoteRef, metaApplyingRef, timelineApplyingRef, tasksApplyingRef, canPushRef, setMeta, setTimeline, setTasks,
}) {
  const applyRemote = history.applyRemote;
  // canPushRef alone is not reactive: when it flips to true after the initial
  // sync, the push effects below would not re-run, so anything drawn *before*
  // joining would never reach the room. This counter makes that moment a
  // dependency, forcing one push of the current state right after syncing.
  const [pushGeneration, setPushGeneration] = useState(0);
  // Keys this client has already observed. Only those may be deleted on push,
  // so concurrent additions by a peer are never swept away (see syncYMap).
  const knownElementKeysRef = useRef(new Set());
  const knownLineupKeysRef = useRef(new Set());
  const knownTimelineKeysRef = useRef(new Set());
  const knownTaskKeysRef = useRef(new Set());

  useEffect(() => {
    const { yElements, yLineups, yTimeline, yTasks, yMeta } = collab;
    if (!yElements || !yLineups || !yTimeline || !yTasks || !yMeta) return undefined;

    const pullElements = () => {
      applyingRemoteRef.current = true;
      knownElementKeysRef.current = yMapKeys(yElements);
      applyRemote(prev => ({ ...prev, elements: Array.from(yElements.values()) }));
      applyingRemoteRef.current = false;
    };
    const pullLineups = () => {
      applyingRemoteRef.current = true;
      knownLineupKeysRef.current = yMapKeys(yLineups);
      applyRemote(prev => ({ ...prev, lineupsByContext: yMapToObject(yLineups) }));
      applyingRemoteRef.current = false;
    };
    const pullMeta = () => {
      metaApplyingRef.current = true;
      setMeta(yMeta);
      metaApplyingRef.current = false;
    };
    const pullTimeline = () => {
      const remote = yTimeline.get('timeline');
      if (!remote) return;
      timelineApplyingRef.current = true;
      setTimeline(remote);
      timelineApplyingRef.current = false;
      knownTimelineKeysRef.current = yMapKeys(yTimeline);
    };
    const pullTasks = () => {
      const remote = yTasks.get('tasks');
      if (!remote) return;
      tasksApplyingRef.current = true;
      setTasks(remote);
      tasksApplyingRef.current = false;
      knownTaskKeysRef.current = yMapKeys(yTasks);
    };
    const onElements = (_event, transaction) => { if (transaction.origin !== 'local') pullElements(); };
    const onLineups = (_event, transaction) => { if (transaction.origin !== 'local') pullLineups(); };
    const onMeta = (_event, transaction) => { if (transaction.origin !== 'local') pullMeta(); };
    const onTimeline = (_event, transaction) => { if (transaction.origin !== 'local') pullTimeline(); };
    const onTasks = (_event, transaction) => { if (transaction.origin !== 'local') pullTasks(); };
    yElements.observe(onElements);
    yLineups.observe(onLineups);
    yMeta.observe(onMeta);
    yTimeline.observe(onTimeline);
    yTasks.observe(onTasks);
    return () => {
      yElements.unobserve(onElements);
      yLineups.unobserve(onLineups);
      yMeta.unobserve(onMeta);
      yTimeline.unobserve(onTimeline);
      yTasks.unobserve(onTasks);
    };
  }, [collab.ydoc, applyRemote, setMeta, setTimeline, setTasks, timelineApplyingRef, tasksApplyingRef, applyingRemoteRef, metaApplyingRef]);

  useEffect(() => {
    canPushRef.current = false;
    knownElementKeysRef.current = new Set();
    knownLineupKeysRef.current = new Set();
    knownTimelineKeysRef.current = new Set();
    knownTaskKeysRef.current = new Set();
  }, [room, canPushRef]);

  useEffect(() => {
    if (!collab.synced) return;
    setPushGeneration(generation => generation + 1);
  }, [collab.synced, collab.ydoc]);

  useEffect(() => {
    const { yElements, yLineups, yTimeline, yTasks, yMeta } = collab;
    if (!collab.synced || !yElements || !yLineups || !yTimeline || !yTasks) return;
    applyingRemoteRef.current = true;
    knownElementKeysRef.current = yMapKeys(yElements);
    knownLineupKeysRef.current = yMapKeys(yLineups);
    knownTimelineKeysRef.current = yMapKeys(yTimeline);
    knownTaskKeysRef.current = yMapKeys(yTasks);
    if (yElements.size) applyRemote(prev => ({ ...prev, elements: Array.from(yElements.values()) }));
    if (yLineups.size) applyRemote(prev => ({ ...prev, lineupsByContext: yMapToObject(yLineups) }));
    if (yTimeline.get('timeline')) {
      timelineApplyingRef.current = true;
      setTimeline(yTimeline.get('timeline'));
      timelineApplyingRef.current = false;
    }
    if (yTasks.get('tasks')) {
      tasksApplyingRef.current = true;
      setTasks(yTasks.get('tasks'));
      tasksApplyingRef.current = false;
    }
    applyingRemoteRef.current = false;
    metaApplyingRef.current = true;
    setMeta(yMeta);
    metaApplyingRef.current = false;
    canPushRef.current = true;
  }, [collab.synced, collab.ydoc, applyRemote, setMeta, setTimeline, setTasks, timelineApplyingRef, tasksApplyingRef, applyingRemoteRef, metaApplyingRef, canPushRef]);

  useEffect(() => {
    const { yElements, ydoc } = collab;
    if (!yElements || !ydoc || !canPushRef.current || applyingRemoteRef.current) return;
    knownElementKeysRef.current = syncYMap(
      ydoc, yElements,
      elements.filter(el => el.id != null).map(el => [el.id, el]),
      knownElementKeysRef.current,
    );
  }, [elements, pushGeneration, collab.ydoc, collab.yElements, canPushRef, applyingRemoteRef]);

  useEffect(() => {
    const { yLineups, ydoc } = collab;
    if (!yLineups || !ydoc || !canPushRef.current || applyingRemoteRef.current) return;
    knownLineupKeysRef.current = syncYMap(
      ydoc, yLineups, Object.entries(lineupsByContext), knownLineupKeysRef.current,
    );
  }, [lineupsByContext, pushGeneration, collab.ydoc, collab.yLineups, canPushRef, applyingRemoteRef]);

  useEffect(() => {
    const { yTimeline, ydoc } = collab;
    if (!yTimeline || !ydoc || !collab.synced || !canPushRef.current || timelineApplyingRef.current) return;
    knownTimelineKeysRef.current = syncYMap(
      ydoc, yTimeline, [['timeline', timeline]], knownTimelineKeysRef.current,
    );
  }, [timeline, pushGeneration, collab.synced, collab.ydoc, collab.yTimeline, canPushRef, timelineApplyingRef]);

  useEffect(() => {
    const { yTasks, ydoc } = collab;
    if (!yTasks || !ydoc || !collab.synced || !canPushRef.current || tasksApplyingRef.current) return;
    knownTaskKeysRef.current = syncYMap(
      ydoc, yTasks, [['tasks', tasks]], knownTaskKeysRef.current,
    );
  }, [tasks, pushGeneration, collab.synced, collab.ydoc, collab.yTasks, canPushRef, tasksApplyingRef]);

  // Meta always pushes the same fixed key set, so it has no concurrent-add race.
  useEffect(() => {
    const { yMeta, ydoc } = collab;
    if (!yMeta || !ydoc || !canPushRef.current || metaApplyingRef.current) return;
    syncYMap(ydoc, yMeta, Object.entries(meta));
  }, [meta, pushGeneration, collab.ydoc, collab.yMeta, canPushRef, metaApplyingRef]);
}
