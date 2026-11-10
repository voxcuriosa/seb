/**
 * signature.js
 * Lokal verifisering av Ed25519-serversignaturen fra Cloud Function signSebSubmission.
 * Bare SHA-256-hashen ble sendt til serveren (ingen tekst, ingen navn).
 */
import * as ed from '@noble/ed25519';
import { SIGNING_PUBLIC_KEYS } from './publicKey';

export const SIGNATURE_PREFIX = 'CURIOSA_SEB_SIG_V1';
export const MAX_SIGN_DELAY_MS = 5 * 60 * 1000;

export function signatureMessage({ examId, sha256, signedAt }) {
  return `${SIGNATURE_PREFIX}|${examId}|${sha256}|${signedAt}`;
}

function b64ToBytes(b64) {
  const bin = atob(String(b64 || '').trim());
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function pubKeyToRaw32(b64) {
  const bytes = b64ToBytes(b64);
  // Ed25519 SPKI DER er 44 byte (12-byte ASN.1-header 302a300506032b6570032100 + 32-byte rå nøkkel)
  if (bytes.length === 44 && bytes[0] === 0x30 && bytes[11] === 0x00) {
    return bytes.subarray(12);
  }
  return bytes;
}

/**
 * @returns {{ status: 'valid'|'missing'|'invalid'|'late'|'unknown-key', detail: string }}
 */
export async function verifySebSignature(payload, publicKeys = SIGNING_PUBLIC_KEYS) {
  if (!payload?.signature || !payload?.signedAt) {
    return { status: 'missing', detail: 'Ikke serversignert (eleven var trolig uten nett ved innlevering).' };
  }
  const keyId = typeof payload.keyId === 'string' && payload.keyId.length > 0 ? payload.keyId : 'k1';
  const hasKey = publicKeys === SIGNING_PUBLIC_KEYS
    ? Object.hasOwn(SIGNING_PUBLIC_KEYS, keyId)
    : Boolean(publicKeys && typeof publicKeys === 'object' && Object.hasOwn(publicKeys, keyId));
  const pubB64 = hasKey ? publicKeys[keyId] : null;
  if (!pubB64 || typeof pubB64 !== 'string') {
    const label = typeof payload.keyId === 'string' ? payload.keyId : 'ugyldig';
    return { status: 'unknown-key', detail: `Ukjent signaturnøkkel (${label}).` };
  }
  try {
    if (typeof payload.signature !== 'string' || typeof payload.signedAt !== 'string') {
      return { status: 'invalid', detail: 'Serversignaturen kunne ikke leses.' };
    }
    const msg = new TextEncoder().encode(signatureMessage(payload));
    const ok = await ed.verifyAsync(b64ToBytes(payload.signature), msg, pubKeyToRaw32(pubB64));
    if (!ok) return { status: 'invalid', detail: 'Serversignaturen stemmer ikke med innholdet.' };
  } catch {
    return { status: 'invalid', detail: 'Serversignaturen kunne ikke leses.' };
  }
  const signedMs = typeof payload.signedAt === 'string' ? Date.parse(payload.signedAt) : NaN;
  const completedMs = typeof payload.completedAt === 'string' ? Date.parse(payload.completedAt) : NaN;
  if (!Number.isFinite(signedMs) || !Number.isFinite(completedMs) || Math.abs(signedMs - completedMs) > MAX_SIGN_DELAY_MS) {
    return { status: 'late', detail: 'Signert mer enn 5 minutter etter oppgitt fullføringstid.' };
  }
  return {
    status: 'valid',
    signedAt: payload.signedAt,
    detail: 'Gyldig serversignatur (Ed25519). Signeringstidspunktet er kryptografisk låst av serveren.'
  };
}
