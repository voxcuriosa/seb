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
  const pubB64 = publicKeys[payload.keyId || 'k1'];
  if (!pubB64) {
    return { status: 'unknown-key', detail: `Ukjent signaturnøkkel (${payload.keyId}).` };
  }
  try {
    const msg = new TextEncoder().encode(signatureMessage(payload));
    const ok = await ed.verifyAsync(b64ToBytes(payload.signature), msg, pubKeyToRaw32(pubB64));
    if (!ok) return { status: 'invalid', detail: 'Serversignaturen stemmer ikke med innholdet.' };
  } catch {
    return { status: 'invalid', detail: 'Serversignaturen kunne ikke leses.' };
  }
  const signedMs = Date.parse(payload.signedAt);
  const completedMs = Date.parse(payload.completedAt);
  if (!Number.isFinite(signedMs) || !Number.isFinite(completedMs) || Math.abs(signedMs - completedMs) > MAX_SIGN_DELAY_MS) {
    return { status: 'late', detail: 'Signert mer enn 5 minutter etter oppgitt fullføringstid.' };
  }
  return { status: 'valid', detail: 'Gyldig serversignatur.' };
}
