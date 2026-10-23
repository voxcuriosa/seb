/**
 * signSebSubmission.js
 * Signerer KUN SHA-256-hashen av en innlevering med Ed25519.
 * Mottar aldri elevtekst eller navn, og lagrer ingenting om innleveringen.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore } from 'firebase-admin/firestore';
import { createPrivateKey, sign } from 'node:crypto';
import { isValidSha256, isValidExamId } from './validate.js';
import { clientIp, ipKey, enforceRateLimit } from './rateLimit.js';
import { CALLABLE_OPTS } from './options.js';

export const SEB_SIGNING_KEY = defineSecret('SEB_SIGNING_KEY');
export const SIGNATURE_PREFIX = 'CURIOSA_SEB_SIG_V1';
export const KEY_ID = 'k1';

let cachedKey = null;
function privateKey() {
  if (!cachedKey) cachedKey = createPrivateKey(SEB_SIGNING_KEY.value());
  return cachedKey;
}

export const signSebSubmission = onCall(
  { ...CALLABLE_OPTS, secrets: [SEB_SIGNING_KEY], memory: '256MiB', timeoutSeconds: 20 },
  async (request) => {
    const { examId, sha256 } = request.data || {};
    if (!isValidExamId(examId) || !isValidSha256(sha256)) {
      throw new HttpsError('invalid-argument', 'Ugyldig forespørsel.');
    }

    const db = getFirestore();
    const key = ipKey(clientIp(request.rawRequest), SEB_SIGNING_KEY.value());
    // Hele klasser deler ofte én offentlig IP på skolen: romslig grense.
    await enforceRateLimit(db, { scope: 'sign', key, limit: 600, windowSec: 3600 });

    const snap = await db.collection('sebExams').doc(examId).get();
    const expiresAt = snap.exists ? snap.get('expiresAt')?.toMillis?.() : 0;
    if (!snap.exists || !expiresAt || expiresAt < Date.now()) {
      throw new HttpsError('not-found', 'Prøven finnes ikke eller er utløpt.');
    }

    const signedAt = new Date().toISOString();
    const message = `${SIGNATURE_PREFIX}|${examId}|${sha256}|${signedAt}`;
    const signature = sign(null, Buffer.from(message, 'utf8'), privateKey()).toString('base64');
    return { signature, signedAt, keyId: KEY_ID };
  }
);
