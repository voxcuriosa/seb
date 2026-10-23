/**
 * rateLimit.js
 * Enkel fast-vindu rate limiting i Firestore (kolleksjon rateLimits, TTL på expiresAt).
 * IP-adressen lagres aldri i klartekst: nøkkelen er en HMAC med en hemmelig nøkkel.
 */
import { createHmac } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

export function clientIp(rawRequest) {
  const fwd = String(rawRequest?.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || rawRequest?.ip || 'unknown';
}

export function ipKey(ip, secret) {
  return createHmac('sha256', String(secret)).update(`seb-rl-v1|${ip}`).digest('hex').slice(0, 32);
}

/**
 * Teller opp og kaster resource-exhausted hvis grensen er nådd.
 * @param {FirebaseFirestore.Firestore} db
 * @param {{scope:string,key:string,limit:number,windowSec:number,increment?:boolean}} opts
 */
export async function enforceRateLimit(db, { scope, key, limit, windowSec, increment = true }) {
  const ref = db.collection('rateLimits').doc(`${scope}_${key}`);
  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : null;
    const windowStart = data?.windowStart?.toMillis?.() || 0;
    const inWindow = now - windowStart < windowSec * 1000;
    const count = inWindow ? Number(data?.count) || 0 : 0;
    if (count >= limit) {
      throw new HttpsError('resource-exhausted', 'For mange forsøk. Vent litt og prøv igjen.');
    }
    if (!increment) return;
    tx.set(ref, {
      count: count + 1,
      windowStart: inWindow ? data.windowStart : Timestamp.fromMillis(now),
      expiresAt: Timestamp.fromMillis(now + Math.max(windowSec, 3600) * 1000 * 2)
    });
  });
}

export async function recordFailure(db, { scope, key, windowSec }) {
  return enforceRateLimit(db, { scope, key, limit: Number.MAX_SAFE_INTEGER, windowSec });
}
