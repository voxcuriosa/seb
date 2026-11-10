/**
 * rateLimit.js
 * Fast-vindu rate limiting i Firestore (kolleksjon rateLimits, TTL på expiresAt).
 * IP-adressen lagres aldri i klartekst: nøkkelen er en HMAC med en HKDF-avledet
 * domeneseparert nøkkel som roteres daglig (UTC). Støtter sharding for høy samtidighet.
 */
import { createHmac, hkdfSync } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

/**
 * Henter klientens virkelige IP bak Google Front End (Cloud Run / Cloud Functions Gen 2).
 * Viktig: GFE legger til klientens faktiske IP på slutten (høyre side) av X-Forwarded-For,
 * mens en klient kan spoofe verdier i starten (venstre side) av headeren, eller spoofe
 * x-appengine-user-ip direkte mot Cloud Run. Vi leser derfor siste oppføring i X-Forwarded-For.
 */
export function clientIp(rawRequest) {
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

function ipv4ToHexGroups(v4) {
  const parts = v4.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : -1));
  if (nums.some((n) => n < 0 || n > 255)) return null;
  const g0 = ((nums[0] << 8) | nums[1]).toString(16);
  const g1 = ((nums[2] << 8) | nums[3]).toString(16);
  return [g0, g1];
}

/**
 * Normaliserer IP-adresse før rate-limiting:
 * - IPv4-mapped IPv6 (::ffff:1.2.3.4) trekker ut IPv4-delen (1.2.3.4).
 * - Øvrige IPv6-adresser ekspanderes til 8 grupper av 16-bit hex og beholdes kun som
 *   de første 4 gruppene (g0:g1:g2:g3::/64), slik at IPv6-rotasjon på mobilnett ikke omgår rate-limit.
 */
export function normalizeIpForRateLimit(ip) {
  let raw = String(ip || '').trim();
  if (!raw) return '';

  const bracketMatch = raw.match(/^\[([^\]]+)\]/);
  if (bracketMatch) raw = bracketMatch[1];

  const pctIdx = raw.indexOf('%');
  if (pctIdx !== -1) raw = raw.slice(0, pctIdx);

  raw = raw.toLowerCase();
  if (!raw.includes(':')) return raw;

  const v4Mapped = raw.match(/^(?:::ffff:|(?:0{1,4}:){5}ffff:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (v4Mapped && ipv4ToHexGroups(v4Mapped[1])) {
    return v4Mapped[1];
  }

  const halves = raw.split('::');
  if (halves.length > 2) return raw;

  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];

  const tailList = halves.length === 2 ? right : left;
  if (tailList.length > 0 && tailList[tailList.length - 1].includes('.')) {
    const hexPair = ipv4ToHexGroups(tailList[tailList.length - 1]);
    if (!hexPair) return raw;
    tailList.splice(tailList.length - 1, 1, ...hexPair);
  }

  let groups;
  if (halves.length === 2) {
    const missing = 8 - (left.length + right.length);
    if (missing < 1) return raw;
    groups = [...left, ...Array(missing).fill('0'), ...right];
  } else {
    if (left.length !== 8) return raw;
    groups = left;
  }

  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) {
    return raw;
  }

  const fullGroups = groups.map((g) => g.padStart(4, '0'));
  if (
    fullGroups[0] === '0000' &&
    fullGroups[1] === '0000' &&
    fullGroups[2] === '0000' &&
    fullGroups[3] === '0000' &&
    fullGroups[4] === '0000' &&
    fullGroups[5] === 'ffff'
  ) {
    const hi = parseInt(fullGroups[6], 16);
    const lo = parseInt(fullGroups[7], 16);
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }

  return `${fullGroups[0]}:${fullGroups[1]}:${fullGroups[2]}:${fullGroups[3]}::/64`;
}

/**
 * Beregner en enveis HMAC-identifikator fra normalisert IP og hemmelighet.
 * Bruker HKDF (SHA-256) med scope og dagens UTC-dato i info-strengen slik at
 * ulike scopes har adskilte nøkler og IP-hasher roteres automatisk hvert døgn.
 */
export function ipKey(ip, secret, scope = 'default', utcDate = new Date().toISOString().slice(0, 10)) {
  const normalizedIp = normalizeIpForRateLimit(ip);
  const ikm = Buffer.isBuffer(secret) ? secret : Buffer.from(String(secret), 'utf8');
  const derivedKey = Buffer.from(
    hkdfSync(
      'sha256',
      ikm,
      Buffer.from('curiosa-seb-rl-salt-v2', 'utf8'),
      Buffer.from(`seb-rl-key|${scope}|${utcDate}`, 'utf8'),
      32
    )
  );
  return createHmac('sha256', derivedKey).update(`seb-rl-v2|${scope}|${normalizedIp}`).digest('hex').slice(0, 32);
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
