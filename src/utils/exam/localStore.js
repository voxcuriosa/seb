/**
 * localStore.js
 * Lokal autolagring av elevens besvarelse: localStorage (primær) + IndexedDB (speil).
 * Ingenting her sendes over nettet. SEB-filen har clearBrowserCache=false, slik at
 * dataene overlever strømbrudd og omstart på samme maskin.
 */

const DB_NAME = 'seb_standalone';
const STORE = 'exams';

export const storageKey = (examId) => `seb_standalone_exam_${examId}`;

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

/** Leser nyeste utkast fra localStorage eller IndexedDB. */
export async function loadDraft(examId) {
  const key = storageKey(examId);
  const local = readLocal(key);
  let idb = null;
  try {
    idb = await idbGet(key);
  } catch {
    idb = null;
  }
  if (!local) return idb || null;
  if (!idb) return local;
  return Date.parse(idb.savedAt || 0) > Date.parse(local.savedAt || 0) ? idb : local;
}
