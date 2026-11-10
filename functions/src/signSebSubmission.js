/**
 * signSebSubmission.js
 * Signerer KUN SHA-256-hashen av en innlevering med Ed25519.
 * Mottar aldri elevtekst eller navn, og lagrer ingenting om innleveringen.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore } from 'firebase-admin/firestore';
import { createPrivateKey, sign } from 'node:crypto';
import { isSebRequest, isValidSha256, isValidExamId } from './validate.js';
import { clientIp, ipKey, enforceRateLimit } from './rateLimit.js';
import { CALLABLE_OPTS } from './options.js';

export const SEB_SIGNING_KEY = defineSecret('SEB_SIGNING_KEY');
export const SIGNATURE_PREFIX = 'CURIOSA_SEB_SIG_V1';
export const KEY_ID = 'k1';

const EXAM_CACHE_TTL_MS = 15_000;
const EXAM_CACHE_MAX = 500;
const validExamExpiryCache = Object.create(null);

function readCachedExpiry(examId, now) {
  const entry = validExamExpiryCache[`e_${examId}`];
  if (!entry) return 0;
  if (now > entry.cachedUntil || entry.expiresAt <= now) {
    delete validExamExpiryCache[`e_${examId}`];
    return 0;
  }
  return entry.expiresAt;
}

function storeCachedExpiry(examId, expiresAt, now) {
  const cacheKey = `e_${examId}`;
  if (!(cacheKey in validExamExpiryCache)) {
    const existingKeys = Object.keys(validExamExpiryCache);
    if (existingKeys.length >= EXAM_CACHE_MAX) {
      delete validExamExpiryCache[existingKeys[0]];
    }
  }
  validExamExpiryCache[cacheKey] = { expiresAt, cachedUntil: now + EXAM_CACHE_TTL_MS };
}

let cachedKey = null;
function privateKey() {
  if (!cachedKey) {
    const raw = String(SEB_SIGNING_KEY.value() || '').trim();
    cachedKey = raw.includes('BEGIN')
      ? createPrivateKey(raw)
      : createPrivateKey({ key: Buffer.from(raw, 'base64'), format: 'der', type: 'pkcs8' });
  }
  return cachedKey;
}

export const signSebSubmission = onCall(
  { ...CALLABLE_OPTS, secrets: [SEB_SIGNING_KEY], memory: '256MiB', timeoutSeconds: 20 },
  async (request) => {
    const { examId, sha256 } = request.data || {};
    if (!isValidExamId(examId) || !isValidSha256(sha256)) {
      throw new HttpsError('invalid-argument', 'Ugyldig forespørsel.');
    }

    if (!isSebRequest(request.rawRequest)) {
      throw new HttpsError('permission-denied', 'Signering kan kun utføres inne i Safe Exam Browser.');
    }

    const db = getFirestore();
    const now = Date.now();
    let expiresAt = readCachedExpiry(examId, now);
    if (!expiresAt) {
      const snap = await db.collection('sebExams').doc(examId).get();
      expiresAt = snap.exists ? snap.get('expiresAt')?.toMillis?.() : 0;
      if (!snap.exists || !expiresAt || expiresAt <= now) {
        throw new HttpsError('not-found', 'Prøven finnes ikke eller er utløpt.');
      }
      storeCachedExpiry(examId, expiresAt, now);
    }

    const key = ipKey(clientIp(request.rawRequest), SEB_SIGNING_KEY.value(), 'sign');
    // Hele klasser deler ofte én offentlig IP på skolen: 10 shards per gyldig prøve unngår
    // Firestore-kø når 30+ elever leverer samtidig (30 per shard = 300 per time per prøve og skole-IP).
    await enforceRateLimit(db, {
      scope: 'sign',
      key: `${examId}_${key}`,
      limit: 300,
      windowSec: 3600,
      shards: 10
    });

    const signedAt = new Date().toISOString();
    const message = `${SIGNATURE_PREFIX}|${examId}|${sha256}|${signedAt}`;
    const signature = sign(null, Buffer.from(message, 'utf8'), privateKey()).toString('base64');
    return { signature, signedAt, keyId: KEY_ID };
  }
);
