/**
 * createSebExam.js
 * Oppretter en SEB-prøve etter PIN-kontroll. Klienten har ingen skrivetilgang til
 * Firestore eller Storage; alt skrives her med Admin SDK.
 * Sensitivt oppgaveinnhold og rå Forms-lenke lagres i sebExamContent/{examId}
 * (kun tilgjengelig fra Safe Exam Browser via getSebExamContent), mens sebExams/{examId}
 * kun inneholder startmetadata (schemaVersion: 2).
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { isFormsUrl, validateExamInput, ValidationError } from './validate.js';
import { clientIp, ipKey, enforceRateLimit } from './rateLimit.js';
import { CALLABLE_OPTS } from './options.js';

export const SEB_TEACHER_PIN = defineSecret('SEB_TEACHER_PIN');

const TTL_MS = 90 * 24 * 60 * 60 * 1000;

export function pinMatches(given, expected) {
  const a = createHash('sha256').update(String(given || '')).digest();
  const b = createHash('sha256').update(String(expected || '')).digest();
  return timingSafeEqual(a, b) && String(expected || '').length > 0;
}

let cachedPinSource = null;
let cachedPinHmacSecret = null;
export function derivePinRateLimitSecret(pinValue) {
  const raw = String(pinValue || '');
  if (cachedPinHmacSecret && cachedPinSource === raw) {
    return cachedPinHmacSecret;
  }
  cachedPinSource = raw;
  cachedPinHmacSecret = scryptSync(raw, 'curiosa-seb-pin-rl-v2', 32);
  return cachedPinHmacSecret;
}

export const createSebExam = onCall(
  { ...CALLABLE_OPTS, concurrency: 4, secrets: [SEB_TEACHER_PIN], memory: '512MiB', timeoutSeconds: 60 },
  async (request) => {
    const db = getFirestore();
    const data = request.data || {};
    const ip = clientIp(request.rawRequest);
    const teacherPin = SEB_TEACHER_PIN.value();
    const hmacSecret = derivePinRateLimitSecret(teacherPin);
    const pinKey = ipKey(ip, hmacSecret, 'pinfail');

    // 1. Stopp gjetting av PIN atomisk: tell forsøket før PIN-sjekk (lukker kappløpshull
    // ved parallelle forespørsler).
    await enforceRateLimit(db, { scope: 'pinfail', key: pinKey, limit: 5, windowSec: 900 });
    if (!pinMatches(data.pin, teacherPin)) {
      throw new HttpsError('permission-denied', 'Feil PIN-kode.');
    }

    // Kun PIN-sjekk (brukes når læreren låser opp Fane 1).
    // Rate-limites før sletting av pinfail slik at en klient aldri kan hamre Firestore med slettinger.
    if (data.dryRun === true) {
      const unlockKey = ipKey(ip, hmacSecret, 'unlock');
      await enforceRateLimit(db, { scope: 'unlock', key: unlockKey, limit: 30, windowSec: 3600 });
      await db.collection('rateLimits').doc(`pinfail_${pinKey}`).delete();
      return { ok: true };
    }

    // 2. Maks 30 nye prøver per døgn per IP (håndheves før sletting av pinfail).
    const createKey = ipKey(ip, hmacSecret, 'create');
    await enforceRateLimit(db, { scope: 'create', key: createKey, limit: 30, windowSec: 86400 });
    await db.collection('rateLimits').doc(`pinfail_${pinKey}`).delete();

    let clean;
    try {
      clean = validateExamInput(data.exam);
    } catch (err) {
      if (err instanceof ValidationError) throw new HttpsError('invalid-argument', err.message);
      throw err;
    }

    const bucketName = process.env.SEB_STORAGE_BUCKET || 'voxcuriosa-seb-storage';
    const ref = db.collection('sebExams').doc();
    let pdfPath = null;
    if (clean.pdfBuffer) {
      pdfPath = `sebExams/${ref.id}/oppgave-${randomBytes(12).toString('hex')}.pdf`;
      const bucket = getStorage().bucket(bucketName);
      await bucket.file(pdfPath).save(clean.pdfBuffer, {
        resumable: false,
        contentType: 'application/pdf',
        metadata: { cacheControl: 'private, max-age=3600' }
      });
    }

    const deleteToken = randomBytes(24).toString('base64url');
    const deleteTokenHash = createHash('sha256').update(deleteToken).digest('hex');
    const publicSebConfig = {
      ...clean.sebConfig,
      allowedWebsites: clean.sebConfig.allowedWebsites.map((w) =>
        w.id === 'web_forms_main' || isFormsUrl(w.url)
          ? { ...w, url: 'https://forms.office.com', domain: 'forms.office.com' }
          : w
      )
    };

    const expiresAt = Timestamp.fromMillis(Date.now() + TTL_MS);
    const contentRef = db.collection('sebExamContent').doc(ref.id);
    const batch = db.batch();
    batch.set(contentRef, {
      id: ref.id,
      expiresAt,
      promptHtml: clean.promptHtml,
      pdfPath,
      formsUrl: clean.formsUrl || null,
      deleteTokenHash,
      createdAt: FieldValue.serverTimestamp()
    });
    batch.set(ref, {
      id: ref.id,
      title: clean.title,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
      sourceType: clean.sourceType,
      promptHtml: '',
      pdfPath: null,
      formsUrl: null,
      sebConfig: publicSebConfig,
      blocks: [{ id: 'essay_1', type: 'essay', title: 'Besvarelse' }],
      schemaVersion: 2
    });

    try {
      await batch.commit();
    } catch (dbErr) {
      if (pdfPath) {
        try {
          const bucket = getStorage().bucket(bucketName);
          await bucket.file(pdfPath).delete();
        } catch (cleanupErr) {
          console.error(`Kunne ikke rydde opp forlatt PDF ${pdfPath}:`, cleanupErr);
        }
      }
      throw dbErr;
    }

    return {
      examId: ref.id,
      expiresAt: expiresAt.toDate().toISOString(),
      deleteToken,
      quitPasswordHash: clean.sebConfig.quitPasswordHash
    };
  }
);
