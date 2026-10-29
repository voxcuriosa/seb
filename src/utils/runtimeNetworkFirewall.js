/**
 * runtimeNetworkFirewall.js
 * Aktiv nettverksbrannmur i nettleseren (runtime) som supplerer den statiske
 * kildekodevakten (scripts/privacy-guard.mjs).
 *
 * Sikrer teknisk under kjøring:
 *  1. I prøverommet (/exam/*):
 *     - navigator.sendBeacon er blokkert.
 *     - Alle utgående POST/PUT/PATCH-kall til signeringsendepunktet eller andre
 *       endepunkter utenfor Firestore-lesing inspiseres i sanntid: kroppen kan maks
 *       være 512 byte og kan KUN inneholde nøklene { data: { examId, sha256 } } der
 *       sha256 er en 64-tegns hex-streng. Ethvert forsøk på å sende elevtekst,
 *       utkast eller andre felter avvises umiddelbart før pakken forlater nettleseren.
 *  2. I Fane 2 (withZeroNetworkFirewall):
 *     - Ethvert forsøk på å kalle fetch, XMLHttpRequest eller sendBeacon under
 *       PDF-kontroll blokkeres på direkten med feilmelding.
 */

let zeroNetworkDepth = 0;
let installed = false;

function isExamRoomRoute(pathname = '') {
  const p = String(pathname || (typeof window !== 'undefined' ? window.location?.pathname : '') || '');
  return /^(\/seb)?\/exam(\/|$)/i.test(p);
}

function isFirestoreReadTarget(url = '') {
  return /^https:\/\/firestore\.googleapis\.com\//i.test(String(url || ''));
}

function bodyByteLength(body) {
  if (body == null) return 0;
  if (typeof body === 'string') return new TextEncoder().encode(body).byteLength;
  if (body instanceof ArrayBuffer) return body.byteLength;
  if (ArrayBuffer.isView(body)) return body.byteLength;
  if (typeof Blob !== 'undefined' && body instanceof Blob) return body.size;
  return 1024; // Ukjent kroppstype (f.eks. FormData) regnes som for stor i prøverommet
}

/**
 * Sjekker at en utgående forespørselskropp i prøverommet kun er { data: { examId, sha256 } }.
 * Kaster feil dersom kroppen inneholder tekst, ukjente nøkler eller overstiger 512 byte.
 */
export function assertAllowedExamRoomPayload(url, body) {
  if (body == null || body === '') return;
  if (isFirestoreReadTarget(url)) return;

  const size = bodyByteLength(body);
  if (size > 512) {
    throw new Error(`Runtime-personvernbrannmur: Utgående forespørsel blokkert (${size} byte overstiger maksgrensen på 512 byte i prøverommet).`);
  }

  if (typeof body !== 'string') {
    throw new Error('Runtime-personvernbrannmur: Kun JSON-formatert { examId, sha256 } er tillatt ut fra prøverommet.');
  }

  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error('Runtime-personvernbrannmur: Utgående kropp er ikke gyldig JSON og ble blokkert.');
  }

  const payload = parsed && typeof parsed === 'object' && parsed.data && typeof parsed.data === 'object'
    ? parsed.data
    : parsed;

  const keys = Object.keys(payload || {});
  const allowedKeys = new Set(['examId', 'sha256']);
  const disallowed = keys.filter((k) => !allowedKeys.has(k));

  if (disallowed.length > 0 || keys.length === 0) {
    throw new Error(`Runtime-personvernbrannmur: Forbudte felter i utgående kall fra prøverommet (${disallowed.join(', ') || 'tomt objekt'}).`);
  }

  if (typeof payload.examId !== 'string' || payload.examId.length === 0 || payload.examId.length > 64) {
    throw new Error('Runtime-personvernbrannmur: Ugyldig examId i utgående kall.');
  }

  if (typeof payload.sha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(payload.sha256)) {
    throw new Error('Runtime-personvernbrannmur: Ugyldig sha256-format i utgående kall.');
  }
}

/**
 * Kjører en asynkron funksjon i total nettverkskarantene (0 nettverkskall tillatt).
 */
export async function withZeroNetworkFirewall(fn) {
  zeroNetworkDepth += 1;
  try {
    return await fn();
  } finally {
    zeroNetworkDepth = Math.max(0, zeroNetworkDepth - 1);
  }
}

/**
 * Installerer runtime-brannmuren på globalThis.fetch, XMLHttpRequest og navigator.sendBeacon.
 */
export function installRuntimeNetworkFirewall(targetGlobal = globalThis) {
  if (!targetGlobal || installed) return;
  installed = true;

  // 1. Pakk inn fetch
  if (typeof targetGlobal.fetch === 'function') {
    const nativeFetch = targetGlobal.fetch.bind(targetGlobal);
    targetGlobal.fetch = function guardedFetch(input, init) {
      if (zeroNetworkDepth > 0) {
        return Promise.reject(new Error('Runtime-personvernbrannmur: Nettverkskall er totalblokkert under lokal PDF-kontroll (Fane 2).'));
      }
      const url = typeof input === 'string' ? input : input?.url || String(input || '');
      const body = init?.body ?? (typeof Request !== 'undefined' && input instanceof Request ? input.body : null);
      if (isExamRoomRoute() && body != null) {
        try {
          assertAllowedExamRoomPayload(url, body);
        } catch (err) {
          return Promise.reject(err);
        }
      }
      return nativeFetch(input, init);
    };
  }

  // 2. Pakk inn XMLHttpRequest
  if (typeof targetGlobal.XMLHttpRequest === 'function' && targetGlobal.XMLHttpRequest.prototype) {
    const nativeOpen = targetGlobal.XMLHttpRequest.prototype.open;
    const nativeSend = targetGlobal.XMLHttpRequest.prototype.send;

    targetGlobal.XMLHttpRequest.prototype.open = function guardedOpen(method, url, ...rest) {
      if (zeroNetworkDepth > 0) {
        throw new Error('Runtime-personvernbrannmur: XHR er totalblokkert under lokal PDF-kontroll (Fane 2).');
      }
      this.__curiosaTargetUrl = String(url || '');
      return nativeOpen.call(this, method, url, ...rest);
    };

    targetGlobal.XMLHttpRequest.prototype.send = function guardedSend(body) {
      if (zeroNetworkDepth > 0) {
        throw new Error('Runtime-personvernbrannmur: XHR er totalblokkert under lokal PDF-kontroll (Fane 2).');
      }
      if (isExamRoomRoute() && body != null) {
        assertAllowedExamRoomPayload(this.__curiosaTargetUrl || '', body);
      }
      return nativeSend.call(this, body);
    };
  }

  // 3. Pakk inn navigator.sendBeacon
  if (targetGlobal.navigator && typeof targetGlobal.navigator.sendBeacon === 'function') {
    const nativeBeacon = targetGlobal.navigator.sendBeacon.bind(targetGlobal.navigator);
    targetGlobal.navigator.sendBeacon = function guardedSendBeacon(url, data) {
      if (zeroNetworkDepth > 0 || isExamRoomRoute()) {
        return false;
      }
      return nativeBeacon(url, data);
    };
  }
}
