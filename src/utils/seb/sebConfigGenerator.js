/**
 * sebConfigGenerator.js
 * Genererer en ukryptert XML-plist (.seb) for frittstående SEB-prøver på voxcuriosa.no/seb.
 * Basert på downloadSebExamFile i voxkunnskap/src/utils/localMode/sebConfigGenerator.js, med:
 *  - startURL direkte til prøverommet (/seb/exam/:examId?seb=1)
 *  - stavekontroll og høyreklikk PÅ (retteforslag fra SEBs ordbok)
 *  - clearBrowserCache AV, slik at localStorage/IndexedDB overlever strømbrudd og omstart
 *  - URL-filter med voxcuriosa.no, Firebase-domener og valgte nettsider
 *  - valgfritt avslutningspassord (hashedQuitPassword, SHA-256)
 */
import { examRoomUrl, EXAM_QUIT_URL } from '../../config';
import {
  escapeXml,
  buildPermittedProcessesXml,
  buildUrlFilterXml,
  buildAdditionalResourcesXml
} from './sebPlistParts';
import { buildDictionariesXml, loadEmbeddedDictionaries } from './sebDictionaries';
import { sha256Hex } from '../integrity/sha256';

export function safeFileSlug(title = '') {
  return String(title || 'prove')
    .toLowerCase()
    .replace(/[^a-z0-9æøå]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'prove';
}

/** Ren funksjon: bygger plist-XML. Testbar uten nettleser. */
export function buildStandaloneSebPlist({
  examId,
  startURL = '',
  allowedWebsites = [],
  allowedApps = {},
  quitPasswordHash = '',
  dictionaries = []
}) {
  if (!examId) throw new Error('examId mangler');
  const hasQuitPassword = /^[a-f0-9]{64}$/i.test(String(quitPasswordHash || ''));
  const websites = Array.isArray(allowedWebsites) ? allowedWebsites : [];
  const resourcesXml = buildAdditionalResourcesXml(websites);
  const effectiveStartUrl = startURL || examRoomUrl(examId);
  const isFormsStart = /forms\.(office|microsoft)\.com/i.test(effectiveStartUrl);
  const hasClarify = websites.some((w) => /clarify\.no/i.test(`${w?.domain || ''} ${w?.url || ''}`));
  const hasAllowedApps = Boolean(allowedApps?.voxlex || allowedApps?.ordnett || allowedApps?.lingdys);

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>originatorVersion</key>
  <string>SEB_Win_3.6.0</string>
  <key>startURL</key>
  <string>${escapeXml(effectiveStartUrl)}</string>
  <key>sebConfigPurpose</key>
  <integer>0</integer>
  <key>browserUserAgentWinDesktopMode</key>
  <integer>0</integer>
  <key>browserUserAgent</key>
  <string>SafeExamBrowser/3.6 (SEB; VoxCuriosa)</string>
  <key>browserUserAgentMac</key>
  <integer>0</integer>
  <key>browserUserAgentMacCustom</key>
  <string>SafeExamBrowser/3.6 (SEB; VoxCuriosa)</string>
  <key>allowQuit</key>
  ${hasQuitPassword ? '<true/>' : '<false/>'}
  <key>ignoreExitKeys</key>
  ${hasQuitPassword ? '<false/>' : '<true/>'}${hasQuitPassword ? `
  <key>hashedQuitPassword</key>
  <string>${String(quitPasswordHash).toLowerCase()}</string>` : ''}
  <key>quitURL</key>
  <string>${escapeXml(EXAM_QUIT_URL)}</string>
  <key>quitURLConfirm</key>
  <false/>
  <key>createNewDesktop</key>
  <false/>
  <key>browserViewMode</key>
  <integer>0</integer>
  <key>enableAAC</key>
  <false/>
  <key>enableMacOSAAC</key>
  <false/>
  <key>detectAccessibilityApps</key>
  <false/>
  <key>allowAccessibility</key>
  <true/>
  <key>clipboardPolicy</key>
  <integer>0</integer>
  <key>mainBrowserWindowWidth</key>
  <string>100%</string>
  <key>mainBrowserWindowHeight</key>
  <string>100%</string>
  <key>enableBrowserWindowToolbar</key>
  <true/>
  <key>hideBrowserWindowToolbar</key>
  <false/>
  <key>browserWindowAllowAddressBar</key>
  <false/>
  <key>newBrowserWindowAllowAddressBar</key>
  <false/>
  <key>showMenuBar</key>
  <true/>
  <key>showTaskBar</key>
  <true/>
  <key>showQuitButton</key>
  ${hasQuitPassword ? '<true/>' : '<false/>'}
  <key>taskBarHeight</key>
  <integer>40</integer>
  <key>showSideMenu</key>
  <true/>
  <key>showReloadButton</key>
  <true/>
  <key>showTime</key>
  <true/>
  <key>showInputLanguage</key>
  <true/>
  <key>enableZoomText</key>
  <true/>
  <key>enableZoomPage</key>
  <true/>
  <key>allowSpellCheck</key>
  <true/>
  <key>allowDictionaryLookup</key>
  <true/>
${buildDictionariesXml(dictionaries)}
  <key>allowDownUploads</key>
  <true/>
  <key>allowDownloads</key>
  <true/>
  <key>allowUploads</key>
  <true/>
  <key>allowCustomDownUploadLocation</key>
  <false/>
  <key>useTemporaryDownUploadDirectory</key>
  <false/>
  <key>allowPDFPlugIn</key>
  <false/>
  <key>downloadPDFFiles</key>
  <true/>
  <key>openDownloads</key>
  <false/>
  <key>chooseFileToUploadPolicy</key>
  <integer>0</integer>
  <key>newBrowserWindowByLinkPolicy</key>
  <integer>2</integer>
  <key>newBrowserWindowByScriptPolicy</key>
  <integer>2</integer>
  <key>newBrowserWindowByLinkBlockForeign</key>
  <false/>
  <key>newBrowserWindowByScriptBlockForeign</key>
  <false/>
  <key>enableRightMouse</key>
  <true/>
  <key>clearBrowserCache</key>
  <false/>
  <key>examSessionClearCookiesOnStart</key>
  ${isFormsStart ? '<true/>' : '<false/>'}
  <key>examSessionClearCookiesOnEnd</key>
  ${isFormsStart || hasClarify ? '<true/>' : '<false/>'}
  <key>removeBrowserProfile</key>
  <false/>
  <key>removeLocalStorage</key>
  <false/>
  <key>enableAltTab</key>
  ${hasAllowedApps ? '<true/>' : '<false/>'}
  <key>enablePrintScreen</key>
  <false/>
  <key>blockScreenSharing</key>
  <true/>
  <key>allowSwitchToApplications</key>
  ${hasAllowedApps ? '<true/>' : '<false/>'}
${buildUrlFilterXml(websites, effectiveStartUrl)}
${buildPermittedProcessesXml(allowedApps)}${resourcesXml ? `\n${resourcesXml}` : ''}
</dict>
</plist>`;
}

function triggerDownload(content, fileName, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Laster ned .seb-filen. Tar imot enten quitPasswordHash (lagret i Firestore)
 * eller quitPassword i klartekst (hashes lokalt og sendes aldri noe sted).
 */
export async function downloadStandaloneSebExamFile({
  examId,
  title,
  startURL = '',
  allowedWebsites = [],
  allowedApps = {},
  quitPassword = '',
  quitPasswordHash = '',
  includeDictionaries = true
}) {
  if (!examId) return null;
  const effectiveHash = quitPasswordHash || (quitPassword ? await sha256Hex(quitPassword) : '');
  const dictionaries = includeDictionaries ? await loadEmbeddedDictionaries() : [];
  const xml = buildStandaloneSebPlist({
    examId,
    startURL,
    allowedWebsites,
    allowedApps,
    quitPasswordHash: effectiveHash,
    dictionaries
  });
  const fileName = `prove-${safeFileSlug(title)}.seb`;
  triggerDownload(xml, fileName, 'application/seb');
  return { fileName, size: xml.length, dictionaries: dictionaries.map((d) => d.localeName) };
}
