/**
 * createSebExam.js
 * Oppretter en SEB-prøve etter PIN-kontroll. Klienten har ingen skrivetilgang til
 * Firestore/Storage; alt skrives her med Admin SDK.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { createHash, timingSafeEqual } from 'node:crypto';
import { validateExamInput, ValidationError } from './validate.js';
import { clientIp, ipKey, enforceRateLimit, recordFailure } from './rateLimit.js';
import { CALLABLE_OPTS } from './options.js';

export const SEB_TEACHER_PIN = defineSecret('SEB_TEACHER_PIN');

const TTL_MS = 90 * 24 * 60 * 60 * 1000;

function pinMatches(given, expected) {
  const a = createHash('sha256').update(String(given || '')).digest();
  const b = createHash('sha256').update(String(expected || '')).digest();
  return timingSafeEqual(a, b) && String(expected || '').length > 0;
}

export const createSebExam = onCall(
  { ...CALLABLE_OPTS, secrets: [SEB_TEACHER_PIN], memory: '512MiB', timeoutSeconds: 60 },
  async (request) => {
    const db = getFirestore();
    const data = request.data || {};
    const key = ipKey(clientIp(request.rawRequest), SEB_TEACHER_PIN.value());

    // 1. Stopp gjetting av PIN: maks 5 feil per 15 minutter per IP.
    await enforceRateLimit(db, { scope: 'pinfail', key, limit: 5, windowSec: 900, increment: false });
    if (!pinMatches(data.pin, SEB_TEACHER_PIN.value())) {
      await recordFailure(db, { scope: 'pinfail', key, windowSec: 900 });
      throw new HttpsError('permission-denied', 'Feil PIN-kode.');
    }

    // Kun PIN-sjekk (brukes når læreren låser opp Fane 1).
    if (data.dryRun === true) return { ok: true };

    // 2. Maks 30 nye prøver per døgn per IP.
    await enforceRateLimit(db, { scope: 'create', key, limit: 30, windowSec: 86400 });

    let clean;
    try {
      clean = validateExamInput(data.exam);
    } catch (err) {
      if (err instanceof ValidationError) throw new HttpsError('invalid-argument', err.message);
      throw err;
    }

    const ref = db.collection('sebExams').doc();
    let pdfPath = null;
    if (clean.pdfBuffer) {
      pdfPath = `sebExams/${ref.id}/oppgave.pdf`;
      await getStorage().bucket().file(pdfPath).save(clean.pdfBuffer, {
        resumable: false,
        contentType: 'application/pdf',
        metadata: { cacheControl: 'private, max-age=3600' }
      });
    }

    const expiresAt = Timestamp.fromMillis(Date.now() + TTL_MS);
    await ref.set({
      id: ref.id,
      title: clean.title,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
      sourceType: clean.sourceType,
      promptHtml: clean.promptHtml,
      pdfPath,
      sebConfig: clean.sebConfig,
      blocks: [{ id: 'essay_1', type: 'essay', title: 'Besvarelse' }],
      schemaVersion: 1
    });

    return { examId: ref.id, expiresAt: expiresAt.toDate().toISOString() };
  }
);
