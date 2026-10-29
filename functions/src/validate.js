/**
 * validate.js
 * Streng validering og sanering av lærerens prøveoppsett (server-side).
 * Ren modul uten Firebase-avhengigheter, slik at den kan enhetstestes.
 */
import sanitizeHtml from 'sanitize-html';

export const LIMITS = {
  titleMax: 120,
  promptHtmlMaxChars: 200_000,
  pdfMaxBytes: 8 * 1024 * 1024,
  websitesMax: 20,
  websiteTitleMax: 80
};

export const ALLOWED_APP_IDS = ['voxlex', 'ordnett', 'lingdys'];
const SOURCE_TYPES = ['text', 'docx', 'pdf', 'forms'];
const DOMAIN_RE = /^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const FORMS_HOSTS = ['forms.office.com', 'forms.microsoft.com', 'forms.cloud.microsoft'];

export function isFormsUrl(u) {
  try {
    const x = new URL(String(u || '').trim());
    return x.protocol === 'https:' && FORMS_HOSTS.includes(x.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export class ValidationError extends Error {}

const fail = (msg) => {
  throw new ValidationError(msg);
};

export function sanitizePromptHtml(html) {
  return sanitizeHtml(String(html || ''), {
    allowedTags: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'span',
      'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'hr', 'code', 'pre',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'a', 'img'
    ],
    allowedAttributes: {
      a: ['href', 'title', 'rel', 'target', 'referrerpolicy'],
      img: ['src', 'alt', 'width', 'height', 'referrerpolicy'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
      ol: ['start']
    },
    allowedSchemes: ['https', 'mailto'],
    allowedSchemesByTag: { img: ['data'] },
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank', referrerpolicy: 'no-referrer' }),
      img: sanitizeHtml.simpleTransform('img', { referrerpolicy: 'no-referrer' })
    }
  }).replace(/<img(?![^>]*\bsrc="data:image\/(?:png|jpe?g|gif|webp);base64,[^"]+")[^>]*>/gi, '');
}

function cleanDomain(raw) {
  const str = String(raw || '').trim().toLowerCase();
  try {
    return new URL(str.includes('://') ? str : `https://${str}`).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function validateWebsites(list) {
  if (list === undefined || list === null) return [];
  if (!Array.isArray(list)) fail('allowedWebsites må være en liste.');
  if (list.length > LIMITS.websitesMax) fail(`Maks ${LIMITS.websitesMax} nettsider.`);
  const seen = new Set();
  return list.map((site, idx) => {
    const rawUrl = String(site?.url || '').trim();
    if (!/^https:\/\//i.test(rawUrl)) fail(`Nettside ${idx + 1} må bruke https://.`);
    let parsedUrl;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      fail(`Nettside ${idx + 1} mangler gyldig adresse.`);
    }
    if (parsedUrl.protocol !== 'https:') fail(`Nettside ${idx + 1} må bruke https://.`);
    const url = parsedUrl.toString();
    const domain = cleanDomain(url);
    if (!DOMAIN_RE.test(domain)) fail(`Ugyldig domene: ${domain || url}`);
    if (seen.has(domain)) fail(`Duplikat domene: ${domain}`);
    seen.add(domain);
    return {
      id: String(site?.id || `web_${idx + 1}`).replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || `web_${idx + 1}`,
      title: String(site?.title || domain).trim().slice(0, LIMITS.websiteTitleMax),
      url: url.slice(0, 300),
      domain
    };
  });
}

export function validateApps(apps) {
  const out = {};
  for (const id of ALLOWED_APP_IDS) out[id] = apps?.[id] === true;
  return out;
}

/** Returnerer et rent objekt som kan lagres, eller kaster ValidationError. */
export function validateExamInput(data) {
  if (!data || typeof data !== 'object') fail('Mangler data.');
  const title = String(data.title || '').trim();
  if (title.length < 1 || title.length > LIMITS.titleMax) fail(`Tittel må være 1–${LIMITS.titleMax} tegn.`);

  const sourceType = String(data.sourceType || '');
  if (!SOURCE_TYPES.includes(sourceType)) fail('Ugyldig kildetype.');

  const rawHtml = String(data.promptHtml || '');
  if (rawHtml.length > LIMITS.promptHtmlMaxChars) fail('Oppgaveteksten er for lang.');
  const promptHtml = sanitizePromptHtml(rawHtml);

  let pdfBuffer = null;
  if (sourceType === 'pdf') {
    if (typeof data.pdfBase64 !== 'string' || !data.pdfBase64) fail('PDF mangler.');
    pdfBuffer = Buffer.from(data.pdfBase64, 'base64');
    if (pdfBuffer.length > LIMITS.pdfMaxBytes) fail('PDF-en er større enn 8 MB.');
    if (pdfBuffer.subarray(0, 5).toString('latin1') !== '%PDF-') fail('Filen er ikke en gyldig PDF.');
  } else if (sourceType === 'forms') {
    const formsUrl = String(data.formsUrl || '').trim();
    if (!isFormsUrl(formsUrl)) {
      fail('Ugyldig Microsoft Forms-lenke.');
    }
  } else if (!promptHtml.replace(/<[^>]*>/g, '').trim()) {
    fail('Oppgaveteksten er tom.');
  }

  const cfg = data.sebConfig || {};
  const quitPasswordHash = String(cfg.quitPasswordHash || '').toLowerCase();
  if (quitPasswordHash && !/^[a-f0-9]{64}$/.test(quitPasswordHash)) fail('Ugyldig passord-hash.');
  if (sourceType === 'forms' && !quitPasswordHash) {
    fail('Avslutningspassord (PIN) er påkrevd for Microsoft Forms-prøver.');
  }

  // Hvis forms, sørg for at forms.office.com ligger i allowedWebsites
  let allowedWebsites = validateWebsites(cfg.allowedWebsites);
  if (sourceType === 'forms') {
    const hasForms = allowedWebsites.some((w) => w.domain === 'forms.office.com');
    if (!hasForms) {
      allowedWebsites.unshift({
        id: 'web_forms_main',
        title: 'Microsoft Forms',
        url: String(data.formsUrl || '').trim(),
        domain: 'forms.office.com'
      });
    }
  }

  return {
    title,
    sourceType,
    promptHtml,
    pdfBuffer,
    formsUrl: sourceType === 'forms' ? String(data.formsUrl || '').trim() : null,
    sebConfig: {
      allowedApps: validateApps(cfg.allowedApps),
      allowedWebsites,
      quitPasswordHash
    }
  };
}

export function isValidSha256(value) {
  return /^[a-f0-9]{64}$/.test(String(value || ''));
}

export function isValidExamId(value) {
  return /^[A-Za-z0-9]{10,40}$/.test(String(value || ''));
}
