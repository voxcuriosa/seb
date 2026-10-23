/**
 * firebase.js
 * Firebase-klienten. Brukes bare til å LESE prøveoppsett og kalle Cloud Functions.
 * Elevdata (navn, tekst, PDF) sendes aldri hit.
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, doc, getDoc } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { getStorage, connectStorageEmulator, ref, getBytes } from 'firebase/storage';
import { firebaseConfig, FIREBASE_REGION } from './config';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const functions = getFunctions(app, FIREBASE_REGION);
export const storage = getStorage(app);

if (import.meta.env.VITE_USE_EMULATORS === '1') {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
}

export async function fetchSebExam(examId) {
  const snap = await getDoc(doc(db, 'sebExams', examId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { ...data, id: snap.id, expiresAt: data.expiresAt?.toDate?.()?.toISOString?.() || null };
}

export async function fetchPromptPdf(pdfPath) {
  const buf = await getBytes(ref(storage, pdfPath), 12 * 1024 * 1024);
  return new Uint8Array(buf);
}

export const callCreateSebExam = httpsCallable(functions, 'createSebExam', { timeout: 70_000 });
export const callSignSebSubmission = httpsCallable(functions, 'signSebSubmission', { timeout: 15_000 });
