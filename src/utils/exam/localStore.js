/**
 * localStore.js
 * Lokal autolagring av elevens besvarelse: localStorage (primær) + IndexedDB (speil).
 * Ingenting her sendes over nettet. SEB-filen har clearBrowserCache=false, slik at
 * dataene overlever strømbrudd og omstart på samme maskin.
 */

const DB_NAME = 'seb_standalone';
const STORE = 'exams';

/**
 * Maks levetid (12 timer) for lokale krasjutkast på en elevmaskin.
 * Hvis en prøve ble avbrutt uten å nå /quit (f.eks. ved strømbrudd), slettes
 * utkastet automatisk etter 12 timer slik at eldre tekst aldri blir liggende
 * igjen på delte skole-PC-er.
 */
export const DRAFT_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export const storageKey = (examId) => `seb_standalone_exam_${examId}`;

function isDraftExpired(draft, maxAgeMs = DRAFT_MAX_AGE_MS) {
  if (!draft || typeof draft !== 'object') return true;
  const ts = Date.parse(draft.savedAt || '');
  if (!Number.isFinite(ts) || ts <= 0) return true;
  return Date.now() - ts > maxAgeMs;
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB mangler'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key, value) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGet(key) {
  const db = await openDb();
  const value = await new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return value;
}

function readLocal(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Lagrer i begge lagre. Returnerer true hvis minst ett lyktes. */
export async function saveDraft(examId, draft) {
  const key = storageKey(examId);
  const value = { ...draft, savedAt: new Date().toISOString() };
  let ok = false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    ok = true;
  } catch {
    /* kvote full: IndexedDB tar over */
  }
  try {
    await idbPut(key, value);
    ok = true;
  } catch {
    /* IndexedDB utilgjengelig */
  }
  return ok ? value.savedAt : null;
}

/** Synkron lagring for pagehide/beforeunload (bare localStorage). */
export function saveDraftSync(examId, draft) {
  try {
    localStorage.setItem(storageKey(examId), JSON.stringify({ ...draft, savedAt: new Date().toISOString() }));
  } catch {
    /* ignorer */
  }
}

/** Leser nyeste utkast fra localStorage eller IndexedDB (sletter automatisk utløpte utkast > 12t). */
export async function loadDraft(examId) {
  await purgeExpiredDrafts();
  const key = storageKey(examId);
  const local = readLocal(key);
  let idb;
  try {
    idb = await idbGet(key);
  } catch {
    idb = null;
  }
  const validLocal = local && !isDraftExpired(local) ? local : null;
  const validIdb = idb && !isDraftExpired(idb) ? idb : null;
  if ((local && !validLocal) || (idb && !validIdb)) {
    await clearDraft(examId);
  }
  if (!validLocal) return validIdb || null;
  if (!validIdb) return validLocal;
  return Date.parse(validIdb.savedAt || 0) > Date.parse(validLocal.savedAt || 0) ? validIdb : validLocal;
}

async function idbDelete(key) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignorer */
  }
}

/**
 * Sletter elevens utkast fullstendig fra både localStorage og IndexedDB.
 * Kalles umiddelbart etter at PDF er lastet ned og eleven bekrefter avslutning.
 */
export async function clearDraft(examId) {
  const key = storageKey(examId);
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignorer */
  }
  await idbDelete(key);
}

/**
 * Sletter ALLE lokale prøveutkast fra både localStorage og IndexedDB på maskinen.
 * Kalles på avslutningssiden (/quit) for å garantere at ingen elevtekst kan ligge igjen.
 */
export async function clearAllDrafts() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('seb_standalone_exam_')) {
        localStorage.removeItem(k);
      }
    }
  } catch {
    /* ignorer */
  }
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignorer */
  }
}

/**
 * Rydd opp utløpte prøveutkast (> 12 timer gamle) fra både localStorage og IndexedDB.
 * Kalles automatisk ved oppstart på alle sider for å beskytte delte skole-PC-er.
 */
export async function purgeExpiredDrafts(maxAgeMs = DRAFT_MAX_AGE_MS) {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('seb_standalone_exam_')) {
        const draft = readLocal(k);
        if (isDraftExpired(draft, maxAgeMs)) {
          localStorage.removeItem(k);
        }
      }
    }
  } catch {
    /* ignorer */
  }
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target?.result;
        if (!cursor) return;
        if (String(cursor.key || '').startsWith('seb_standalone_exam_') && isDraftExpired(cursor.value, maxAgeMs)) {
          cursor.delete();
        }
        cursor.continue();
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignorer */
  }
}
