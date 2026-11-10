/**
 * textNormalize.js
 * Felles tekstnormalisering for PDF-generering og visuell verifisering (lag 2).
 * Generatoren tegner toWinAnsiSafe(tekst). Parseren sammenligner synlig tekst
 * med samme sanering, uten mellomrom (robust mot linjebryting i PDF-uttrekk).
 */

function asString(str) {
  if (typeof str === 'string') return str;
  if (typeof str === 'number' || typeof str === 'boolean') return String(str);
  return '';
}

export function toWinAnsiSafe(str = '') {
  return asString(str)
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u2022\u25CF\u25E6]/g, '-')
    .replace(/\t/g, ' ')
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
}

/** Fjerner all whitespace etter WinAnsi-sanering. */
export function compactForCompare(str = '') {
  return toWinAnsiSafe(str).replace(/\s+/g, '');
}

export const BODY_START_MARKER = '=== BESVARELSE START ===';
export const BODY_END_MARKER = '=== BESVARELSE SLUTT ===';

export function footerText(pageNo, pageCount, receiptCode) {
  return `Side ${pageNo} av ${pageCount} - Kvittering #${asString(receiptCode)}`;
}

export function footerRegex(receiptCode) {
  const code = asString(receiptCode).replace(/[^A-Z0-9]/gi, '');
  return new RegExp(`Side\\s*\\d+\\s*av\\s*\\d+\\s*-\\s*Kvittering\\s*#\\s*${code}`, 'g');
}

/**
 * Trekker ut elevteksten mellom markørene i den synlige PDF-teksten
 * og fjerner sidefot-linjene. Returnerer null hvis markørene mangler.
 */
export function extractVisibleBody(visibleText, receiptCode) {
  const text = asString(visibleText);
  const compactText = text.replace(/\s+/g, '');
  const startMarker = BODY_START_MARKER.replace(/\s+/g, '');
  const endMarker = BODY_END_MARKER.replace(/\s+/g, '');
  const start = compactText.indexOf(startMarker);
  const end = compactText.lastIndexOf(endMarker);
  if (start === -1 || end === -1 || end < start) return null;
  const body = compactText.slice(start + startMarker.length, end);
  const code = asString(receiptCode).replace(/[^A-Z0-9]/gi, '');
  if (!code) return body;
  return body.replace(new RegExp(`Side\\d+av\\d+-Kvittering#${code}`, 'g'), '');
}

export function countWords(text = '') {
  const trimmed = asString(text).trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
