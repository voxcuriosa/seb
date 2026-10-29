/**
 * examPdfParser.js
 * Leser og verifiserer innleverte prøve-PDF-er 100 % lokalt i lærerens nettleser.
 * Bygger videre på voxkunnskap/src/utils/localMode/examPdfParser.js (bakoverkompatibel).
 *
 *  Lag 1: SHA-256 av kanonisk payload (CURIOSA_PAYLOAD i Subject/Keywords, fallback CURIOSA_DATA_START)
 *  Lag 2: Synlig tekst (pdf.js) mellom markørene må være identisk med essayText (uten whitespace)
 *  Lag 3: Ed25519-serversignatur over hashen (signature.js)
 */
import { PDFDocument } from 'pdf-lib';
import {
  computeExamPayloadSha256,
  decodePayload,
  SEB_ESSAY_TYPE,
  LEGACY_EXAM_TYPE
} from './payloadHash';
import { compactForCompare, extractVisibleBody } from './textNormalize';
import { verifySebSignature } from './signature';
import { extractVisibleText } from '../pdf/pdfjsLoader';
import { docToPlainText } from '../exam/essayDocModel';
import { isPdfFile } from '../files';
import { renderEssayPdf } from '../exam/essayPdfGenerator';

const PAYLOAD_RE = /CURIOSA_PAYLOAD:([A-Za-z0-9+/=]+)/;
const DATA_RE = /CURIOSA_DATA_START:([A-Za-z0-9+/=]+):CURIOSA_DATA_END/;

export function folderNameFromPath(relativePath = '') {
  const parts = String(relativePath || '').split('/').filter(Boolean);
  if (parts.length < 2) return '';
  const swIdx = parts.findIndex((p) => /^student work$/i.test(p));
  if (swIdx !== -1 && parts[swIdx + 1] && swIdx + 1 < parts.length - 1) return parts[swIdx + 1];
  return parts[parts.length - 2];
}

async function readPayload(bytes) {
  try {
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const subject = pdfDoc.getSubject() || '';
    const keywords = pdfDoc.getKeywords() || '';
    const match = subject.match(PAYLOAD_RE) || keywords.match(PAYLOAD_RE);
    if (match) {
      const p = decodePayload(match[1]);
      if (p) return { payload: p, source: 'metadata' };
    }
  } catch {
    /* fall gjennom til rå-søk */
  }
  try {
    const raw = new TextDecoder('latin1').decode(bytes);
    const m = raw.match(DATA_RE);
    if (m) {
      const p = decodePayload(m[1]);
      if (p) return { payload: p, source: 'raw' };
    }
  } catch {
    /* ignorer */
  }
  return { payload: null, source: null };
}

function stripDataLine(text) {
  return String(text || '').replace(/CURIOSA_DATA_START:[\s\S]*?:CURIOSA_DATA_END/g, '').replace(/\s+/g, '');
}

async function checkSebEssayVisible(payload, visibleText) {
  const body = extractVisibleBody(visibleText, payload.receiptCode);
  if (body === null) {
    return { ok: false, detail: 'Markørene rundt besvarelsen mangler i PDF-teksten.' };
  }
  if (body !== compactForCompare(payload.essayText)) {
    return { ok: false, detail: 'Synlig besvarelse i PDF-en avviker fra den signerte teksten.' };
  }
  // Streng sjekk: rendre PDF-en på nytt fra payload og sammenligne HELE den synlige teksten.
  // Avslører også tekst som er lagt til eller endret utenfor besvarelsesområdet.
  const expectedBytes = await renderEssayPdf(payload);
  const expectedText = await extractVisibleText(expectedBytes);
  if (stripDataLine(expectedText) !== stripDataLine(visibleText)) {
    return { ok: false, detail: 'PDF-sidene inneholder tekst som er lagt til eller endret etter eksport.' };
  }
  return { ok: true, detail: 'Synlig tekst samsvarer nøyaktig med metadata.' };
}

function checkLegacyVisible(payload, visibleText) {
  const norm = visibleText.replace(/\s+/g, ' ').toLowerCase();
  if (payload.receiptCode && !norm.includes(String(payload.receiptCode).toLowerCase())) {
    return { ok: false, detail: `Kvitteringskode #${payload.receiptCode} mangler i PDF-teksten.` };
  }
  if (payload.sha256 && !norm.replace(/\s/g, '').includes(String(payload.sha256).toLowerCase())) {
    return { ok: false, detail: 'Signaturhash på PDF-siden mangler eller stemmer ikke med metadata.' };
  }
  return { ok: true, detail: 'Nøkkeldata samsvarer (eldre Curiosa-format).' };
}

export async function parseExamPdfFile(file) {
  const relativePath = file.webkitRelativePath || file.name;
  const base = {
    id: `${relativePath}-${file.size}-${file.lastModified || 0}`,
    fileName: file.name,
    relativePath,
    folderName: folderNameFromPath(relativePath)
  };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { payload } = await readPayload(bytes);

  if (!payload || (payload.type !== SEB_ESSAY_TYPE && payload.type !== LEGACY_EXAM_TYPE)) {
    return { ...base, verdict: 'not-curiosa', reasons: ['Fant ingen Curiosa-kvittering i PDF-en.'] };
  }

  const reasons = [];
  const expected = await computeExamPayloadSha256(payload);
  const layer1 = Boolean(payload.sha256) && expected === payload.sha256;
  if (!layer1) reasons.push('SHA-256 stemmer ikke: innholdet er endret etter eksport.');

  let layer2;
  try {
    const visible = await extractVisibleText(bytes.slice());
    layer2 = payload.type === SEB_ESSAY_TYPE
      ? await checkSebEssayVisible(payload, visible)
      : checkLegacyVisible(payload, visible);
  } catch (err) {
    layer2 = { ok: false, detail: `Kunne ikke lese synlig tekst (${err?.message || 'ukjent feil'}).` };
  }
  if (!layer2.ok) reasons.push(layer2.detail);

  const signature = payload.type === SEB_ESSAY_TYPE
    ? await verifySebSignature(payload)
    : { status: 'missing', detail: 'Eldre format uten serversignatur.' };
  const sigBad = signature.status === 'invalid' || signature.status === 'unknown-key' || signature.status === 'late';
  if (sigBad) reasons.push(signature.detail);

  const formattingTrusted = payload.type === SEB_ESSAY_TYPE && payload.essayDoc
    && docToPlainText(payload.essayDoc) === payload.essayText;

  let verdict = 'invalid';
  if (layer1 && layer2.ok && !sigBad) {
    verdict = signature.status === 'valid' ? 'verified' : 'verified-unsigned';
  }

  return { ...base, verdict, reasons, payload, layer1, layer2, signature, formattingTrusted };
}

export async function parseExamPdfFiles(fileList, onProgress) {
  const candidates = Array.from(fileList || []);
  const pdfs = [];
  for (const f of candidates) {
    if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf' || await isPdfFile(f)) {
      pdfs.push(f);
    }
  }
  const results = [];
  for (let i = 0; i < pdfs.length; i++) {
    try {
      results.push(await parseExamPdfFile(pdfs[i]));
    } catch (err) {
      results.push({ id: `${pdfs[i].name}-${i}`, fileName: pdfs[i].name, verdict: 'not-curiosa', reasons: [err?.message || 'Ukjent feil'] });
    }
    onProgress?.(i + 1, pdfs.length);
  }
  return results;
}
