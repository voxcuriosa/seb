/**
 * payloadHash.js
 * Kanonisk SHA-256 for innleverte prøve-PDF-er.
 *  - v1/v2 (CURIOSA_LOCAL_EXAM_SUBMISSION fra curiosa.no): identisk med
 *    voxkunnskap/src/utils/localMode/examPdfGenerator.js for bakoverkompatibilitet.
 *  - v3 (CURIOSA_SEB_ESSAY_SUBMISSION): dekker receiptCode, examId, startedAt, completedAt,
 *    wordCount, activeSeconds, incidentCount, pasteIncidents, essayText og INTEGRITY_SALT.
 *
 * Merk: saltet er offentlig (ligger i JavaScript). Hashen avslører vanlig redigering,
 * mens Ed25519-serversignaturen (signature.js) beskytter mot omberegning.
 */
import { sha256Hex } from './sha256';

export const INTEGRITY_SALT = 'CURIOSA_LOCAL_EXAM_V1_INTEGRITY';
export const SEB_ESSAY_TYPE = 'CURIOSA_SEB_ESSAY_SUBMISSION';
export const LEGACY_EXAM_TYPE = 'CURIOSA_LOCAL_EXAM_SUBMISSION';

function legacyCanonical(p) {
  const data = {
    receiptCode: p.receiptCode,
    topicId: p.topicId,
    structuredScore: p.structuredScore,
    structuredMaxScore: p.structuredMaxScore,
    activeSeconds: p.activeSeconds,
    incidentCount: p.incidentCount,
    pasteIncidents: p.pasteIncidents,
    answers: p.answers
  };
  if (Number(p?.version) >= 2) {
    data.startedAt = p.startedAt;
    data.completedAt = p.completedAt;
  }
  data.salt = INTEGRITY_SALT;
  return data;
}

function sebEssayCanonical(p) {
  return {
    receiptCode: p.receiptCode,
    ...(p.nonce ? { nonce: p.nonce } : {}),
    examId: p.examId,
    startedAt: p.startedAt,
    completedAt: p.completedAt,
    wordCount: p.wordCount,
    activeSeconds: p.activeSeconds,
    incidentCount: p.incidentCount,
    pasteIncidents: p.pasteIncidents,
    essayText: p.essayText,
    salt: INTEGRITY_SALT
  };
}

export async function computeExamPayloadSha256(payloadObj) {
  const canonical = payloadObj?.type === SEB_ESSAY_TYPE
    ? sebEssayCanonical(payloadObj)
    : legacyCanonical(payloadObj || {});
  return sha256Hex(JSON.stringify(canonical));
}

export function encodePayload(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function decodePayload(b64) {
  try {
    const binary = atob(String(b64 || '').trim());
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}
