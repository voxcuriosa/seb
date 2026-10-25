import { useCallback, useEffect, useState } from 'react';
import { SEB_START_LANGUAGES, getSebStartTranslation } from '../utils/seb/sebStartTranslations';

const STORAGE_KEY = 'seb_student_ui_lang';
const EVENT_NAME = 'seb-student-ui-lang-change';
const VALID_CODES = new Set(SEB_START_LANGUAGES.map((l) => l.code));

function readStoredLang() {
  try {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (saved && VALID_CODES.has(saved)) return saved;
  } catch {
    // Ignorer hvis localStorage er blokkert
  }
  return 'no';
}

export function useStudentUiLang() {
  const [uiLang, setUiLangState] = useState(readStoredLang);

  useEffect(() => {
    const onSync = (e) => {
      const next = e?.detail;
      if (next && VALID_CODES.has(next)) {
        setUiLangState(next);
      }
    };
    window.addEventListener(EVENT_NAME, onSync);
    return () => window.removeEventListener(EVENT_NAME, onSync);
  }, []);

  const setUiLang = useCallback((nextCode) => {
    const clean = VALID_CODES.has(nextCode) ? nextCode : 'no';
    setUiLangState(clean);
    try {
      window.localStorage.setItem(STORAGE_KEY, clean);
    } catch {
      // Ignorer
    }
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: clean }));
  }, []);

  const t = getSebStartTranslation(uiLang);
  return { uiLang, setUiLang, t };
}
