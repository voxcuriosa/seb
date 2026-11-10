/**
 * getSebExamContent.js
 * Returnerer oppgavetekst, pdfPath og formsUrl for en aktiv prøve kun når kallet
 * kommer fra Safe Exam Browser (eller lokal emulator). Hindrer at oppgaveteksten
 * eller en ubeskyttet Microsoft Forms-lenke kan hentes i vanlig nettleser før prøven.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { isSebRequest, isValidExamId } from './validate.js';
import { CALLABLE_OPTS } from './options.js';

export const getSebExamContent = onCall(
  { ...CALLABLE_OPTS, memory: '256MiB', timeoutSeconds: 15 },
  async (request) => {
    const { examId } = request.data || {};
    if (!isValidExamId(examId)) {
      throw new HttpsError('invalid-argument', 'Ugyldig prøve-ID.');
    }

    if (!isSebRequest(request.rawRequest)) {
      throw new HttpsError('permission-denied', 'Oppgaven kan kun åpnes inne i Safe Exam Browser.');
    }

    const db = getFirestore();
    const [examSnap, contentSnap] = await Promise.all([
      db.collection('sebExams').doc(examId).get(),
      db.collection('sebExamContent').doc(examId).get()
    ]);

    const now = Date.now();
    const examExpiresMs = examSnap.exists ? examSnap.get('expiresAt')?.toMillis?.() : 0;
    if (!examSnap.exists || !examExpiresMs || examExpiresMs <= now) {
      throw new HttpsError('not-found', 'Prøven finnes ikke eller er utløpt.');
    }

    if (contentSnap.exists) {
      const contentExpiresMs = contentSnap.get('expiresAt')?.toMillis?.();
      if (contentExpiresMs && contentExpiresMs <= now) {
        throw new HttpsError('not-found', 'Prøven finnes ikke eller er utløpt.');
      }
      const c = contentSnap.data();
      return {
        promptHtml: String(c?.promptHtml || ''),
        pdfPath: c?.pdfPath || null,
        formsUrl: c?.formsUrl || null
      };
    }

    // Bakoverkompatibilitet med eldre prøver opprettet på schemaVersion 1
    const legacy = examSnap.data();
    return {
      promptHtml: String(legacy?.promptHtml || ''),
      pdfPath: legacy?.pdfPath || null,
      formsUrl: legacy?.formsUrl || null
    };
  }
);
