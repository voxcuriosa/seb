/**
 * sebEnvironment.js
 * Oppdager om siden kjører inne i Safe Exam Browser (SEB).
 * Kopiert og forenklet fra voxkunnskap/src/utils/localMode/editionConfig.js.
 */

export function markAsSebEnvironment() {
  if (typeof window === 'undefined') return;
  try {
    window.SafeExamBrowser?.security?.updateKeys?.();
  } catch {
    /* ikke alle SEB-versjoner eksponerer updateKeys */
  }
  try {
    if (navigator?.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
      navigator.mediaDevices.getDisplayMedia = () =>
        Promise.reject(new DOMException('Skjermdeling er sperret under prøven.', 'NotAllowedError'));
    }
  } catch {
    /* mediaDevices kan være skrivebeskyttet */
  }
}

/**
 * Verifiserer at klienten faktisk kjører inne i Safe Exam Browser
 * (via streng User-Agent-sjekk eller SEBs injiserte window.SafeExamBrowser-objekt),
 * slik at en elev ikke bare kan åpne startURL (/seb/exam/:examId?seb=1) i vanlig nettleser.
 * Tillater kun localhost/127.0.0.1 i DEV-modus og jsdom/happy-dom under Vitest.
 */
export function isVerifiedSebClient() {
  if (typeof window === 'undefined') return true;
  try {
    const ua = navigator.userAgent || '';
    if (/\b(SEB|SafeExamBrowser)\/\d/i.test(ua)) {
      return true;
    }
    if (window.SafeExamBrowser) {
      return true;
    }
    const isVitest = Boolean(import.meta.env?.VITEST || globalThis?.process?.env?.VITEST);
    if (isVitest && /jsdom|happy-dom/i.test(ua)) {
      return true;
    }
    const isDev = Boolean(import.meta.env?.DEV);
    const host = window.location?.hostname || '';
    if (isDev && (host === 'localhost' || host === '127.0.0.1')) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function isSebEnvironment() {
  if (typeof window === 'undefined') return false;
  return isVerifiedSebClient();
}

export const GUEST_VM_GPU_RE =
  /\b(VirtualBox|VBox|VMware|Parallels|QEMU|VirGL|Bochs|SwiftShader|llvmpipe|Apple Paravirtual|Paravirtualized)\b/i;

/**
 * Sjekker skjermkortdriver (WebGL UNMASKED_RENDERER_WEBGL / UNMASKED_VENDOR_WEBGL)
 * for faktiske gjeste-VM-adaptere og programvarerendering (VirtualBox, VMware, Parallels,
 * QEMU, SwiftShader, llvmpipe, Apple Paravirtual, Paravirtualized).
 * Fysiske Windows 11 skole-PC-er med Hyper-V/VBS/Kjerneisolasjon eller Microsoft Basic
 * Render Driver utløser aldri falsk alarm her.
 */
export function detectGuestVirtualMachine() {
  if (typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return null;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '')
      : String(gl.getParameter(gl.RENDERER) || '');
    const vendor = dbg
      ? String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || '')
      : String(gl.getParameter(gl.VENDOR) || '');
    const combined = `${vendor} ${renderer}`.trim();
    if (GUEST_VM_GPU_RE.test(combined)) {
      return combined;
    }
  } catch {
    return null;
  }
  return null;
}
