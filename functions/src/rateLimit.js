/**
 * rateLimit.js
 * Fast-vindu rate limiting i Firestore (kolleksjon rateLimits, TTL på expiresAt).
 * IP-adressen lagres aldri i klartekst: nøkkelen er en HMAC med en HKDF-avledet
 * domeneseparert nøkkel. Støtter sharding for høy samtidighet i klasserom.
 */
import { createHmac, hkdfSync } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

/**
 * Henter klientens virkelige IP bak Google Front End (Cloud Run / Cloud Functions Gen 2).
 * Viktig: GFE legger til klientens faktiske IP på slutten (høyre side) av X-Forwarded-For,
 * mens en klient kan spoofe verdier i starten (venstre side) av headeren.
 * Vi leser derfor alltid x-appengine-user-ip eller siste (høyre) oppføring i X-Forwarded-For.
 */
export function clientIp(rawRequest) {
  const appEngineIp = String(rawRequest?.headers?.['x-appengine-user-ip'] || '').trim();
  if (appEngineIp) return appEngineIp;

  const fwdParts = String(rawRequest?.headers?.['x-forwarded-for'] || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (fwdParts.length > 0) {
    return fwdParts[fwdParts.length - 1];
  }

  const directIp = String(rawRequest?.ip || rawRequest?.socket?.remoteAddress || '').trim();
  if (directIp) return directIp;

  const ua = String(rawRequest?.headers?.['user-agent'] || 'none').slice(0, 160);
  return `ua_${createHmac('sha256', 'curiosa-ua-fallback').update(ua).digest('hex').slice(0, 16)}`;
}

/**
 * Beregner en enveis HMAC-identifikator fra IP og hemmelighet.
 * Bruker HKDF (SHA-256) med scopet som kontekst slik at signeringsnøkkelen aldri brukes
 * direkte som rå HMAC-nøkkel, og slik at ulike scopes har kryptografisk adskilte nøkler.
 */
export function ipKey(ip, secret, scope = 'default') {
  const derivedKey = Buffer.from(
    hkdfSync('sha256', Buffer.from(String(secret), 'utf8'), Buffer.from('curiosa-seb-rl-salt-v2', 'utf8'), Buffer.from(`seb-rl-key|${scope}`, 'utf8'), 32)
  );
  return createHmac('sha256', derivedKey).update(`seb-rl-v2|${scope}|${ip}`).digest('hex').slice(0, 32);
}

/**
 * Teller opp og kaster resource-exhausted hvis grensen er nådd.
 * Ved shards > 1 fordeles trafikken over N uavhengige Firestore-dokumenter
 * for å unngå transaksjonskø når en hel skoleklasse (30+ elever på samme NAT-IP)
 * leverer samtidig.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {{scope:string,key:string,limit:number,windowSec:number,shards?:number,increment?:boolean}} opts
 */
export async function enforceRateLimit(db, { scope, key, limit, windowSec, shards = 1, increment = true }) {
  const shardCount = Math.max(1, Math.floor(Number(shards) || 1));
  const shardSuffix = shardCount > 1 ? `_s${Math.floor(Math.random() * shardCount)}` : '';
  const effectiveLimit = shardCount > 1 ? Math.max(1, Math.ceil(limit / shardCount)) : limit;
  const ref = db.collection('rateLimits').doc(`${scope}_${key}${shardSuffix}`);
  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : null;
    const windowStart = data?.windowStart?.toMillis?.() || 0;
    const inWindow = now - windowStart < windowSec * 1000;
    const count = inWindow ? Number(data?.count) || 0 : 0;
    if (count >= effectiveLimit) {
      throw new HttpsError('resource-exhausted', 'For mange forsøk. Vent litt og prøv igjen.');
    }
    if (!increment) return;
    tx.set(ref, {
      count: count + 1,
      windowStart: inWindow ? data.windowStart : Timestamp.fromMillis(now),
      expiresAt: Timestamp.fromMillis(now + Math.max(windowSec, 7200) * 1000)
    });
  });
}
