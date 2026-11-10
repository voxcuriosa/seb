/**
 * examPdfParser.js
 * Leser og verifiserer innleverte prøve-PDF-er 100 % lokalt i lærerens nettleser.
 *
 *  Lag 1: SHA-256 av kanonisk payload (CURIOSA_PAYLOAD i Subject/Keywords, fallback CURIOSA_DATA_START)
 *  Lag 2: Synlig tekst (pdf.js), eksakt rekonstruksjon og PDF-struktursjekk (pdf-lib)
 *  Lag 3: Ed25519-serversignatur over hashen + tidslogikk (signature.js)
 */
import {
  PDFDocument,
  PDFName,
  PDFDict,
  PDFArray,
  PDFRawStream,
  decodePDFRawStream
} from 'pdf-lib';
import {
  computeExamPayloadSha256,
  decodePayload,
  encodePayload,
  SEB_ESSAY_TYPE,
  LEGACY_EXAM_TYPE
} from './payloadHash';
import { compactForCompare, extractVisibleBody } from './textNormalize';
import { verifySebSignature } from './signature';
import { extractVisibleText } from '../pdf/pdfjsLoader';
import { docToPlainText } from '../exam/essayDocModel';
import { isPdfFile, MAX_DROP_FILES } from '../files';
import { renderEssayPdf } from '../exam/essayPdfGenerator';

const PAYLOAD_RE = /CURIOSA_PAYLOAD:([A-Za-z0-9+/=]+)/;
const DATA_RE = /CURIOSA_DATA_START:([A-Za-z0-9+/=]+):CURIOSA_DATA_END/;
export const MAX_PDF_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_ESSAY_DOC_DEPTH = 16;

function safeStr(val, fallback = '') {
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  return fallback;
}

function safeOptStr(val) {
  if (val === undefined || val === null) return undefined;
  return safeStr(val, '');
}

function safeNum(val, fallback = 0) {
  if (typeof val === 'number') return Number.isFinite(val) ? val : fallback;
  if (typeof val === 'string' && val.trim() !== '') {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

export function isSafeDocDepth(node, maxDepth = MAX_ESSAY_DOC_DEPTH) {
  if (node === null || node === undefined) return true;
  if (typeof node !== 'object') return false;
  const stack = [{ value: node, depth: 1 }];
  let visited = 0;
  while (stack.length > 0) {
    const { value, depth } = stack.pop();
    if (depth > maxDepth) return false;
    visited += 1;
    if (visited > 50_000) return false;
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        if (item && typeof item === 'object') {
          stack.push({ value: item, depth: depth + 1 });
        }
      }
    } else {
      const keys = Object.keys(value);
      for (let i = 0; i < keys.length; i++) {
        const child = value[keys[i]];
        if (child && typeof child === 'object') {
          stack.push({ value: child, depth: Array.isArray(child) ? depth : depth + 1 });
        }
      }
    }
  }
  return true;
}

function sanitizeIncident(item) {
  if (typeof item === 'string') {
    return { type: '', at: '', detail: item, seconds: 0 };
  }
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return { type: '', at: '', detail: '', seconds: 0 };
  }
  const clean = {
    type: safeStr(item.type),
    at: safeStr(item.at || item.timestamp),
    detail: safeStr(item.detail),
    seconds: safeNum(item.seconds, 0)
  };
  if (item.message !== undefined && item.message !== null) {
    clean.message = safeStr(item.message);
  }
  return clean;
}

function sanitizeSebPayload(raw) {
  const docDepthOk = isSafeDocDepth(raw.essayDoc, MAX_ESSAY_DOC_DEPTH);
  const safeIncidents = Array.isArray(raw.incidents)
    ? raw.incidents.slice(0, 500).map(sanitizeIncident)
    : [];
  const payload = {
    ...raw,
    type: safeStr(raw.type),
    version: raw.version !== undefined ? safeNum(raw.version, 0) : undefined,
    receiptCode: safeStr(raw.receiptCode),
    ...(raw.nonce !== undefined ? { nonce: safeStr(raw.nonce) } : {}),
    examId: safeStr(raw.examId),
    examTitle: safeStr(raw.examTitle),
    ...(raw.topicId !== undefined ? { topicId: safeStr(raw.topicId) } : {}),
    ...(raw.topicTitle !== undefined ? { topicTitle: safeStr(raw.topicTitle) } : {}),
    startedAt: safeStr(raw.startedAt),
    completedAt: safeStr(raw.completedAt),
    wordCount: safeNum(raw.wordCount, 0),
    activeSeconds: safeNum(raw.activeSeconds, 0),
    incidentCount: safeNum(raw.incidentCount, 0),
    pasteIncidents: safeNum(raw.pasteIncidents, 0),
    appSwitchIncidents: safeNum(raw.appSwitchIncidents, 0),
    focusLossIncidents: safeNum(raw.focusLossIncidents, 0),
    incidents: safeIncidents,
    ...(raw.sebConfigKey ? { sebConfigKey: safeStr(raw.sebConfigKey) } : {}),
    ...(raw.sebVersion ? { sebVersion: safeStr(raw.sebVersion) } : {}),
    essayText: safeStr(raw.essayText),
    essayDoc: docDepthOk && raw.essayDoc && typeof raw.essayDoc === 'object' && !Array.isArray(raw.essayDoc)
      ? raw.essayDoc
      : null,
    sha256: safeStr(raw.sha256),
    ...(raw.signature !== undefined ? { signature: safeOptStr(raw.signature) } : {}),
    ...(raw.signedAt !== undefined ? { signedAt: safeOptStr(raw.signedAt) } : {}),
    ...(raw.keyId !== undefined ? { keyId: safeOptStr(raw.keyId) } : {})
  };
  return { payload, docDepthOk };
}

export function folderNameFromPath(relativePath = '') {
  const parts = safeStr(relativePath).split('/').filter(Boolean);
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
      if (p) return { payload: p, encodedPayload: match[1], source: 'metadata' };
    }
  } catch {
    /* fall gjennom til rå-søk */
  }
  try {
    const raw = new TextDecoder('latin1').decode(bytes);
    const m = raw.match(DATA_RE);
    if (m) {
      const p = decodePayload(m[1]);
      if (p) return { payload: p, encodedPayload: m[1], source: 'raw' };
    }
  } catch {
    /* ignorer */
  }
  return { payload: null, encodedPayload: null, source: null };
}

export function stripDataLine(text, encodedPayload) {
  const compact = safeStr(text).replace(/\s+/g, '');
  const enc = safeStr(encodedPayload).replace(/\s+/g, '');
  if (!enc) return compact;
  const exactMarker = `CURIOSA_DATA_START:${enc}:CURIOSA_DATA_END`;
  const idx = compact.indexOf(exactMarker);
  if (idx !== -1) {
    return compact.slice(0, idx) + compact.slice(idx + exactMarker.length);
  }
  const prefixTag = 'CURIOSA_DATA_START:';
  const tailIdx = compact.lastIndexOf(prefixTag);
  if (tailIdx !== -1) {
    const tail = compact.slice(tailIdx);
    const minLen = prefixTag.length + Math.min(enc.length, 32);
    if (tail.length >= minLen && exactMarker.startsWith(tail)) {
      return compact.slice(0, tailIdx);
    }
  }
  return compact;
}

function decodeStreamBytes(streamObj) {
  if (!streamObj) return null;
  try {
    if (streamObj instanceof PDFRawStream) {
      return decodePDFRawStream(streamObj).decode();
    }
    if (typeof streamObj.getUnencodedContents === 'function') {
      return streamObj.getUnencodedContents();
    }
    if (typeof streamObj.getContents === 'function') {
      return streamObj.getContents();
    }
    return null;
  } catch {
    return null;
  }
}

function stripPdfLiteralsCommentsAndNames(raw) {
  let out = '';
  let i = 0;
  const len = raw.length;
  while (i < len) {
    const ch = raw[i];
    if (ch === '%') {
      while (i < len && raw[i] !== '\n' && raw[i] !== '\r') i += 1;
      out += ' ';
    } else if (ch === '(') {
      let depth = 1;
      i += 1;
      while (i < len && depth > 0) {
        if (raw[i] === '\\') {
          i += 2;
          continue;
        }
        if (raw[i] === '(') depth += 1;
        else if (raw[i] === ')') depth -= 1;
        i += 1;
      }
      out += ' ';
    } else if (ch === '<' && raw[i + 1] !== '<') {
      i += 1;
      while (i < len && raw[i] !== '>') i += 1;
      i += 1;
      out += ' ';
    } else if (ch === '/') {
      i += 1;
      while (i < len && !/[\s/<>[\]()%]/.test(raw[i])) i += 1;
      out += ' ';
    } else {
      out += ch;
      i += 1;
    }
  }
  return out;
}

function inspectContentStreamOperators(bytes) {
  const raw = new TextDecoder('latin1').decode(bytes);
  const cleaned = stripPdfLiteralsCommentsAndNames(raw);
  if (/(?:^|[\s[\]])[37]\s+Tr(?=[\s[\]]|$)/.test(cleaned)) {
    return { ok: false, detail: 'PDF-siden inneholder usynlig tekstmodus (3 Tr) lagt til etter eksport.' };
  }
  if (/(?:^|[\s[\]])(?:c|v|y)(?=[\s[\]]|$)/.test(cleaned)) {
    return { ok: false, detail: 'PDF-siden inneholder vektorkurver (utlinjet grafikk eller bokstaver) lagt til etter eksport.' };
  }
  if (/(?:^|[\s[\]])(?:BI|Do)(?=[\s[\]]|$)/.test(cleaned)) {
    return { ok: false, detail: 'PDF-siden inneholder innlagte bilde- eller XObject-operatorer.' };
  }
  return { ok: true };
}

async function verifyPdfStructure(rawBytes, expectedBytes) {
  const [submittedDoc, expectedDoc] = await Promise.all([
    PDFDocument.load(rawBytes, { updateMetadata: false }),
    PDFDocument.load(expectedBytes, { updateMetadata: false })
  ]);
  if (submittedDoc.isEncrypted) {
    return { ok: false, detail: 'PDF-en er kryptert og stammer ikke fra SEB-eksporten.' };
  }
  if (submittedDoc.getPageCount() !== expectedDoc.getPageCount()) {
    return { ok: false, detail: 'Sideantallet i PDF-en avviker fra den signerte besvarelsen.' };
  }
  const catalog = submittedDoc.catalog;
  for (const forbidden of ['AcroForm', 'JavaScript', 'OpenAction', 'AA']) {
    if (catalog.lookup(PDFName.of(forbidden))) {
      return { ok: false, detail: `PDF-katalogen inneholder ulovlig struktur (/${forbidden}).` };
    }
  }
  const namesDict = catalog.lookup(PDFName.of('Names'));
  if (namesDict instanceof PDFDict) {
    if (namesDict.lookup(PDFName.of('JavaScript')) || namesDict.lookup(PDFName.of('EmbeddedFiles'))) {
      return { ok: false, detail: 'PDF-katalogen inneholder innebygde skript eller filer.' };
    }
  }

  let totalDecodedBytes = 0;
  const pages = submittedDoc.getPages();
  for (let pIdx = 0; pIdx < pages.length; pIdx++) {
    const pageNode = pages[pIdx].node;
    if (pageNode.lookup(PDFName.of('AA'))) {
      return { ok: false, detail: 'PDF-siden inneholder automatiske handlinger (/AA).' };
    }
    const annots = pageNode.lookup(PDFName.of('Annots'));
    if (annots && (!(annots instanceof PDFArray) || annots.size() > 0)) {
      return { ok: false, detail: 'PDF-siden inneholder annotasjoner eller kommentarer (/Annots).' };
    }
    const resources = pageNode.Resources?.() || pageNode.lookup(PDFName.of('Resources'));
    if (resources instanceof PDFDict) {
      const xObject = resources.lookup(PDFName.of('XObject'));
      if (xObject && (!(xObject instanceof PDFDict) || xObject.entries().length > 0)) {
        return { ok: false, detail: 'PDF-siden inneholder bilder eller grafikkobjekter (/XObject).' };
      }
    }
    const contents = pageNode.lookup(PDFName.of('Contents'));
    if (!contents) {
      return { ok: false, detail: 'PDF-siden mangler innholdsstrøm.' };
    }
    const streamObjs = contents instanceof PDFArray
      ? Array.from({ length: contents.size() }, (_, idx) => submittedDoc.context.lookup(contents.get(idx)))
      : [contents];
    for (const streamObj of streamObjs) {
      const decoded = decodeStreamBytes(streamObj);
      if (!decoded) {
        return { ok: false, detail: 'Kunne ikke dekode innholdsstrøm i PDF-en.' };
      }
      totalDecodedBytes += decoded.byteLength;
      if (totalDecodedBytes > MAX_PDF_FILE_BYTES) {
        return { ok: false, detail: 'Dekomprimert PDF-innhold overskrider sikkerhetsgrensen.' };
      }
      const opsCheck = inspectContentStreamOperators(decoded);
      if (!opsCheck.ok) return opsCheck;
    }
  }
  return { ok: true };
}

async function checkSebEssayVisible(payload, visibleText, rawBytes, expectedBytes, encodedPayload) {
  const body = extractVisibleBody(visibleText, payload.receiptCode);
  if (body === null) {
    return { ok: false, detail: 'Markørene rundt besvarelsen mangler i PDF-teksten.' };
  }
  if (body !== compactForCompare(payload.essayText)) {
    return { ok: false, detail: 'Synlig besvarelse i PDF-en avviker fra den signerte teksten.' };
  }
  const renderedBytes = expectedBytes || await renderEssayPdf(payload);
  const expectedText = await extractVisibleText(renderedBytes.slice());
  const expectedEncoded = encodePayload(payload);
  const actualEncoded = encodedPayload || expectedEncoded;
  if (stripDataLine(expectedText, expectedEncoded) !== stripDataLine(visibleText, actualEncoded)) {
    return { ok: false, detail: 'PDF-sidene inneholder tekst som er lagt til eller endret etter eksport.' };
  }
  if (rawBytes) {
    const structRes = await verifyPdfStructure(rawBytes, renderedBytes);
    if (!structRes.ok) return structRes;
  }
  return { ok: true, detail: 'Synlig tekst og PDF-struktur samsvarer nøyaktig med metadata.' };
}

export async function parseExamPdfFile(file) {
  const relativePath = file.webkitRelativePath || file.name;
  const base = {
    id: `${relativePath}-${file.size}-${file.lastModified || 0}`,
    fileName: file.name,
    relativePath,
    folderName: folderNameFromPath(relativePath)
  };
  if (Number(file?.size) > MAX_PDF_FILE_BYTES) {
    return { ...base, verdict: 'invalid', reasons: ['PDF-filen er for stor (maks 20 MB).'] };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > MAX_PDF_FILE_BYTES) {
    return { ...base, verdict: 'invalid', reasons: ['PDF-filen er for stor (maks 20 MB).'] };
  }

  const { payload: rawPayload, encodedPayload } = await readPayload(bytes);

  if (!rawPayload) {
    return { ...base, verdict: 'not-curiosa', reasons: ['Fant ingen Curiosa-kvittering i PDF-en.'] };
  }
  if (rawPayload.type === LEGACY_EXAM_TYPE) {
    return {
      ...base,
      verdict: 'not-curiosa',
      reasons: ['Eldre Curiosa-format uten SEB-beskyttelse gir ikke gyldig SEB-verifikasjon.']
    };
  }
  if (rawPayload.type !== SEB_ESSAY_TYPE) {
    return { ...base, verdict: 'not-curiosa', reasons: ['Fant ingen Curiosa-kvittering i PDF-en.'] };
  }

  const { payload, docDepthOk } = sanitizeSebPayload(rawPayload);
  const reasons = [];
  const primitiveTypesValid = typeof rawPayload.essayText === 'string'
    && typeof rawPayload.receiptCode === 'string'
    && typeof rawPayload.examId === 'string';
  const expected = await computeExamPayloadSha256(rawPayload);
  const layer1 = primitiveTypesValid && Boolean(payload.sha256) && expected === payload.sha256;
  if (!layer1) reasons.push('SHA-256 stemmer ikke: innholdet er endret etter eksport.');

  let layer2;
  if (!docDepthOk) {
    layer2 = { ok: false, detail: 'Dokumentstrukturen i PDF-en overskrider maks tillatt dybde (16).' };
  } else {
    try {
      const visible = await extractVisibleText(bytes.slice());
      const expectedBytes = await renderEssayPdf(payload);
      layer2 = await checkSebEssayVisible(payload, visible, bytes, expectedBytes, encodedPayload);
    } catch (err) {
      layer2 = { ok: false, detail: `Kunne ikke lese synlig tekst (${err?.message || 'ukjent feil'}).` };
    }
  }
  if (!layer2.ok) reasons.push(layer2.detail);

  const signature = await verifySebSignature(payload);
  const sigBad = signature.status === 'invalid' || signature.status === 'unknown-key' || signature.status === 'late';
  if (sigBad) reasons.push(signature.detail);

  let timeOk = true;
  if (signature.status === 'valid' && payload.signedAt && payload.startedAt) {
    const signedMs = Date.parse(payload.signedAt);
    const startedMs = Date.parse(payload.startedAt);
    const maxAllowedActive = Math.max(300, (signedMs - startedMs) / 1000 + 300);
    if (!Number.isFinite(signedMs) || !Number.isFinite(startedMs) || payload.activeSeconds > maxAllowedActive) {
      timeOk = false;
      reasons.push('Ugyldig tidslogikk: oppgitt aktiv skrivetid overstiger tiden før serversignering.');
    }
  }

  const formattingTrusted = Boolean(
    docDepthOk
    && payload.essayDoc
    && docToPlainText(payload.essayDoc) === payload.essayText
  );

  let verdict = 'invalid';
  if (layer1 && layer2.ok && !sigBad && timeOk) {
    verdict = signature.status === 'valid' ? 'verified' : 'verified-unsigned';
  }

  return { ...base, verdict, reasons, payload, layer1, layer2, signature, formattingTrusted };
}

export async function parseExamPdfFiles(fileList, onProgress) {
  const candidates = Array.from(fileList || []).slice(0, MAX_DROP_FILES);
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
