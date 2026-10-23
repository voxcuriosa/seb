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
      <string>${d.base64}</string>
      <key>dictionaryFormat</key>
      <integer>0</integer>
      <key>localeName</key>
      <string>${escapeXml(d.localeName)}</string>
    </dict>`).join('\n');
  return `${allowedXml}\n  <key>additionalDictionaries</key>\n  <array>\n${dicts}\n  </array>`;
}
