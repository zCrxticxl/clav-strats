import { useEffect } from 'react';
import { syncYMap, yMapToObject } from '../utils/collabSync';

export function useEditorCollaboration({
  collab, room, elements, lineupsByContext, meta, history,
  applyingRemoteRef, metaApplyingRef, canPushRef, setMeta,
}) {
  const applyRemote = history.applyRemote;

  useEffect(() => {
    const { yElements, yLineups, yMeta } = collab;
    if (!yElements || !yLineups || !yMeta) return undefined;

    const pullElements = () => {
      applyingRemoteRef.current = true;
      applyRemote(prev => ({ ...prev, elements: Array.from(yElements.values()) }));
      applyingRemoteRef.current = false;
    };
    const pullLineups = () => {
      applyingRemoteRef.current = true;
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

  useEffect(() => { canPushRef.current = false; }, [room, canPushRef]);

  useEffect(() => {
    const { yElements, yLineups, yMeta } = collab;
    if (!collab.synced || !yElements) return;
    applyingRemoteRef.current = true;
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
    syncYMap(ydoc, yElements, elements.filter(el => el.id != null).map(el => [el.id, el]));
  }, [elements, collab.ydoc, collab.yElements, canPushRef, applyingRemoteRef]);

  useEffect(() => {
    const { yLineups, ydoc } = collab;
    if (!yLineups || !ydoc || !canPushRef.current || applyingRemoteRef.current) return;
    syncYMap(ydoc, yLineups, Object.entries(lineupsByContext));
  }, [lineupsByContext, collab.ydoc, collab.yLineups, canPushRef, applyingRemoteRef]);

  useEffect(() => {
    const { yMeta, ydoc } = collab;
    if (!yMeta || !ydoc || !canPushRef.current || metaApplyingRef.current) return;
    syncYMap(ydoc, yMeta, Object.entries(meta));
  }, [meta, collab.ydoc, collab.yMeta, canPushRef, metaApplyingRef]);
}
