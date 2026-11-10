/**
 * sebPlistParts.js
 * Byggesteiner for SEB-konfigurasjonens XML-plist.
 * App-blokkene er kopiert fra voxkunnskap/src/utils/localMode/sebConfigGenerator.js.
 */
import { cleanDomainFromUrl } from './sebPresets';
import {
  FORMS_AUTH_EXPRESSIONS,
  SSO_AUTH_EXPRESSIONS,
  FORMS_ONLY_EXPRESSIONS,
  CLARIFY_ONLY_EXPRESSIONS
} from './formsAuthList';

export {
  FORMS_AUTH_EXPRESSIONS,
  SSO_AUTH_EXPRESSIONS,
  FORMS_ONLY_EXPRESSIONS,
  CLARIFY_ONLY_EXPRESSIONS
};

const FORMS_HOSTS = ['forms.office.com', 'forms.microsoft.com', 'forms.cloud.microsoft'];

export function extractSafeHostname(raw = '') {
  const str = String(raw || '').trim();
  if (!str || str.startsWith('//')) return '';
  try {
    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(str);
    const parsed = new URL(hasScheme ? str : `https://${str}`);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
    return parsed.hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    return '';
  }
}

export function isFormsUrl(raw = '') {
  const host = extractSafeHostname(raw);
  if (!host) return false;
  return FORMS_HOSTS.some((root) => host === root || host.endsWith(`.${root}`));
}

export function isClarifyUrl(raw = '') {
  const host = extractSafeHostname(raw);
  if (!host) return false;
  return host === 'clarify.no' || host.endsWith('.clarify.no');
}

export function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const bool = (v) => (v ? '<true/>' : '<false/>');

function processDict({ autostart, iconInTaskbar, runInBackground = true, strongKill = false, allowUserToChooseApp, title, executable, originalName, identifier, path, os }) {
  return `    <dict>
      <key>active</key>
      <true/>
      <key>autostart</key>
      ${bool(autostart)}
      <key>iconInTaskbar</key>
      ${bool(iconInTaskbar)}
      <key>runInBackground</key>
      ${bool(runInBackground)}
      <key>allowAccessibility</key>
      <true/>
      <key>allowUserToChooseApp</key>
      ${bool(allowUserToChooseApp)}
      <key>strongKill</key>
      ${bool(strongKill)}
      <key>title</key>
      <string>${escapeXml(title)}</string>
      <key>executable</key>
      <string>${escapeXml(executable)}</string>
      <key>originalName</key>
      <string>${escapeXml(originalName)}</string>${identifier ? `
      <key>identifier</key>
      <string>${escapeXml(identifier)}</string>` : ''}${path !== undefined ? `
      <key>path</key>
      <string>${escapeXml(path)}</string>` : ''}
      <key>os</key>
      <integer>${os}</integer>
    </dict>`;
}

/** os: 1 = Windows, 0 = macOS (SEB-konvensjon).
 * Merk: originalName på Windows (os: 1) skal stå tom ('') slik at SEB på Windows ikke
 * blokkerer VoxLex/Lingdys/Ordnett dersom PE VERSIONINFO OriginalFilename avviker eller er tom.
 */
const APP_PROCESSES = {
  ordnett: [
    { autostart: false, iconInTaskbar: true, allowUserToChooseApp: false, title: 'Ordnett Pluss', executable: 'OrdnettPluss.exe', originalName: '', path: '', os: 1 },
    { autostart: false, iconInTaskbar: true, allowUserToChooseApp: false, title: 'Ordnett Pluss', executable: 'Ordnett Pluss', originalName: 'Ordnett Pluss', identifier: 'no.kunnskapsforlaget.ordnettpluss', path: '/Applications/Ordnett Pluss.app', os: 0 }
  ],
  lingdys: [
    { autostart: true, iconInTaskbar: true, runInBackground: false, strongKill: true, allowUserToChooseApp: false, title: 'Lingdys', executable: 'LingX.exe', originalName: '', path: 'Lingdys4', os: 1 },
    { autostart: true, iconInTaskbar: true, allowUserToChooseApp: false, title: 'Lingdys', executable: 'Lingdys', originalName: 'Lingdys', identifier: 'no.lingit.lingdys', path: '/Applications/Lingdys.app', os: 0 }
  ],
  voxlex: [
    { autostart: false, iconInTaskbar: true, allowUserToChooseApp: false, title: 'VoxLex', executable: 'voxlex.exe', originalName: '', path: '%LOCALAPPDATA%\\VoxLex', os: 1 },
    { autostart: true, iconInTaskbar: true, allowUserToChooseApp: false, title: 'VoxLex', executable: 'voxlex', originalName: 'voxlex', identifier: 'no.voxlex.skole', path: '/Applications/VoxLex.app', os: 0 }
  ]
};

/** Systemprosesser i Windows System32 for Feide/Microsoft passordløs pålogging (Windows Hello PIN/FIDO2).
 * Legges kun til når prøven bruker Microsoft Forms eller Clarify (SSO).
 */
const SYSTEM_AUTH_PROCESSES = [
  {
    autostart: false,
    iconInTaskbar: false,
    runInBackground: true,
    strongKill: false,
    allowUserToChooseApp: false,
    title: 'Windows Sikkerhetsdialog (PIN/Passkey)',
    executable: 'CredentialUIBroker.exe',
    originalName: '',
    path: 'System32',
    os: 1
  },
  {
    autostart: false,
    iconInTaskbar: false,
    runInBackground: true,
    strongKill: false,
    allowUserToChooseApp: false,
    title: 'Windows Sikkerhetsvelger',
    executable: 'PickerHost.exe',
    originalName: '',
    path: 'System32',
    os: 1
  },
  {
    autostart: false,
    iconInTaskbar: false,
    runInBackground: true,
    strongKill: false,
    allowUserToChooseApp: false,
    title: 'Windows PIN-dialog',
    executable: 'PinEnrollmentBroker.exe',
    originalName: '',
    path: 'System32',
    os: 1
  }
];

export function buildPermittedProcessesXml(allowedApps = {}, { includeSystemAuth = false } = {}) {
  const parts = [];
  for (const appId of ['ordnett', 'lingdys', 'voxlex']) {
    if (allowedApps?.[appId]) {
      parts.push(...APP_PROCESSES[appId].map(processDict));
    }
  }
  if (includeSystemAuth) {
    parts.push(...SYSTEM_AUTH_PROCESSES.map(processDict));
  }

  const permittedXml = parts.length > 0
    ? `  <key>permittedProcesses</key>\n  <array>\n${parts.join('\n')}\n  </array>`
    : '  <key>permittedProcesses</key>\n  <array/>';

  if (allowedApps?.voxlex) {
    // VoxLex på macOS er bygget med Tauri v2 (WKWebView) og kommuniserer lokalt mellom
    // brukergrensesnitt og Rust-bakgrunnsprosess via WKURLSchemeHandler (ipc://localhost),
    // som macOS ruter gjennom XPC-hjelpeprosessen com.apple.WebKit.Networking.
    // SEB 3.6+ har com.apple.WebKit.Networking i sin standardliste over forbudte prosesser
    // på macOS. Ved å sette active=false for denne hjelpeprosessen når VoxLex er tillatt,
    // lar SEB hjelpeprosessen leve slik at knapper og oppslag i VoxLex fungerer under prøven.
    return `${permittedXml}
  <key>prohibitedProcesses</key>
  <array>
    <dict>
      <key>active</key>
      <false/>
      <key>currentUser</key>
      <true/>
      <key>description</key>
      <string></string>
      <key>executable</key>
      <string>com.apple.WebKit.Networking</string>
      <key>identifier</key>
      <string>com.apple.WebKit.Networking</string>
      <key>ignoreInAAC</key>
      <true/>
      <key>os</key>
      <integer>0</integer>
      <key>strongKill</key>
      <false/>
      <key>title</key>
      <string>Safari/WebKit Networking</string>
    </dict>
  </array>`;
  }

  return permittedXml;
}

/** Faste domener prøverommet trenger (kun egne prosjektsider og eksakte Firebase API-stier, ingen åpne jokertegn). */
export const BASE_ALLOWED_EXPRESSIONS = [
  'about:blank',
  'about:*',
  'data:*',
  'blob:*',
  'voxcuriosa.no/*',
  '*.voxcuriosa.no/*',
  'curiosa.no/*',
  '*.curiosa.no/*',
  'voxkunnskapeuropa.web.app/*',
  'voxcuriosa-seb.web.app/*',
  'voxcuriosa-seb.firebaseapp.com/*',
  'firestore.googleapis.com/*',
  'firebasestorage.googleapis.com/v0/b/voxcuriosa-seb-storage/*',
  'storage.googleapis.com/voxcuriosa-seb-storage/*',
  'europe-west1-voxcuriosa-seb.cloudfunctions.net/*'
];

function filterRule(expression) {
  return `    <dict>
      <key>action</key>
      <integer>1</integer>
      <key>active</key>
      <true/>
      <key>expression</key>
      <string>${escapeXml(expression)}</string>
      <key>regex</key>
      <false/>
    </dict>`;
}

export function collectAllowedExpressions(allowedWebsites = [], startURL = '', { isForms = false } = {}) {
  const expressions = [...BASE_ALLOWED_EXPRESSIONS];
  let hasForms = Boolean(isForms) || isFormsUrl(startURL);
  let hasClarify = false;

  for (const site of allowedWebsites || []) {
    const dom = cleanDomainFromUrl(site?.domain || site?.url);
    if (!dom) continue;
    expressions.push(`${dom}/*`, `*.${dom}/*`);
    if (isFormsUrl(site?.url) || isFormsUrl(site?.domain)) {
      hasForms = true;
    }
    if (isClarifyUrl(site?.url) || isClarifyUrl(site?.domain)) {
      hasClarify = true;
    }
  }

  if (hasForms) {
    expressions.push(...FORMS_ONLY_EXPRESSIONS);
  }
  if (hasClarify) {
    expressions.push(...CLARIFY_ONLY_EXPRESSIONS);
  }
  if (hasForms || hasClarify) {
    expressions.push(...SSO_AUTH_EXPRESSIONS);
  }

  return [...new Set(expressions)];
}

export function buildUrlFilterXml(allowedWebsites = [], startURL = '', { isForms = false } = {}) {
  const rules = collectAllowedExpressions(allowedWebsites, startURL, { isForms }).map(filterRule).join('\n');
  // Dekk både SEB 3.x (URLFilter*) og eldre SEB 2.x (urlFilter*) slik at filteret alltid er aktivt.
  // Merk: BASE_ALLOWED_EXPRESSIONS inkluderer data:* og about:blank fordi SEBs URL-filter på macOS
  // støtter disse protokollene uten vertsnavn, mens lokal PDF-eksport bruker data:-URI i SEB.
  return `  <key>URLFilterEnable</key>
  <true/>
  <key>URLFilterEnableContentFilter</key>
  <false/>
  <key>URLFilterRules</key>
  <array>
${rules}
  </array>
  <key>urlFilterEnable</key>
  <true/>
  <key>urlFilterEnableContentFilter</key>
  <false/>`;
}

export function buildAdditionalResourcesXml(allowedWebsites = [], { autoOpen = false } = {}) {
  if (!allowedWebsites || allowedWebsites.length === 0) return '';
  const items = allowedWebsites.map((site, idx) => `    <dict>
      <key>active</key>
      <true/>
      <key>autoOpen</key>
      ${bool(autoOpen)}
      <key>confirm</key>
      <false/>
      <key>confirmResourceClose</key>
      <false/>
      <key>iconInTaskbar</key>
      <true/>
      <key>showInTaskbar</key>
      <true/>
      <key>identifier</key>
      <string>resource_${idx + 1}</string>
      <key>policy</key>
      <integer>0</integer>
      <key>resourceType</key>
      <integer>0</integer>
      <key>resetSession</key>
      <false/>
      <key>resetBrowsingSessionOnClose</key>
      <false/>
      <key>showButton</key>
      <true/>
      <key>title</key>
      <string>${escapeXml(site.title || site.domain || 'Kilde')}</string>
      <key>url</key>
      <string>${escapeXml(site.url)}</string>
      <key>URL</key>
      <string>${escapeXml(site.url)}</string>
    </dict>`);

  return `  <key>additionalResources</key>
  <array>
${items.join('\n')}
  </array>`;
}
