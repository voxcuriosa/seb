// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildStandaloneSebPlist, encodeSebFileBytes, safeFileSlug } from './sebConfigGenerator';
import { arrayBufferToBase64, extractDicFromZipBuffer, buildChecker } from './sebDictionaries';
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
  it('lager gyldig plist med riktige nøkler', async () => {
    const hash = await sha256Hex('nodpin-2026');
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
    expect(xml).toMatch(/<key>allowSpellCheck<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>enableRightMouse<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>clearBrowserCache<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>allowQuit<\/key>\s*<true\/>/);
    expect(xml).toContain(`<string>${hash}</string>`);
    expect(xml).not.toContain('nodpin-2026');
    for (const expr of [
      'voxcuriosa.no/*',
      '*.voxcuriosa.no/*',
      'curiosa.no/*',
      'voxkunnskapeuropa.web.app/*',
      'firestore.googleapis.com/*',
      'firebasestorage.googleapis.com/*',
      'europe-west1-voxcuriosa-seb.cloudfunctions.net/*',
      'snl.no/*',
      '*.regjeringen.no/*'
    ]) {
      expect(xml).toContain(`<string>${expr}</string>`);
    }
    for (const forbidden of ['*.run.app/*', '*.firebaseapp.com/*', '*.cloudfunctions.net/*', '*.gstatic.com/*']) {
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
    expect(xml).toMatch(/<key>createNewDesktop<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>killExplorerShell<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>allowVirtualMachine<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>allowDeveloperConsole<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>sendBrowserExamKey<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>allowDownloads<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>allowUploads<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>allowDisplayMirroring<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>screenSharingMacEnforceBlocked<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>clipboardPolicy<\/key>\s*<integer>0<\/integer>/);
    expect(xml).toMatch(/<key>enablePrivateClipboard<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>enablePrivateClipboardMacEnforce<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>enableAltTab<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>enableInjected<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>showMenuBar<\/key>\s*<false\/>/);
    expect(xml).not.toContain('OrdnettPluss.exe');
    expect(xml).toContain('<key>URLFilterEnable</key>');
    expect(xml).toContain('<key>URLFilterRules</key>');
    expect(xml).toContain('<key>allowDownloads</key>');
    expect(xml).toContain('<key>additionalDictionaries</key>');
    expect(xml).toContain('<data>UEsDBA==</data>');
    expect(xml).toContain('<string>nn-NO</string>');
  });

  it('uten passord og uten hjelpeapper brukes isolert Windows-skrivebord (createNewDesktop=true) og ingen hash skrives', () => {
    const xml = buildStandaloneSebPlist({ examId: 'x1' });
    expect(lint(xml)).toMatch(/OK/);
    expect(xml).toMatch(/<key>allowQuit<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>showQuitButton<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>createNewDesktop<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>allowVirtualMachine<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>allowUploads<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>allowDisplayMirroring<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>examSessionClearCookiesOnStart<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>examSessionClearCookiesOnEnd<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>clipboardPolicy<\/key>\s*<integer>2<\/integer>/);
    expect(xml).toMatch(/<key>enablePrivateClipboard<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>enablePrivateClipboardMacEnforce<\/key>\s*<true\/>/);
    expect(xml).not.toContain('hashedQuitPassword');
    expect(xml).toContain('CredentialUIBroker.exe');
    expect(xml).toContain('PickerHost.exe');
  });

  it('pakker .seb-filen i SEBs binære plnd-format (gzip("plnd" + gzip(xml))) slik at den ikke er klartekst i Notisblokk', async () => {
    const xml = buildStandaloneSebPlist({ examId: 'bin_test' });
    const encoded = await encodeSebFileBytes(xml);
    // Skal ikke starte med '<?xml' i klartekst, men med GZIP-magiske bytes (0x1f, 0x8b)
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

  it('bruker egendefinert startURL direkte når oppgitt (f.eks. for Microsoft Forms) og hvitelister SSO + tømmer cookies', () => {
    const formsUrl = 'https://forms.office.com/Pages/ResponsePage.aspx?id=test123&test=1';
    const xml = buildStandaloneSebPlist({ examId: 'f1', startURL: formsUrl });
    expect(lint(xml)).toMatch(/OK/);
    expect(xml).toContain('<key>startURL</key>');
    expect(xml).toContain('<string>https://forms.office.com/Pages/ResponsePage.aspx?id=test123&amp;test=1</string>');
    expect(xml).toContain('<string>forms.office.com/*</string>');
    expect(xml).toContain('<string>login.microsoftonline.com/*</string>');
    expect(xml).toContain('<string>idp.feide.no/*</string>');
    expect(xml).not.toContain('<string>*.office.com/*</string>');
    expect(xml).toMatch(/<key>examSessionClearCookiesOnStart<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>examSessionClearCookiesOnEnd<\/key>\s*<true\/>/);
  });

  it('støtter Clarify Ordbøker (https://app.clarify.no/auth) med Feide-SSO og tømmer cookies ved slutt', () => {
    const xml = buildStandaloneSebPlist({
      examId: 'c1',
      allowedWebsites: [{ id: 'clarify', title: 'Clarify Ordbøker (Feide)', url: 'https://app.clarify.no/auth', domain: 'app.clarify.no' }]
    });
    expect(lint(xml)).toMatch(/OK/);
    expect(xml).toContain('<string>https://app.clarify.no/auth</string>');
    expect(xml).toContain('<string>app.clarify.no/*</string>');
    expect(xml).toContain('<string>auth.dataporten.no/*</string>');
    expect(xml).toContain('<string>idp.feide.no/*</string>');
    expect(xml).toContain('<string>data:*</string>');
    expect(xml).toContain('<string>about:blank</string>');
    expect(xml).toMatch(/<key>URLFilterEnable<\/key>\s*<true\/>/);
    expect(xml).toMatch(/<key>browserWindowAllowAddressBar<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>newBrowserWindowAllowAddressBar<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>allowSwitchToApplications<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>enableAltTab<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>examSessionClearCookiesOnEnd<\/key>\s*<true\/>/);
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

describe('safeFileSlug', () => {
  it('lager trygge filnavn', () => {
    expect(safeFileSlug('Prøve i Historie VG3!')).toBe('prøve-i-historie-vg3');
    expect(safeFileSlug('')).toBe('prove');
  });
});
