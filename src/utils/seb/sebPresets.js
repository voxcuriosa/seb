/**
 * sebPresets.js
 * Forhåndsdefinerte norske skolekilder og URL-filterhjelpere for Safe Exam Browser (SEB).
 * Kopiert fra voxkunnskap/src/utils/localMode/sebPresets.js.
 */

export const PRESET_SEB_APPS = [
  {
    id: 'voxlex',
    title: 'VoxLex',
    subtitle: 'Norsk offline ordbok',
    description: 'Bokmål, nynorsk og engelsk ordbok for elever'
  },
  {
    id: 'ordnett',
    title: 'Ordnett Pluss',
    subtitle: 'Kunnskapsforlagets ordbøker',
    description: 'Digital ordbok-klient på elevens maskin'
  },
  {
    id: 'lingdys',
    title: 'Lingdys',
    subtitle: 'Lese- og skrivestøtte',
    description: 'Hjelpemiddel for dysleksi og skrivevansker'
  }
];

export const PRESET_SEB_WEBSITES = [
  {
    id: 'clarify',
    title: 'Clarify Ordbøker (Feide)',
    url: 'https://app.clarify.no/auth',
    domain: 'app.clarify.no',
    description: 'Kvalitetssikrede ordbøker, bøyning og opplesning med Feide-innlogging'
  },
  {
    id: 'ordbokene',
    title: 'Ordbøkene (Språkrådet/UiB)',
    url: 'https://ordbokene.no',
    domain: 'ordbokene.no',
    description: 'Bokmålsordboka og Nynorskordboka'
  },
  {
    id: 'snl',
    title: 'Store norske leksikon',
    url: 'https://snl.no',
    domain: 'snl.no',
    description: 'Norges største nettleksikon for alle fag'
  },
  {
    id: 'lovdata',
    title: 'Lovdata',
    url: 'https://lovdata.no',
    domain: 'lovdata.no',
    description: 'Norges lover, forskrifter og rettsavgjørelser'
  },
  {
    id: 'ndla',
    title: 'NDLA',
    url: 'https://ndla.no',
    domain: 'ndla.no',
    description: 'Nasjonal digital læringsarena for vgs'
  },
  {
    id: 'matematikk',
    title: 'Matematikk.org',
    url: 'https://www.matematikk.org',
    domain: 'matematikk.org',
    description: 'Matematiske formler og oppslagsverk'
  },
  {
    id: 'faktisk',
    title: 'Faktisk.no',
    url: 'https://www.faktisk.no',
    domain: 'faktisk.no',
    description: 'Faktasjekk og kildekritikk'
  }
];

export const DEFAULT_SEB_APPS = { voxlex: false, ordnett: false, lingdys: false };

export function cleanDomainFromUrl(raw = '') {
  const str = String(raw || '').trim().toLowerCase();
  if (!str) return '';
  try {
    const withProtocol = str.includes('://') ? str : `https://${str}`;
    const parsed = new URL(withProtocol);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return str.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('?')[0];
  }
}

export function normalizeWebsiteUrl(raw = '') {
  const str = String(raw || '').trim();
  if (!str) return '';
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str;
  }
  return `https://${str}`;
}

/** Gyldig vertsnavn: bokstaver, tall, bindestrek og punktum, minst ett punktum. */
export function isValidDomain(domain = '') {
  return /^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(String(domain));
}
