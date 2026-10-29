/**
 * essayPdfGenerator.js
 * Lager elevens sikrede prøve-PDF 100 % lokalt med pdf-lib.
 *  - CURIOSA_PAYLOAD (base64 JSON) i PDF Subject og Keywords
 *  - CURIOSA_DATA_START:...:CURIOSA_DATA_END som nesten usynlig linje på siste side (fallback)
 *  - Elevteksten mellom synlige markører, slik at lag 2 kan sammenligne synlig tekst med payload
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  computeExamPayloadSha256,
  encodePayload,
  SEB_ESSAY_TYPE
} from '../integrity/payloadHash';
import { generateReceiptCode } from '../integrity/sha256';
import {
  BODY_START_MARKER,
  BODY_END_MARKER,
  countWords,
  footerText,
  toWinAnsiSafe
} from '../integrity/textNormalize';
import { docToBlocks, blocksToPlainText } from './essayDocModel';
import { createLayout, drawFooters } from './essayPdfLayout';
import { formatDateTime, formatDuration } from './formatTime';

const GREEN = rgb(0.02, 0.45, 0.3);
const MUTED = rgb(0.35, 0.4, 0.48);

/** Bygger og hasher payload. Ingen navn eller personopplysninger inngår. */
export async function buildEssayPayload({ exam, essayDoc, startedAt, activeSeconds, incidents = [] }) {
  const essayText = blocksToPlainText(docToBlocks(essayDoc));
  const pasteIncidents = incidents.filter((i) => i?.type === 'PASTE').length;
  const appSwitchIncidents = incidents.filter((i) => i?.type === 'APP_SWITCH').length;
  const focusLossIncidents = incidents.filter((i) => i?.type === 'FOCUS_LOST').length;
  const sebSec = typeof window !== 'undefined' ? window.SafeExamBrowser?.security : null;
  const sebConfigKey = typeof sebSec?.configKey === 'string' && sebSec.configKey.length > 0 ? sebSec.configKey : null;
  const sebVersion = (typeof window !== 'undefined' && window.SafeExamBrowser?.version) || sebSec?.appVersion || null;
  const payload = {
    type: SEB_ESSAY_TYPE,
    version: 3,
    receiptCode: generateReceiptCode(),
    examId: exam.id,
    examTitle: exam.title || 'Prøve',
    startedAt: new Date(startedAt || Date.now()).toISOString(),
    completedAt: new Date().toISOString(),
    wordCount: countWords(essayText),
    activeSeconds: Math.max(0, Math.round(Number(activeSeconds) || 0)),
    incidentCount: incidents.length,
    pasteIncidents,
    appSwitchIncidents,
    focusLossIncidents,
    incidents: incidents.slice(0, 200),
    ...(sebConfigKey ? { sebConfigKey } : {}),
    ...(sebVersion ? { sebVersion } : {}),
    essayText,
    essayDoc
  };
  payload.sha256 = await computeExamPayloadSha256(payload);
  return payload;
}

function signatureLine(payload) {
  if (payload.signature) return `Serversignatur (Ed25519, ${payload.keyId}): signert ${formatDateTime(payload.signedAt)}`;
  return 'Serversignatur: mangler (ingen nettforbindelse ved innlevering)';
}

export async function renderEssayPdf(payload) {
  const pdfDoc = await PDFDocument.create();
  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique)
  };
  const encoded = encodePayload(payload);
  pdfDoc.setTitle(toWinAnsiSafe(`Prøvebesvarelse #${payload.receiptCode} - ${payload.examTitle}`));
  pdfDoc.setSubject(`CURIOSA_PAYLOAD:${encoded}`);
  pdfDoc.setKeywords([`CURIOSA_PAYLOAD:${encoded}`]);
  pdfDoc.setProducer('Vox Curiosa SEB');
  pdfDoc.setCreator('voxcuriosa.no/seb');

  const L = createLayout(pdfDoc, fonts);
  L.text(`PRØVEBESVARELSE - KVITTERING #${payload.receiptCode}`, { size: 14, bold: true, color: GREEN, spacing: 20 });
  L.text(payload.examTitle, { size: 12, bold: true, spacing: 17 });
  L.text(`Start: ${formatDateTime(payload.startedAt)}   Levert: ${formatDateTime(payload.completedAt)}`, { size: 9.5, spacing: 14 });
  const appSwitch = payload.appSwitchIncidents || 0;
  const focusLoss = payload.focusLossIncidents || 0;
  const switchLabel = appSwitch > 0
    ? `App-bytte: ${appSwitch}`
    : `Fokustap: ${focusLoss}`;
  L.text(
    `Aktiv tid: ${formatDuration(payload.activeSeconds)}   Ord: ${payload.wordCount}   ${switchLabel}   Innliminger: ${payload.pasteIncidents}`,
    { size: 9.5, spacing: 14, color: MUTED }
  );
  L.gap(10);
  L.text(BODY_START_MARKER, { size: 8, color: MUTED, spacing: 16 });

  for (const block of docToBlocks(payload.essayDoc)) {
    const size = block.kind === 'h1' ? 16 : block.kind === 'h2' ? 13 : 11;
    if (block.kind === 'h1' || block.kind === 'h2') L.gap(6);
    block.lines.forEach((runs, idx) => {
      const styled = block.kind === 'h1' || block.kind === 'h2' ? runs.map((r) => ({ ...r, bold: true })) : runs;
      L.runs(styled, {
        size,
        indent: block.indent * 16,
        marker: idx === 0 ? block.marker : '',
        spacing: size * 1.5
      });
    });
    L.gap(block.kind === 'li' ? 1 : 5);
  }

  L.text(BODY_END_MARKER, { size: 8, color: MUTED, spacing: 18 });
  L.gap(8);
  L.ensureSpace(60);
  L.text(`Kontrollkode (SHA-256): ${payload.sha256}`, { size: 7.5, color: MUTED, spacing: 11 });
  L.text(signatureLine(payload), { size: 7.5, color: MUTED, spacing: 11 });
  L.text('Generert lokalt i Safe Exam Browser. Ingen elevdata er lagret i skyen.', { size: 7.5, color: MUTED, spacing: 11 });

  drawFooters(pdfDoc, fonts.regular, (n, total) => footerText(n, total, payload.receiptCode));

  const lastPage = pdfDoc.getPages().at(-1);
  lastPage.drawText(`CURIOSA_DATA_START:${encoded}:CURIOSA_DATA_END`, {
    x: 56,
    y: 14,
    size: 1,
    font: fonts.regular,
    color: rgb(0.97, 0.97, 0.97)
  });

  return pdfDoc.save();
}

export function essayPdfFileName(payload) {
  const safeTitle = String(payload.examTitle || 'prove')
    .toLowerCase()
    .replace(/[^a-z0-9æøå_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 35) || 'prove';
  return `prove-${safeTitle}-${payload.receiptCode}.pdf`;
}

function bytesToBase64(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < arr.length; i += chunk) {
    binary += String.fromCharCode.apply(null, arr.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function isSebBrowser() {
  if (typeof navigator === 'undefined') return false;
  return /SEB|SafeExamBrowser/i.test(navigator.userAgent || '');
}

export function downloadBytes(bytes, fileName, type = 'application/pdf') {
  const useDataUri = isSebBrowser();
  const url = useDataUri
    ? `data:${type};base64,${bytesToBase64(bytes)}`
    : URL.createObjectURL(new Blob([bytes], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (!useDataUri) {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
