/**
 * sebDictionaries.js
 * Bygger innebygde Hunspell-ordbøker (Mozilla-format) for SEB sin stavekontroll.
 *
 * Format (SEB-dokumentasjonen, nøkkel additionalDictionaries):
 *   dictionaryData   = base64 av en ZIP med <locale>.aff og <locale>.dic
 *   dictionaryFormat = 0 (Mozilla)
 *   localeName       = f.eks. "nb-NO"
 * Ordbøkene kommer fra LibreOffice dict-no (GPL-2.0), se public/dictionaries/.
 *
 * MERK: Støtten i SEB 3.x for Windows må verifiseres manuelt. Hvis nøkkelen ignoreres,
 * brukes Windows sine installerte språkpakker.
 */
import { escapeXml } from './sebPlistParts';

export const EMBEDDED_DICTIONARY_LOCALES = ['nb-NO', 'nn-NO'];
export const BROWSER_SPELLCHECK_LOCALES = ['nb-NO', 'nn-NO', 'en-GB', 'en-US', 'de-DE', 'es-ES', 'fr-FR'];

/** Språk eleven kan velge i editoren (lang-attributtet). */
export const SPELLCHECK_LANGUAGES = [
  { code: 'nb-NO', label: 'Norsk bokmål' },
  { code: 'nn-NO', label: 'Norsk nynorsk' },
  { code: 'en-GB', label: 'Engelsk (UK)' },
  { code: 'en-US', label: 'Engelsk (US)' },
  { code: 'de-DE', label: 'Tysk' },
  { code: 'es-ES', label: 'Spansk' },
  { code: 'fr-FR', label: 'Fransk' }
];

export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Henter ZIP-filene fra /seb/dictionaries/ og returnerer [{ localeName, base64 }].
 * Feil ved henting er ikke fatale: .seb-filen lages da uten innebygde ordbøker.
 */
export async function loadEmbeddedDictionaries(baseUrl = `${import.meta.env.BASE_URL}dictionaries/`) {
  const results = [];
  for (const locale of EMBEDDED_DICTIONARY_LOCALES) {
    try {
      const res = await fetch(`${baseUrl}${locale}.zip`, { cache: 'force-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      results.push({ localeName: locale, base64: arrayBufferToBase64(buf) });
    } catch (err) {
      console.warn(`[SEB] Kunne ikke hente ordbok ${locale}:`, err?.message);
    }
  }
  return results;
}

export function buildDictionariesXml(dictionaries = []) {
  const allowed = SPELLCHECK_LANGUAGES.map((l) => `    <string>${escapeXml(l.code)}</string>`).join('\n');
  const allowedXml = `  <key>allowSpellCheckDictionary</key>\n  <array>\n${allowed}\n  </array>`;
  if (!dictionaries.length) return allowedXml;

  const dicts = dictionaries.map((d) => `    <dict>
      <key>dictionaryData</key>
      <data>${d.base64}</data>
      <key>dictionaryFormat</key>
      <integer>0</integer>
      <key>localeName</key>
      <string>${escapeXml(d.localeName)}</string>
    </dict>`).join('\n');
  return `${allowedXml}\n  <key>additionalDictionaries</key>\n  <array>\n${dicts}\n  </array>`;
}

const wordSetCache = new Map();
const ALPHABETS = {
  'nb-NO': 'abcdefghijklmnopqrstuvwxyzæøå',
  'nn-NO': 'abcdefghijklmnopqrstuvwxyzæøå',
  'en-GB': 'abcdefghijklmnopqrstuvwxyz',
  'en-US': 'abcdefghijklmnopqrstuvwxyz',
  'de-DE': 'abcdefghijklmnopqrstuvwxyzäöüß',
  'es-ES': 'abcdefghijklmnopqrstuvwxyzáéíóúüñ',
  'fr-FR': 'abcdefghijklmnopqrstuvwxyzéèêëàâîïôùûüçœ'
};
const COMPOUND_LOCALES = new Set(['nb-NO', 'nn-NO', 'de-DE']);
const PREFIXES = ['u', 'for', 'gjen', 'hoved', 'mis', 'sam', 'etter', 'til', 'over', 'under', 'på', 'av', 'inn', 'ut', 'opp', 'ned', 'om', 'un', 'ver', 'be', 'ent', 'er', 'ge', 'zer', 'auf', 'aus', 'ein', 'vor', 'mit', 'nach'];

export async function extractDicFromZipBuffer(buffer) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let off = 0;
  while (off + 30 <= bytes.length && view.getUint32(off, true) === 0x04034b50) {
    const method = view.getUint16(off + 8, true);
    const compSize = view.getUint32(off + 18, true);
    const nameLen = view.getUint16(off + 26, true);
    const extraLen = view.getUint16(off + 28, true);
    const name = new TextDecoder().decode(bytes.subarray(off + 30, off + 30 + nameLen));
    const dataStart = off + 30 + nameLen + extraLen;
    if (name.endsWith('.dic')) {
      const slice = bytes.subarray(dataStart, dataStart + compSize);
      if (method === 0) return new TextDecoder('utf-8').decode(slice);
      if (method === 8 && typeof DecompressionStream !== 'undefined') {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(slice);
        writer.close();
        const ab = await new Response(ds.readable).arrayBuffer();
        return new TextDecoder('utf-8').decode(ab);
      }
    }
    off = dataStart + compSize;
  }
  return '';
}

export function buildChecker(rawDic, locale = 'nb-NO') {
  const alphabet = ALPHABETS[locale] || ALPHABETS['nb-NO'];
  const allowCompounds = COMPOUND_LOCALES.has(locale);
  const words = new Set();
  const lines = rawDic.split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line[0] === '#' || line[0] === '\t') continue;
    const slash = line.indexOf('/');
    const tab = line.indexOf('\t');
    let end = line.length;
    if (slash !== -1 && slash < end) end = slash;
    if (tab !== -1 && tab < end) end = tab;
    const w = line.slice(0, end).trim();
    if (w && w[0] !== '-') words.add(w.toLowerCase());
  }

  const isCompound = (low) => {
    if (!allowCompounds || low.length < 7) return false;
    for (const p of PREFIXES) {
      if (low.startsWith(p) && low.length - p.length >= 4 && words.has(low.slice(p.length))) return true;
    }
    for (let i = 3; i <= low.length - 4; i++) {
      const left = low.slice(0, i);
      const right = low.slice(i);
      if (words.has(left) && words.has(right)) return true;
      if ((left.endsWith('s') || left.endsWith('e')) && left.length >= 4 && words.has(left.slice(0, -1)) && words.has(right)) {
        return true;
      }
    }
    return false;
  };

  const isValidWord = (token) => {
    if (!token || token.length <= 1) return true;
    if (/^[0-9.,:%+\-–—/]+$/.test(token)) return true;
    if (token.length <= 4 && token === token.toUpperCase() && /[A-ZÆØÅÄÖÜÉÈÊÁÍÓÚÑ]/.test(token)) return true;
    const low = token.toLowerCase();
    if (words.has(low)) return true;
    // Engelsk/fransk apostrof-suffiks eller prefiks (f.eks. student's, don't, l'école, d'un)
    if (low.includes("'") || low.includes('’')) {
      const norm = low.replace(/’/g, "'");
      if (words.has(norm)) return true;
      if (norm.endsWith("'s") && words.has(norm.slice(0, -2))) return true;
      const apoIdx = norm.indexOf("'");
      if (apoIdx > 0 && apoIdx <= 2 && words.has(norm.slice(apoIdx + 1))) return true;
    }
    if (low.includes('-')) {
      const parts = low.split('-').filter(Boolean);
      if (parts.length > 1 && parts.every((p) => p.length <= 1 || words.has(p) || isCompound(p))) return true;
    }
    return isCompound(low);
  };

  const matchCase = (suggestion, original) => {
    if (!original) return suggestion;
    if (original === original.toUpperCase() && original !== original.toLowerCase()) return suggestion.toUpperCase();
    if (original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
      return suggestion[0].toUpperCase() + suggestion.slice(1);
    }
    return suggestion;
  };

  const suggestWords = (token, max = 5) => {
    const low = String(token || '').toLowerCase();
    if (!low || low.length > 24) return [];
    const found = [];
    const seen = new Set([low]);
    const pushIfValid = (cand) => {
      if (seen.has(cand) || !words.has(cand)) return;
      seen.add(cand);
      found.push(matchCase(cand, token));
    };
    // 1. Bytte av nabobokstaver (f.eks. skolne -> skolen)
    for (let i = 0; i < low.length - 1 && found.length < max; i++) {
      pushIfValid(low.slice(0, i) + low[i + 1] + low[i] + low.slice(i + 2));
    }
    // 2. Sletting av én bokstav (f.eks. skoole -> skole)
    for (let i = 0; i < low.length && found.length < max; i++) {
      pushIfValid(low.slice(0, i) + low.slice(i + 1));
    }
    // 3. Erstatning av én bokstav
    for (let i = 0; i < low.length && found.length < max; i++) {
      for (let c = 0; c < alphabet.length && found.length < max; c++) {
        pushIfValid(low.slice(0, i) + alphabet[c] + low.slice(i + 1));
      }
    }
    // 4. Innsetting av én bokstav
    for (let i = 0; i <= low.length && found.length < max; i++) {
      for (let c = 0; c < alphabet.length && found.length < max; c++) {
        pushIfValid(low.slice(0, i) + alphabet[c] + low.slice(i));
      }
    }
    return found.slice(0, max);
  };

  return { words, isValidWord, suggestWords };
}

/**
 * Laster og pakker ut stavekontroll-ordbok (nb-NO, nn-NO, en-GB, en-US, de-DE, es-ES, fr-FR)
 * direkte i nettleseren, slik at røde streker og retteforslag fungerer 100 % på både Mac (WKWebView) og Windows.
 */
export function loadBrowserSpellchecker(locale = 'nb-NO', baseUrl = `${import.meta.env.BASE_URL}dictionaries/`) {
  if (!BROWSER_SPELLCHECK_LOCALES.includes(locale)) return Promise.resolve(null);
  if (wordSetCache.has(locale)) return wordSetCache.get(locale);
  const promise = (async () => {
    try {
      const res = await fetch(`${baseUrl}${locale}.zip`, { cache: 'force-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      const rawDic = await extractDicFromZipBuffer(buf);
      if (!rawDic) return null;
      return buildChecker(rawDic, locale);
    } catch (err) {
      console.warn(`[SEB] Kunne ikke laste stavekontroll for ${locale}:`, err?.message);
      wordSetCache.delete(locale);
      return null;
    }
  })();
  wordSetCache.set(locale, promise);
  return promise;
}
