/**
 * deleteSebExam.js
 * Sletter en prøve permanent fra Firestore og Cloud Storage (GDPR art. 17).
 * Godtar enten prøvens unike deleteToken (SHA-256 timingSafeEqual) eller gyldig lærer-PIN.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { createHash, timingSafeEqual } from 'node:crypto';
import { isValidExamId } from './validate.js';
import { clientIp, ipKey, enforceRateLimit } from './rateLimit.js';
import { SEB_TEACHER_PIN, pinMatches, derivePinRateLimitSecret } from './createSebExam.js';
import { CALLABLE_OPTS } from './options.js';

function tokenMatchesHash(deleteToken, expectedHashHex) {
  const token = typeof deleteToken === 'string' ? deleteToken.trim() : '';
  const hex = typeof expectedHashHex === 'string' ? expectedHashHex.trim().toLowerCase() : '';
  if (!token || !/^[a-f0-9]{64}$/.test(hex)) return false;
  const givenBuf = createHash('sha256').update(token).digest();
  const expectedBuf = Buffer.from(hex, 'hex');
  return givenBuf.length === expectedBuf.length && timingSafeEqual(givenBuf, expectedBuf);
}

export const deleteSebExam = onCall(
  { ...CALLABLE_OPTS, secrets: [SEB_TEACHER_PIN], memory: '256MiB', timeoutSeconds: 20 },
  async (request) => {
    const { examId, deleteToken, pin } = request.data || {};
    if (!isValidExamId(examId)) {
      throw new HttpsError('invalid-argument', 'Ugyldig prøve-ID.');
    }

    const rawToken = typeof deleteToken === 'string' ? deleteToken.trim() : '';
    const rawPin = typeof pin === 'string' ? pin : '';
    if ((!rawToken && !rawPin) || rawToken.length > 200 || rawPin.length > 200) {
      throw new HttpsError('invalid-argument', 'Mangler gyldig slettenøkkel eller PIN-kode.');
    }

    const db = getFirestore();
    const ip = clientIp(request.rawRequest);
    const teacherPin = SEB_TEACHER_PIN.value();
    const hmacSecret = derivePinRateLimitSecret(teacherPin);

    const deleteKey = ipKey(ip, hmacSecret, 'delete');
    await enforceRateLimit(db, { scope: 'delete', key: deleteKey, limit: 30, windowSec: 3600 });

    const examRef = db.collection('sebExams').doc(examId);
    const contentRef = db.collection('sebExamContent').doc(examId);
    const [examSnap, contentSnap] = await Promise.all([examRef.get(), contentRef.get()]);

    let authorized = false;
    if (rawToken && contentSnap.exists) {
      authorized = tokenMatchesHash(rawToken, contentSnap.get('deleteTokenHash'));
    }

    if (!authorized && rawPin) {
      const pinKey = ipKey(ip, hmacSecret, 'pinfail');
      await enforceRateLimit(db, { scope: 'pinfail', key: pinKey, limit: 5, windowSec: 900 });
      if (pinMatches(rawPin, teacherPin)) {
        await db.collection('rateLimits').doc(`pinfail_${pinKey}`).delete();
        authorized = true;
      }
    }

    if (!authorized) {
      if (!examSnap.exists && !contentSnap.exists) {
        throw new HttpsError('not-found', 'Prøven finnes ikke lenger eller er allerede slettet.');
      }
      throw new HttpsError('permission-denied', 'Ugyldig slettenøkkel eller PIN-kode.');
    }

    const bucketName = process.env.SEB_STORAGE_BUCKET || 'voxcuriosa-seb-storage';
    const bucket = getStorage().bucket(bucketName);
    try {
      await bucket.file(`sebExams/${examId}/oppgave.pdf`).delete();
    } catch (err) {
      if (err?.code !== 404 && Number(err?.code) !== 404) throw err;
    }
    try {
      await bucket.deleteFiles({ prefix: `sebExams/${examId}/`, force: true });
    } catch (err) {
      if (err?.code !== 404 && Number(err?.code) !== 404) throw err;
    }

    const batch = db.batch();
    batch.delete(contentRef);
    batch.delete(examRef);
    await batch.commit();

    return { ok: true };
  }
);
