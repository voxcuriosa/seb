/**
 * useExamAutosave.js
 * Autolagrer elevens tekst ved hver endring (debounced) og ved pagehide/visibilitychange.
 * Lagrer under nøkkelen seb_standalone_exam_${examId} i localStorage og IndexedDB.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { saveDraft, saveDraftSync } from '../utils/exam/localStore';

const DEBOUNCE_MS = 400;

export function useExamAutosave(examId, getDraft) {
  const [savedAt, setSavedAt] = useState(null);
  const [saveError, setSaveError] = useState(false);
  const timer = useRef(null);
  const stoppedRef = useRef(false);
  const getDraftRef = useRef(getDraft);
  getDraftRef.current = getDraft;

  const stop = useCallback(() => {
    stoppedRef.current = true;
    clearTimeout(timer.current);
  }, []);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (stoppedRef.current) return;
    const draft = getDraftRef.current();
    if (!draft) return;
    const at = await saveDraft(examId, draft);
    if (stoppedRef.current) return;
    setSaveError(!at);
    if (at) setSavedAt(at);
  }, [examId]);

  const schedule = useCallback(() => {
    if (stoppedRef.current) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, DEBOUNCE_MS);
  }, [flush]);

  useEffect(() => {
    const syncSave = () => {
      if (stoppedRef.current) return;
      const draft = getDraftRef.current();
      if (draft) saveDraftSync(examId, draft);
    };
    const onVisibility = () => document.visibilityState === 'hidden' && syncSave();
    window.addEventListener('pagehide', syncSave);
    window.addEventListener('beforeunload', syncSave);
    document.addEventListener('visibilitychange', onVisibility);
    // Periodisk lagring (fanger aktiv tid selv uten tasting).
    const interval = setInterval(flush, 15000);
    return () => {
      window.removeEventListener('pagehide', syncSave);
      window.removeEventListener('beforeunload', syncSave);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(interval);
      clearTimeout(timer.current);
    };
  }, [examId, flush]);

  return { savedAt, saveError, schedule, flush, stop };
}
