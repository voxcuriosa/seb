/**
 * payloadHash.js
 * Kanonisk SHA-256 for innleverte prøve-PDF-er.
 *  - v1/v2 (CURIOSA_LOCAL_EXAM_SUBMISSION fra curiosa.no): identisk med
 *    voxkunnskap/src/utils/localMode/examPdfGenerator.js for bakoverkompatibilitet.
 *  - v3 (CURIOSA_SEB_ESSAY_SUBMISSION): dekker receiptCode, examId, startedAt, completedAt,
 *    wordCount, activeSeconds, incidentCount, pasteIncidents, essayText og INTEGRITY_SALT.
 *  - v4 (CURIOSA_SEB_ESSAY_SUBMISSION): dekker i tillegg examTitle, appSwitchIncidents,
 *    focusLossIncidents, incidents-listen, sebConfigKey og sebVersion.
 *
 * Merk: saltet er offentlig (ligger i JavaScript). Hashen avslører vanlig redigering,
 * mens Ed25519-serversignaturen (signature.js) beskytter mot omberegning.
 */
import { sha256Hex } from './sha256';

export const INTEGRITY_SALT = 'CURIOSA_LOCAL_EXAM_V1_INTEGRITY';
export const SEB_ESSAY_TYPE = 'CURIOSA_SEB_ESSAY_SUBMISSION';
export const LEGACY_EXAM_TYPE = 'CURIOSA_LOCAL_EXAM_SUBMISSION';

function safeStr(val) {
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  return '';
}

function safeNum(val) {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val === 'string' && val.trim() !== '') {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function safeVersion(p) {
  if (!p || typeof p !== 'object') return 0;
  const v = p.version;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

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
  if (safeVersion(p) >= 2) {
    data.startedAt = p.startedAt;
    data.completedAt = p.completedAt;
  }
  data.salt = INTEGRITY_SALT;
  return data;
}

function sebEssayCanonical(p) {
  if (safeVersion(p) >= 4) {
    return {
      version: 4,
      receiptCode: p.receiptCode,
      ...(p.nonce ? { nonce: p.nonce } : {}),
      examId: p.examId,
      examTitle: p.examTitle || '',
      startedAt: p.startedAt,
      completedAt: p.completedAt,
      wordCount: p.wordCount,
      activeSeconds: p.activeSeconds,
      incidentCount: p.incidentCount,
      pasteIncidents: p.pasteIncidents,
      appSwitchIncidents: p.appSwitchIncidents ?? 0,
      focusLossIncidents: p.focusLossIncidents ?? 0,
      incidents: Array.isArray(p.incidents)
        ? p.incidents.map((i) => ({
          type: safeStr(i?.type),
          at: safeStr(i?.at),
          detail: safeStr(i?.detail),
          seconds: safeNum(i?.seconds)
        }))
        : [],
      sebConfigKey: p.sebConfigKey || null,
      sebVersion: p.sebVersion || null,
      essayText: p.essayText,
      salt: INTEGRITY_SALT
    };
  }
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
    if (typeof b64 !== 'string') return null;
    const binary = atob(b64.trim());
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
