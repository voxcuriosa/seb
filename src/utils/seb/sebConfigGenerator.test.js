// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildStandaloneSebPlist, safeFileSlug } from './sebConfigGenerator';
import { arrayBufferToBase64 } from './sebDictionaries';
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
    for (const expr of ['voxcuriosa.no/*', '*.voxcuriosa.no/*', 'curiosa.no/*', 'voxkunnskapeuropa.web.app/*', '*.googleapis.com/*', 'snl.no/*', '*.regjeringen.no/*']) {
      expect(xml).toContain(`<string>${expr}</string>`);
    }
    expect(xml).toContain('Regjeringen &amp; &lt;test&gt;');
    expect(xml).toContain('no.voxlex.skole');
    expect(xml).toContain('no.lingit.lingdys');
    expect(xml).not.toContain('OrdnettPluss.exe');
    expect(xml).toContain('<key>additionalDictionaries</key>');
    expect(xml).toContain('<string>nn-NO</string>');
  });

  it('uten passord er avslutning sperret og ingen hash skrives', () => {
    const xml = buildStandaloneSebPlist({ examId: 'x1' });
    expect(lint(xml)).toMatch(/OK/);
    expect(xml).toMatch(/<key>allowQuit<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>showQuitButton<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>examSessionClearCookiesOnStart<\/key>\s*<false\/>/);
    expect(xml).toMatch(/<key>examSessionClearCookiesOnEnd<\/key>\s*<false\/>/);
    expect(xml).not.toContain('hashedQuitPassword');
    expect(xml).toContain('<array/>');
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

  it('kan bygges med ekte norske ordbøker', () => {
    const zip = readFileSync(new URL('../../../public/dictionaries/nb-NO.zip', import.meta.url));
    const base64 = arrayBufferToBase64(zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength));
    expect(base64.slice(0, 4)).toBe('UEsD');
    const xml = buildStandaloneSebPlist({ examId: 'x', dictionaries: [{ localeName: 'nb-NO', base64 }] });
    expect(lint(xml)).toMatch(/OK/);
  });
});

describe('safeFileSlug', () => {
  it('lager trygge filnavn', () => {
    expect(safeFileSlug('Prøve i Historie VG3!')).toBe('prøve-i-historie-vg3');
    expect(safeFileSlug('')).toBe('prove');
  });
});
