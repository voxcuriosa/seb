/**
 * runtimeNetworkFirewall.js
 * Aktiv nettverksbrannmur i nettleseren (runtime) som supplerer den statiske
 * kildekodevakten (scripts/privacy-guard.mjs).
 *
 * Sikrer teknisk under kjøring:
 *  1. I prøverommet (/exam/*):
 *     - Rute-status fryses (latches) ved innlasting/navigering til /exam/*, slik at
 *       history.replaceState eller history.pushState aldri kan skru av brannmuren.
 *     - navigator.sendBeacon er blokkert.
 *     - Alle utgående POST/PUT/PATCH-kall utenfor Firestore-lesing inspiseres i sanntid:
 *       kroppen kan maks være 512 byte og kan KUN inneholde enten { data: { examId } }
 *       (henting av oppgaveinnhold i SEB) eller { data: { examId, sha256 } } (signering
 *       av kontrollsum ved levering), med streng examId-validering og null ekstra nøkler.
 *  2. I Fane 2 (withZeroNetworkFirewall):
 *     - Ethvert forsøk på å kalle fetch, XMLHttpRequest eller sendBeacon under
 *       PDF-kontroll blokkeres på direkten med feilmelding.
 */

const EXAM_ID_RE = /^[A-Za-z0-9]{10,40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/i;

let zeroNetworkDepth = 0;
const installedTargets = new WeakSet();

function matchesExamRoomPath(pathname = '') {
  return /^(\/seb)?\/exam(\/|$)/i.test(String(pathname || ''));
}

// Frys ved modulinnlasting dersom siden ble lastet på /exam/*
let latchedGlobalExamRoom =
  typeof window !== 'undefined' && matchesExamRoomPath(window.location?.pathname);

function isExamRoomRoute(pathname = '', targetGlobal = globalThis) {
  if (pathname) return matchesExamRoomPath(pathname);
  const current = String(
    targetGlobal?.location?.pathname ||
      (typeof window !== 'undefined' ? window.location?.pathname : '') ||
      ''
  );
  if (matchesExamRoomPath(current)) {
    if (
      !targetGlobal ||
      targetGlobal === globalThis ||
      (typeof window !== 'undefined' && targetGlobal === window)
    ) {
      latchedGlobalExamRoom = true;
    }
    return true;
  }
  if (
    !targetGlobal ||
    targetGlobal === globalThis ||
    (typeof window !== 'undefined' && targetGlobal === window)
  ) {
    return latchedGlobalExamRoom;
  }
  return false;
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
 * Sjekker at en utgående forespørselskropp i prøverommet kun er { data: { examId } }
 * eller { data: { examId, sha256 } } uten ekstra nøkler og maks 512 byte.
 */
export function assertAllowedExamRoomPayload(url, body) {
  if (body == null || body === '') return;
  if (isFirestoreReadTarget(url)) return;

  const size = bodyByteLength(body);
  if (size > 512) {
    throw new Error(
      `Runtime-personvernbrannmur: Utgående forespørsel blokkert (${size} byte overstiger maksgrensen på 512 byte i prøverommet).`
    );
  }

  if (typeof body !== 'string') {
    throw new Error(
      'Runtime-personvernbrannmur: Kun JSON-formatert { examId } eller { examId, sha256 } er tillatt ut fra prøverommet.'
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error('Runtime-personvernbrannmur: Utgående kropp er ikke gyldig JSON og ble blokkert.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Runtime-personvernbrannmur: Forbudte felter i utgående kall fra prøverommet (ugyldig objekt).');
  }

  let payload = parsed;
  if (Object.prototype.hasOwnProperty.call(parsed, 'data')) {
    const outerExtra = Object.keys(parsed).filter((k) => k !== 'data');
    if (outerExtra.length > 0 || !parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
      throw new Error(
        `Runtime-personvernbrannmur: Forbudte felter i utgående kall fra prøverommet (${outerExtra.join(', ') || 'ugyldig data-felt'}).`
      );
    }
    payload = parsed.data;
  }

  const keys = Object.keys(payload || {});
  const allowedKeys = new Set(['examId', 'sha256']);
  const disallowed = keys.filter((k) => !allowedKeys.has(k));

  if (disallowed.length > 0 || keys.length === 0 || !Object.prototype.hasOwnProperty.call(payload, 'examId')) {
    throw new Error(
      `Runtime-personvernbrannmur: Forbudte felter i utgående kall fra prøverommet (${disallowed.join(', ') || 'mangler examId'}).`
    );
  }

  if (typeof payload.examId !== 'string' || !EXAM_ID_RE.test(payload.examId)) {
    throw new Error('Runtime-personvernbrannmur: Ugyldig examId i utgående kall.');
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'sha256')) {
    if (typeof payload.sha256 !== 'string' || !SHA256_RE.test(payload.sha256)) {
      throw new Error('Runtime-personvernbrannmur: Ugyldig sha256-format i utgående kall.');
    }
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
  if (!targetGlobal || (typeof targetGlobal !== 'object' && typeof targetGlobal !== 'function')) return;
  if (installedTargets.has(targetGlobal)) return;
  installedTargets.add(targetGlobal);

  let latchedTargetExamRoom = matchesExamRoomPath(targetGlobal.location?.pathname);
  if (latchedTargetExamRoom && (targetGlobal === globalThis || (typeof window !== 'undefined' && targetGlobal === window))) {
    latchedGlobalExamRoom = true;
  }

  const checkInExamRoom = () => {
    if (matchesExamRoomPath(targetGlobal.location?.pathname)) {
      latchedTargetExamRoom = true;
    }
    return latchedTargetExamRoom || isExamRoomRoute('', targetGlobal);
  };

  // Frys også ved SPA-navigasjon eller forsøk på history.replaceState / pushState
  if (targetGlobal.history && typeof targetGlobal.history === 'object') {
    for (const method of ['pushState', 'replaceState']) {
      if (typeof targetGlobal.history[method] === 'function') {
        const nativeHistoryFn = targetGlobal.history[method].bind(targetGlobal.history);
        targetGlobal.history[method] = function guardedHistoryState(...args) {
          checkInExamRoom();
          const res = nativeHistoryFn(...args);
          checkInExamRoom();
          return res;
        };
      }
    }
  }

  // 1. Pakk inn fetch
  if (typeof targetGlobal.fetch === 'function') {
    const nativeFetch = targetGlobal.fetch.bind(targetGlobal);
    targetGlobal.fetch = function guardedFetch(input, init) {
      if (zeroNetworkDepth > 0) {
        return Promise.reject(
          new Error('Runtime-personvernbrannmur: Nettverkskall er totalblokkert under lokal PDF-kontroll (Fane 2).')
        );
      }
      const url = typeof input === 'string' ? input : input?.url || String(input || '');
      const body = init?.body ?? (typeof Request !== 'undefined' && input instanceof Request ? input.body : null);
      if (checkInExamRoom() && body != null) {
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
      if (checkInExamRoom() && body != null) {
        assertAllowedExamRoomPayload(this.__curiosaTargetUrl || '', body);
      }
      return nativeSend.call(this, body);
    };
  }

  // 3. Pakk inn navigator.sendBeacon
  if (targetGlobal.navigator && typeof targetGlobal.navigator.sendBeacon === 'function') {
    const nativeBeacon = targetGlobal.navigator.sendBeacon.bind(targetGlobal.navigator);
    targetGlobal.navigator.sendBeacon = function guardedSendBeacon(url, data) {
      if (zeroNetworkDepth > 0 || checkInExamRoom()) {
        return false;
      }
      return nativeBeacon(url, data);
    };
  }
}
