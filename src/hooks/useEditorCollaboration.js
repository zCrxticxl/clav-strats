import { useEffect, useRef, useState } from 'react';
import { syncYMap, yMapKeys, yMapToObject } from '../utils/collabSync';

export function useEditorCollaboration({
  collab, room, elements, lineupsByContext, meta, history,
  applyingRemoteRef, metaApplyingRef, canPushRef, setMeta,
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

  useEffect(() => {
    const { yElements, yLineups, yMeta } = collab;
    if (!yElements || !yLineups || !yMeta) return undefined;

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
    const onElements = (_event, transaction) => { if (transaction.origin !== 'local') pullElements(); };
    const onLineups = (_event, transaction) => { if (transaction.origin !== 'local') pullLineups(); };
    const onMeta = (_event, transaction) => { if (transaction.origin !== 'local') pullMeta(); };
    yElements.observe(onElements);
    yLineups.observe(onLineups);
    yMeta.observe(onMeta);
    return () => {
      yElements.unobserve(onElements);
      yLineups.unobserve(onLineups);
      yMeta.unobserve(onMeta);
    };
  }, [collab.ydoc, applyRemote, setMeta, applyingRemoteRef, metaApplyingRef]);

  useEffect(() => {
    canPushRef.current = false;
    knownElementKeysRef.current = new Set();
    knownLineupKeysRef.current = new Set();
  }, [room, canPushRef]);

  useEffect(() => {
    if (!collab.synced) return;
    setPushGeneration(generation => generation + 1);
  }, [collab.synced, collab.ydoc]);

  useEffect(() => {
    const { yElements, yLineups, yMeta } = collab;
    if (!collab.synced || !yElements) return;
    applyingRemoteRef.current = true;
    knownElementKeysRef.current = yMapKeys(yElements);
    knownLineupKeysRef.current = yMapKeys(yLineups);
    if (yElements.size) applyRemote(prev => ({ ...prev, elements: Array.from(yElements.values()) }));
    if (yLineups.size) applyRemote(prev => ({ ...prev, lineupsByContext: yMapToObject(yLineups) }));
    applyingRemoteRef.current = false;
    metaApplyingRef.current = true;
    setMeta(yMeta);
    metaApplyingRef.current = false;
    canPushRef.current = true;
  }, [collab.synced, collab.ydoc, applyRemote, setMeta, applyingRemoteRef, metaApplyingRef, canPushRef]);

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

  // Meta always pushes the same fixed key set, so it has no concurrent-add race.
  useEffect(() => {
    const { yMeta, ydoc } = collab;
    if (!yMeta || !ydoc || !canPushRef.current || metaApplyingRef.current) return;
    syncYMap(ydoc, yMeta, Object.entries(meta));
  }, [meta, pushGeneration, collab.ydoc, collab.yMeta, canPushRef, metaApplyingRef]);
}
