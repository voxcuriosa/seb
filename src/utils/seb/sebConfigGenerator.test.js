// @vitest-environment node
import { describe, it, expect, afterEach, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildStandaloneSebPlist, encodeSebFileBytes, safeFileSlug } from './sebConfigGenerator';
import {
  FORMS_AUTH_EXPRESSIONS,
  SSO_AUTH_EXPRESSIONS,
  FORMS_ONLY_EXPRESSIONS,
  CLARIFY_ONLY_EXPRESSIONS,
  collectAllowedExpressions,
  buildPermittedProcessesXml
} from './sebPlistParts';
import { isVerifiedSebClient, isSebEnvironment, detectGuestVirtualMachine, GUEST_VM_GPU_RE } from './sebEnvironment';
import { arrayBufferToBase64, extractDicFromZipBuffer, buildChecker } from './sebDictionaries';
import { CODE_WORDS, generateReadableCode, randomUniformInt, MIN_QUIT_PASSWORD_LENGTH } from '../../components/create/QuitPasswordField';
import { sha256Hex } from '../integrity/sha256';

const websites = [
  { id: 'snl', title: 'Store norske leksikon', url: 'https://snl.no', domain: 'snl.no' },
  { id: 'custom_1', title: 'Regjeringen & <test>', url: 'https://www.regjeringen.no', domain: 'regjeringen.no' }
];

function lint(xml) {
  const dir = mkdtempSync(join(tmpdir(), 'seb-'));
  const file = join(dir, 'test.seb');
  writeFileSync(file, xml);
  try {
    return execFileSync('plutil', ['-lint', file]).toString();
  } catch (err) {
    if (err.code === 'ENOENT') return 'OK (plutil mangler)';
    throw new Error(err.stdout?.toString() || err.message, { cause: err });
  }
}

describe('buildStandaloneSebPlist', () => {
  it('lager gyldig plist med riktige nøkler og herdet prosess-/URL-oppsett', async () => {
    const hash = await sha256Hex('sol-elg-fjord-42');
    const xml = buildStandaloneSebPlist({
      examId: 'Ab12_x',
      allowedWebsites: websites,
      allowedApps: { voxlex: true, ordnett: false, lingdys: true },
      quitPasswordHash: hash,
      dictionaries: [{ localeName: 'nb-NO', base64: 'UEsDBA==' }]
    });

    expect(lint(xml)).toMatch(/OK/);
    expect(xml).toContain('<string>https://voxcuriosa.no/seb/exam/Ab12_x?seb=1</string>');
    expect(xml).toContain('<string>https://voxcuriosa.no/seb/quit</string>');
    expect(xml).toMatch(/<key>showQuitButton<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>browserWindowWebView<\/key>\s*<integer>3<\/integer>/);
    expect(xml).toMatch(/<key>browserUserAgentWinDesktopMode<\/key>\s*<integer>1<\/integer>/);
    expect(xml).toMatch(/<key>browserUserAgentMac<\/key>\s*<integer>1<\/integer>/);
    expect(xml).toMatch(/<key>allowSpellCheck<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>allowDictionaryLookup<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>enableRightMouse<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>clearBrowserCache<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>examSessionClearCookiesOnStart<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>allowQuit<\/key>\s*<true\/>/);
    expect(xml).toContain(`<string>${hash}</string>`);
    expect(xml).not.toContain('sol-elg-fjord-42');
    for (const expr of [
      'voxcuriosa.no/*',
      '*.voxcuriosa.no/*',
      'curiosa.no/*',
      'voxkunnskapeuropa.web.app/*',
      'firestore.googleapis.com/*',
      'firebasestorage.googleapis.com/v0/b/voxcuriosa-seb-storage/*',
      'storage.googleapis.com/voxcuriosa-seb-storage/*',
      'europe-west1-voxcuriosa-seb.cloudfunctions.net/*',
      'snl.no/*',
      '*.regjeringen.no/*'
    ]) {
      expect(xml).toContain(`<string>${expr}</string>`);
    }
    for (const forbidden of [
      '*.run.app/*',
      '*.firebaseapp.com/*',
      '*.cloudfunctions.net/*',
      '*.gstatic.com/*',
      'firebasestorage.googleapis.com/*',
      'storage.googleapis.com/*'
    ]) {
      expect(xml).not.toContain(`<string>${forbidden}</string>`);
    }
    expect(xml).toContain('Regjeringen &amp; &lt;test&gt;');
    expect(xml).toContain('no.voxlex.skole');
    expect(xml).toContain('%LOCALAPPDATA%\\VoxLex');
    expect(xml).toContain('voxlex.exe');
    expect(xml).toContain('com.apple.WebKit.Networking');
    expect(xml).toContain('<key>prohibitedProcesses</key>');
    expect(xml).toContain('no.lingit.lingdys');
    expect(xml).toContain('LingX.exe');
    expect(xml).toContain('<string>Lingdys4</string>');
    // Ingen apper skal kunne utløse filvelger i SEB (allowUserToChooseApp = false overalt)
    expect(xml).not.toMatch(/<key>allowUserToChooseApp<\/key>\s*<true\/>/);
    // Windows originalName forblir tom på hjelpeapper for 100 % kompatibilitet
    expect(xml).toMatch(/<key>executable<\/key>\s*<string>voxlex\.exe<\/string>\s*<key>originalName<\/key>\s*<string><\/string>/);
    expect(xml).toMatch(/<key>executable<\/key>\s*<string>LingX\.exe<\/string>\s*<key>originalName<\/key>\s*<string><\/string>/);
    // Ingen system-auth-prosesser på ordinær prøve uten Forms/Clarify
    expect(xml).not.toContain('CredentialUIBroker.exe');
    expect(xml).not.toContain('PickerHost.exe');
    expect(xml).toMatch(/<key>createNewDesktop<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>killExplorerShell<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>allowVirtualMachine<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>allowDeveloperConsole<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>sendBrowserExamKey<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>allowDownloads<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>allowUploads<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>allowDisplayMirroring<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>screenSharingMacEnforceBlocked<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>allowSiri<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>allowDictation<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>sebServiceIgnore<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>clipboardPolicy<\/key>\s*<integer>0<\/integer>/);
    expect(xml).toMatch(/<key>enablePrivateClipboard<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>enablePrivateClipboardMacEnforce<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>enableAltTab<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>enableInjected<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>showMenuBar<\/key>\s*<false\/>/);
    expect(xml).not.toContain('OrdnettPluss.exe');
    expect(xml).toContain('<key>URLFilterEnable</key>');
    expect(xml).toContain('<key>URLFilterRules</key>');
    expect(xml).toContain('<key>additionalDictionaries</key>');
    expect(xml).toContain('<data>UEsDBA==</data>');
    expect(xml).toContain('<string>nn-NO</string>');
  });

  it('uten passord og uten hjelpeapper brukes isolert skrivebord, privat utklippstavle, tømte start-cookies og tom prosessliste', () => {
    const xml = buildStandaloneSebPlist({ examId: 'x1' });
    expect(lint(xml)).toMatch(/OK/);
    expect(xml).toMatch(/<key>allowQuit<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>showQuitButton<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>createNewDesktop<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>allowVirtualMachine<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>allowUploads<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>allowDisplayMirroring<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>allowDictionaryLookup<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>examSessionClearCookiesOnStart<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>examSessionClearCookiesOnEnd<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>clipboardPolicy<\/key>\s*<integer>2<\/integer>/);
    expect(xml).toMatch(/<key>enablePrivateClipboard<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>enablePrivateClipboardMacEnforce<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>permittedProcesses<\/key>\s*<array\/>/);
    expect(xml).not.toContain('hashedQuitPassword');
    expect(xml).not.toContain('CredentialUIBroker.exe');
    expect(xml).not.toContain('PickerHost.exe');
  });

  it('beholder delt utklippstavle og tom Windows originalName også når kun Ordnett er valgt', () => {
    const xml = buildStandaloneSebPlist({
      examId: 'ord1',
      allowedApps: { ordnett: true, voxlex: false, lingdys: false }
    });
    expect(lint(xml)).toMatch(/OK/);
    expect(xml).toContain('OrdnettPluss.exe');
    expect(xml).toMatch(/<key>executable<\/key>\s*<string>OrdnettPluss\.exe<\/string>\s*<key>originalName<\/key>\s*<string><\/string>/);
    expect(xml).not.toMatch(/<key>allowUserToChooseApp<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>clipboardPolicy<\/key>\s*<integer>0<\/integer>/);
    expect(xml).toMatch(/<key>enablePrivateClipboard<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>enablePrivateClipboardMacEnforce<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>enableAltTab<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>allowSwitchToApplications<\/key>\s*<true\/>/);
  });

  it('pakker .seb-filen i SEBs binære plnd-format (gzip("plnd" + gzip(xml))) slik at den ikke er klartekst i Notisblokk', async () => {
    const xml = buildStandaloneSebPlist({ examId: 'bin_test' });
    const encoded = await encodeSebFileBytes(xml);
    expect(encoded[0]).toBe(0x1f);
    expect(encoded[1]).toBe(0x8b);
    const outerUnzipped = gunzipSync(encoded);
    expect(outerUnzipped.subarray(0, 4).toString('utf8')).toBe('plnd');
    const innerXml = gunzipSync(outerUnzipped.subarray(4)).toString('utf8');
    expect(innerXml).toBe(xml);
    expect(lint(innerXml)).toMatch(/OK/);
  });

  it('URL-koder examId i startURL', () => {
    const xml = buildStandaloneSebPlist({ examId: 'a b&c' });
    expect(xml).toContain('/seb/exam/a%20b%26c?seb=1');
  });

  it('bruker egendefinert startURL eller sourceType=forms for Microsoft Forms, hvitelister kun Forms + SSO (uten Clarify/CDN-jokertegn) og inkluderer System32-auth', () => {
    const formsUrl = 'https://forms.office.com/Pages/ResponsePage.aspx?id=test123&test=1';
    const xml = buildStandaloneSebPlist({ examId: 'f1', startURL: formsUrl });
    expect(lint(xml)).toMatch(/OK/);
    expect(xml).toContain('<key>startURL</key>');
    expect(xml).toContain('<string>https://forms.office.com/Pages/ResponsePage.aspx?id=test123&amp;test=1</string>');
    expect(xml).toContain('<string>forms.office.com/*</string>');
    expect(xml).toContain('<string>login.microsoftonline.com/*</string>');
    expect(xml).toContain('<string>idp.feide.no/*</string>');
    expect(xml).not.toContain('<string>clarify.no/*</string>');
    expect(xml).not.toContain('<string>app.clarify.no/*</string>');
    expect(xml).not.toContain('<string>*.office.com/*</string>');
    expect(xml).not.toContain('<string>*.azureedge.net/*</string>');
    expect(xml).not.toContain('<string>*.azurefd.net/*</string>');
    expect(xml).not.toContain('<string>*.trafficmanager.net/*</string>');
    expect(xml).not.toContain('<string>verbix.com/*</string>');
    expect(xml).toMatch(/<key>allowUploads<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>examSessionClearCookiesOnStart<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>examSessionClearCookiesOnEnd<\/key>\s*<true\/>/);
    expect(xml).toContain('CredentialUIBroker.exe');
    expect(xml).toContain('<string>System32</string>');

    const hubFormsXml = buildStandaloneSebPlist({ examId: 'f2', sourceType: 'forms' });
    expect(lint(hubFormsXml)).toMatch(/OK/);
    expect(hubFormsXml).toMatch(/<key>allowUploads<\/key>\s*<true\/>/);
    expect(hubFormsXml).toContain('<string>forms.office.com/*</string>');
    expect(hubFormsXml).toContain('CredentialUIBroker.exe');
  });

  it('lar seg ikke lure av forms.office.com eller clarify.no i query-strenger eller falske domener', () => {
    const xml = buildStandaloneSebPlist({
      examId: 'spoof1',
      startURL: 'https://voxcuriosa.no/seb/exam/spoof1?seb=1&next=https://forms.office.com&ref=clarify.no',
      allowedWebsites: [
        { id: 'w1', title: 'SNL', url: 'https://snl.no/?q=forms.office.com&c=clarify.no', domain: 'snl.no' }
      ]
    });
    expect(lint(xml)).toMatch(/OK/);
    expect(xml).toMatch(/<key>allowUploads<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>createNewDesktop<\/key>\s*<true\/>/);
    expect(xml).not.toContain('<string>forms.office.com/*</string>');
    expect(xml).not.toContain('<string>clarify.no/*</string>');
    expect(xml).not.toContain('CredentialUIBroker.exe');
  });

  it('støtter Clarify Ordbøker med Feide-SSO, System32-auth og cookie-tømming uten å åpne Forms-domener', () => {
    const xml = buildStandaloneSebPlist({
      examId: 'c1',
      allowedWebsites: [{ id: 'clarify', title: 'Clarify Ordbøker (Feide)', url: 'https://app.clarify.no/auth', domain: 'app.clarify.no' }]
    });
    expect(lint(xml)).toMatch(/OK/);
    expect(xml).toContain('<string>https://app.clarify.no/auth</string>');
    expect(xml).toContain('<string>app.clarify.no/*</string>');
    expect(xml).toContain('<string>clarify.no/*</string>');
    expect(xml).toContain('<string>auth.dataporten.no/*</string>');
    expect(xml).toContain('<string>idp.feide.no/*</string>');
    expect(xml).not.toContain('<string>forms.office.com/*</string>');
    expect(xml).not.toContain('<string>verbix.com/*</string>');
    expect(xml).not.toContain('<string>*.azureedge.net/*</string>');
    expect(xml).toContain('CredentialUIBroker.exe');
    expect(xml).toContain('<string>System32</string>');
    expect(xml).toMatch(/<key>allowUploads<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>URLFilterEnable<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>browserWindowAllowAddressBar<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>newBrowserWindowAllowAddressBar<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>allowSwitchToApplications<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>enableAltTab<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>examSessionClearCookiesOnStart<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>examSessionClearCookiesOnEnd<\/key>\s*<true\/>/);
  });

  it('eksporterer splittede URL-lister uten globale CDN-wildcards og beholder FORMS_AUTH_EXPRESSIONS', () => {
    expect(FORMS_ONLY_EXPRESSIONS).toContain('forms.office.com/*');
    expect(CLARIFY_ONLY_EXPRESSIONS).toContain('app.clarify.no/*');
    expect(SSO_AUTH_EXPRESSIONS).toContain('idp.feide.no/*');
    expect(FORMS_AUTH_EXPRESSIONS.length).toBeGreaterThan(SSO_AUTH_EXPRESSIONS.length);
    for (const removed of ['*.azureedge.net/*', '*.azurefd.net/*', '*.trafficmanager.net/*', 'verbix.com/*', '*.verbix.com/*']) {
      expect(FORMS_AUTH_EXPRESSIONS).not.toContain(removed);
    }
    const plainExprs = collectAllowedExpressions([], 'https://voxcuriosa.no/seb/exam/1?seb=1');
    expect(plainExprs).not.toContain('idp.feide.no/*');
    const authXml = buildPermittedProcessesXml({}, { includeSystemAuth: true });
    expect(authXml).toContain('PinEnrollmentBroker.exe');
    expect(authXml).toContain('<string>System32</string>');
  });

  it('kan bygges med ekte norske ordbøker og gjenkjenner feilstavede ord i nettleseren', async () => {
    const zip = readFileSync(new URL('../../../public/dictionaries/nb-NO.zip', import.meta.url));
    const ab = zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength);
    const base64 = arrayBufferToBase64(ab);
    expect(base64.slice(0, 4)).toBe('UEsD');
    const xml = buildStandaloneSebPlist({ examId: 'x', dictionaries: [{ localeName: 'nb-NO', base64 }] });
    expect(lint(xml)).toMatch(/OK/);

    const rawDic = await extractDicFromZipBuffer(ab);
    const checker = buildChecker(rawDic);
    expect(checker.isValidWord('hei')).toBe(true);
    expect(checker.isValidWord('skolen')).toBe(true);
    expect(checker.isValidWord('historieprøve')).toBe(true);
    expect(checker.isValidWord('jhdhdjdf')).toBe(false);
    expect(checker.isValidWord('fsdfasdfadfafasf')).toBe(false);
    expect(checker.isValidWord('jshsdhd')).toBe(false);
    expect(checker.suggestWords('skolne')).toContain('skolen');
  });
});

describe('sebEnvironment', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('stoler ikke på ?seb=1, window.SEB eller løse User-Agent-strenger i produksjonsmodus', () => {
    vi.stubEnv('VITEST', '');
    vi.stubEnv('DEV', '');
    vi.stubGlobal('window', { location: { hostname: 'voxcuriosa.no', search: '?seb=1&isSeb=1' }, SEB: true });
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 Chrome/125.0 SEB VoxCuriosa' });
    expect(isVerifiedSebClient()).toBe(false);
    expect(isSebEnvironment()).toBe(false);

    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 SafeExamBrowser/3.6 (SEB; VoxCuriosa)' });
    expect(isVerifiedSebClient()).toBe(true);
    expect(isSebEnvironment()).toBe(true);

    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 Chrome/125.0' });
    vi.stubGlobal('window', { location: { hostname: 'voxcuriosa.no', search: '' }, SafeExamBrowser: {} });
    expect(isVerifiedSebClient()).toBe(true);
  });

  it('oppdager gjeste-VM og programvarerendering, men blokkerer ikke Microsoft Basic Render Driver', () => {
    for (const vmGpu of [
      'Google SwiftShader',
      'Mesa llvmpipe',
      'Apple Apple Paravirtual device',
      'Paravirtualized Graphics',
      'VMware SVGA3D',
      'VirtualBox Graphics Adapter'
    ]) {
      expect(GUEST_VM_GPU_RE.test(vmGpu)).toBe(true);
    }
    expect(GUEST_VM_GPU_RE.test('Microsoft Basic Render Driver')).toBe(false);
    expect(GUEST_VM_GPU_RE.test('Intel(R) Iris(R) Xe Graphics')).toBe(false);

    vi.stubGlobal('document', {
      createElement: () => ({
        getContext: () => ({
          getExtension: () => ({ UNMASKED_RENDERER_WEBGL: 1, UNMASKED_VENDOR_WEBGL: 2 }),
          getParameter: (p) => (p === 1 ? 'Microsoft Basic Render Driver' : 'Microsoft')
        })
      })
    });
    expect(detectGuestVirtualMachine()).toBeNull();
  });
});

describe('QuitPasswordField ordliste og passordgenerator', () => {
  it('har minst 180 unike korte ord (3-5 bokstaver) og genererer 3 korte ord + 2 sifre', () => {
    expect(MIN_QUIT_PASSWORD_LENGTH).toBe(8);
    expect(CODE_WORDS.length).toBeGreaterThanOrEqual(180);
    expect(new Set(CODE_WORDS).size).toBe(CODE_WORDS.length);
    expect(CODE_WORDS.every((w) => /^[a-z]{3,5}$/.test(w))).toBe(true);

    const code = generateReadableCode();
    expect(code).toMatch(/^[a-z]{3,5}-[a-z]{3,5}-[a-z]{3,5}-\d{2}$/);
    expect(code.length).toBeGreaterThanOrEqual(MIN_QUIT_PASSWORD_LENGTH);
    const parts = code.split('-');
    expect(parts).toHaveLength(4);
    expect(new Set(parts.slice(0, 3)).size).toBe(3);
    const digits = Number(parts[3]);
    expect(digits).toBeGreaterThanOrEqual(10);
    expect(digits).toBeLessThanOrEqual(99);
    expect(randomUniformInt(180)).toBeGreaterThanOrEqual(0);
    expect(randomUniformInt(180)).toBeLessThan(180);
  });
});

describe('safeFileSlug', () => {
  it('lager trygge filnavn', () => {
    expect(safeFileSlug('Prøve i Historie VG3!')).toBe('prøve-i-historie-vg3');
    expect(safeFileSlug('')).toBe('prove');
  });
});
