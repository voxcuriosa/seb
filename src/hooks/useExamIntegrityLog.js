/**
 * useExamIntegrityLog.js
 * Teller aktiv tid (vindu synlig og i fokus) og registrerer fokustap og store innliminger.
 * Loggen lagres lokalt og havner bare i elevens egen PDF.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_FOCUS_LOSS_MS_STRICT = 1500;
const MIN_FOCUS_LOSS_MS_AIDS = 3000;

export function useExamIntegrityLog({ initialActiveSeconds = 0, initialIncidents = [], enabled = true, hasAids = false }) {
  const activeRef = useRef(initialActiveSeconds);
  const [incidents, setIncidents] = useState(initialIncidents);
  const [activeSeconds, setActiveSeconds] = useState(initialActiveSeconds);
  const blurAtRef = useRef(null);

  const addIncident = useCallback((type, detail = '') => {
    setIncidents((prev) => [...prev, { type, at: new Date().toISOString(), detail }].slice(-500));
  }, []);

  const reset = useCallback((seconds, list) => {
    activeRef.current = seconds;
    setActiveSeconds(seconds);
    setIncidents(list);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const minLoss = hasAids ? MIN_FOCUS_LOSS_MS_AIDS : MIN_FOCUS_LOSS_MS_STRICT;
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        activeRef.current += 1;
        if (activeRef.current % 5 === 0) setActiveSeconds(activeRef.current);
      }
    }, 1000);

    const onBlur = () => {
      blurAtRef.current = Date.now();
    };
    const onFocus = () => {
      if (blurAtRef.current) {
        const ms = Date.now() - blurAtRef.current;
        if (ms >= minLoss) {
          const type = hasAids ? 'APP_SWITCH' : 'FOCUS_LOST';
          const label = hasAids
            ? `${Math.round(ms / 1000)} s i hjelpemiddel/annen app`
            : `${Math.round(ms / 1000)} s utenfor prøven`;
          addIncident(type, label);
        }
        blurAtRef.current = null;
      }
    };
    const onVisibility = () => (document.visibilityState === 'hidden' ? onBlur() : onFocus());

    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(tick);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, hasAids, addIncident]);

  const getActiveSeconds = useCallback(() => activeRef.current, []);
  return { incidents, addIncident, activeSeconds, getActiveSeconds, reset };
}
