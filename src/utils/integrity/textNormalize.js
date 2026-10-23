/**
 * textNormalize.js
 * Felles tekstnormalisering for PDF-generering og visuell verifisering (lag 2).
 * Generatoren tegner toWinAnsiSafe(tekst). Parseren sammenligner synlig tekst
 * med samme sanering, uten mellomrom (robust mot linjebryting i PDF-uttrekk).
 */

export function toWinAnsiSafe(str = '') {
  return String(str || '')
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u2022\u25CF\u25E6]/g, '-')
    .replace(/\t/g, ' ')
    .replace(/[^\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
}

/** Fjerner all whitespace etter WinAnsi-sanering. */
export function compactForCompare(str = '') {
  return toWinAnsiSafe(str).replace(/\s+/g, '');
}

export const BODY_START_MARKER = '=== BESVARELSE START ===';
export const BODY_END_MARKER = '=== BESVARELSE SLUTT ===';

export function footerText(pageNo, pageCount, receiptCode) {
  return `Side ${pageNo} av ${pageCount} - Kvittering #${receiptCode}`;
}

export function footerRegex(receiptCode) {
  const code = String(receiptCode || '').replace(/[^A-Z0-9]/gi, '');
  return new RegExp(`Side\\s*\\d+\\s*av\\s*\\d+\\s*-\\s*Kvittering\\s*#\\s*${code}`, 'g');
}

/**
 * Trekker ut elevteksten mellom markørene i den synlige PDF-teksten
 * og fjerner sidefot-linjene. Returnerer null hvis markørene mangler.
 */
export function extractVisibleBody(visibleText, receiptCode) {
  const text = String(visibleText || '');
  const compactText = text.replace(/\s+/g, '');
  const start = compactText.indexOf(BODY_START_MARKER.replace(/\s+/g, ''));
  const end = compactText.lastIndexOf(BODY_END_MARKER.replace(/\s+/g, ''));
  if (start === -1 || end === -1 || end < start) return null;
  const body = compactText.slice(start + BODY_START_MARKER.replace(/\s+/g, '').length, end);
  const code = String(receiptCode || '').replace(/[^A-Z0-9]/gi, '');
  return body.replace(new RegExp(`Side\\d+av\\d+-Kvittering#${code}`, 'g'), '');
}

export function countWords(text = '') {
  const trimmed = String(text || '').trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
