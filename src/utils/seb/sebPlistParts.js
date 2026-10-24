/**
 * sebPlistParts.js
 * Byggesteiner for SEB-konfigurasjonens XML-plist.
 * App-blokkene er kopiert fra voxkunnskap/src/utils/localMode/sebConfigGenerator.js.
 */
import { cleanDomainFromUrl } from './sebPresets';
import { FORMS_AUTH_EXPRESSIONS } from './formsAuthList';

export { FORMS_AUTH_EXPRESSIONS };

export function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const bool = (v) => (v ? '<true/>' : '<false/>');

function processDict({ autostart, iconInTaskbar, allowUserToChooseApp, title, executable, originalName, identifier, path, os }) {
  return `    <dict>
      <key>active</key>
      <true/>
      <key>autostart</key>
      ${bool(autostart)}
      <key>iconInTaskbar</key>
      ${bool(iconInTaskbar)}
      <key>runInBackground</key>
      <true/>
      <key>allowAccessibility</key>
      <true/>
      <key>allowUserToChooseApp</key>
      ${bool(allowUserToChooseApp)}
      <key>strongKill</key>
      <false/>
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

/** os: 1 = Windows, 0 = macOS (SEB-konvensjon). */
const APP_PROCESSES = {
  ordnett: [
    { autostart: false, iconInTaskbar: true, allowUserToChooseApp: true, title: 'Ordnett Pluss', executable: 'OrdnettPluss.exe', originalName: '', path: '', os: 1 },
    { autostart: false, iconInTaskbar: true, allowUserToChooseApp: true, title: 'Ordnett Pluss', executable: 'Ordnett Pluss', originalName: 'Ordnett Pluss', identifier: 'no.kunnskapsforlaget.ordnettpluss', path: '/Applications/Ordnett Pluss.app', os: 0 }
  ],
  lingdys: [
    { autostart: false, iconInTaskbar: true, allowUserToChooseApp: true, title: 'Lingdys', executable: 'Lingdys.exe', originalName: '', path: '', os: 1 },
    { autostart: true, iconInTaskbar: true, allowUserToChooseApp: true, title: 'Lingdys', executable: 'Lingdys', originalName: 'Lingdys', identifier: 'no.lingit.lingdys', path: '/Applications/Lingdys.app', os: 0 }
  ],
  voxlex: [
    { autostart: false, iconInTaskbar: true, allowUserToChooseApp: true, title: 'VoxLex', executable: 'voxlex.exe', originalName: '', path: '', os: 1 },
    { autostart: true, iconInTaskbar: true, allowUserToChooseApp: true, title: 'VoxLex', executable: 'voxlex', originalName: 'voxlex', identifier: 'no.voxlex.skole', path: '/Applications/VoxLex.app', os: 0 }
  ]
};

export function buildPermittedProcessesXml(allowedApps = {}) {
  const parts = [];
  for (const appId of ['ordnett', 'lingdys', 'voxlex']) {
    if (allowedApps?.[appId]) {
      parts.push(...APP_PROCESSES[appId].map(processDict));
    }
  }
  return parts.length > 0
    ? `  <key>permittedProcesses</key>\n  <array>\n${parts.join('\n')}\n  </array>`
    : '  <key>permittedProcesses</key>\n  <array/>';
}

/** Faste domener prøverommet trenger (app, Firebase, CDN for pdf.js-worker, samt data:/about: for lokal PDF-eksport). */
export const BASE_ALLOWED_EXPRESSIONS = [
  'about:blank',
  'about:*',
  'data:*',
  'voxcuriosa.no/*',
  '*.voxcuriosa.no/*',
  'curiosa.no/*',
  '*.curiosa.no/*',
  'voxkunnskapeuropa.web.app/*',
  'voxcuriosa-seb.web.app/*',
  'voxcuriosa-seb.firebaseapp.com/*',
  '*.firebaseapp.com/*',
  'firebaseapp.com/*',
  '*.firebaseio.com/*',
  '*.googleapis.com/*',
  'googleapis.com/*',
  '*.cloudfunctions.net/*',
  'cloudfunctions.net/*',
  '*.run.app/*',
  '*.gstatic.com/*',
  'gstatic.com/*'
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

function needsSsoExpressions(dom = '') {
  return dom.includes('forms.office.com') || dom.includes('forms.microsoft.com') || dom.includes('clarify.no');
}

export function collectAllowedExpressions(allowedWebsites = [], startURL = '') {
  const expressions = [...BASE_ALLOWED_EXPRESSIONS];
  let hasSso = needsSsoExpressions(cleanDomainFromUrl(startURL));

  for (const site of allowedWebsites || []) {
    const dom = cleanDomainFromUrl(site?.domain || site?.url);
    if (!dom) continue;
    expressions.push(`${dom}/*`, `*.${dom}/*`);
    if (needsSsoExpressions(dom)) {
      hasSso = true;
    }
  }

  if (hasSso) {
    expressions.push(...FORMS_AUTH_EXPRESSIONS);
  }

  return [...new Set(expressions)];
}

export function buildUrlFilterXml(allowedWebsites = [], startURL = '') {
  const rules = collectAllowedExpressions(allowedWebsites, startURL).map(filterRule).join('\n');
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

export function buildAdditionalResourcesXml(allowedWebsites = []) {
  if (!allowedWebsites || allowedWebsites.length === 0) return '';
  const items = allowedWebsites.map((site, idx) => `    <dict>
      <key>active</key>
      <true/>
      <key>autoOpen</key>
      <false/>
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
