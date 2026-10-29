/**
 * sebEnvironment.js
 * Oppdager om siden kjører inne i Safe Exam Browser (SEB).
 * Kopiert og forenklet fra voxkunnskap/src/utils/localMode/editionConfig.js.
 */

const SESSION_KEY = 'curiosa_is_seb';

export function markAsSebEnvironment() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* sessionStorage kan være sperret */
  }
  try {
    window.SafeExamBrowser?.security?.updateKeys?.();
  } catch {
    /* ikke alle SEB-versjoner eksponerer updateKeys */
  }
}

/**
 * Verifiserer at klienten faktisk kjører inne i Safe Exam Browser
 * (via User-Agent eller SEBs injiserte window.SafeExamBrowser-objekt),
 * slik at en elev ikke bare kan åpne startURL (/seb/exam/:examId?seb=1) i vanlig nettleser.
 * Tillater localhost / 127.0.0.1 og testmiljøer under lokal utvikling.
 */
export function isVerifiedSebClient() {
  if (typeof window === 'undefined') return true;
  try {
    const ua = navigator.userAgent || '';
    if (/\bSEB\b/i.test(ua) || /\bSafeExamBrowser\b/i.test(ua) || /\bVoxCuriosa\b/i.test(ua)) {
      return true;
    }
    if (window.SafeExamBrowser || window.SEB || window.seb) {
      return true;
    }
    const host = window.location?.hostname || '';
    if (host === 'localhost' || host === '127.0.0.1' || /jsdom|happy-dom/i.test(ua)) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function isSebEnvironment() {
  if (typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem(SESSION_KEY) === '1') return true;

    const search = new URLSearchParams(window.location.search || '');
    if (search.get('seb') === '1' || search.get('isSeb') === '1') {
      markAsSebEnvironment();
      return true;
    }
    const ua = navigator.userAgent || '';
    if (/\bSEB\b/i.test(ua) || /\bSafeExamBrowser\b/i.test(ua)) {
      markAsSebEnvironment();
      return true;
    }
    if (window.SafeExamBrowser || window.SEB || window.seb) {
      markAsSebEnvironment();
      return true;
    }
  } catch {
    return false;
  }
  return false;
}
