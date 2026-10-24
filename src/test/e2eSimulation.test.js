// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { buildStandaloneSebPlist } from '../utils/seb/sebConfigGenerator.js';
import { BROWSER_SPELLCHECK_LOCALES, extractDicFromZipBuffer, buildChecker } from '../utils/seb/sebDictionaries.js';
import { buildEssayPayload, renderEssayPdf } from '../utils/exam/essayPdfGenerator.js';
import { parseExamPdfFile } from '../utils/integrity/examPdfParser.js';

function fileFromBytes(bytes, name) {
  return new File([bytes], name, { type: 'application/pdf', lastModified: 1 });
}

describe('Slutt-til-slutt simulering av hele prøveløpet', () => {
  it('Scenario 1: Prøve UTEN hjelpemidler (ren lockdown)', async () => {
    console.log('\n======================================================');
    console.log('   SCENARIO 1: PRØVE UTEN HJELPEMIDLER (REN LOCKDOWN)');
    console.log('======================================================');
    
    // 1. Lærer oppretter prøve uten nettsider og uten apper
    const exam = { id: 'lockdown_001', title: 'Tentamen i norsk (uten hjelpemidler)' };
    const plist = buildStandaloneSebPlist({
      examId: exam.id,
      allowedWebsites: [],
      allowedApps: { voxlex: false, ordnett: false, lingdys: false },
      quitPasswordHash: 'a'.repeat(64)
    });

    // Sikkerhetssjekker på SEB-profilen
    expect(plist).toContain('<key>allowSwitchToApplications</key>\n  <false/>');
    expect(plist).toContain('<key>enableAltTab</key>\n  <false/>');
    expect(plist).toContain('<key>showMenuBar</key>\n  <false/>');
    expect(plist).toContain('<key>browserWindowAllowAddressBar</key>\n  <false/>');
    expect(plist).toContain('<key>newBrowserWindowAllowAddressBar</key>\n  <false/>');
    expect(plist).toContain('<key>URLFilterEnable</key>\n  <true/>');

    // Valider med macOS plutil
    writeFileSync('/tmp/test_scen1.seb', plist);
    const lint = execFileSync('plutil', ['-lint', '/tmp/test_scen1.seb']).toString().trim();
    unlinkSync('/tmp/test_scen1.seb');
    expect(lint).toMatch(/OK/);
    console.log('1. SEB-fil generert: Alt-Tab SPERRET, Programbytte SPERRET, URL-filter PÅ (plutil:', lint, ')');

    // 2. Elev skriver tekst i SEB
    const essayDoc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Analyse av Et dukkehjem' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Ibsens skuespill fra 1879 tar opp ekteskapet og kvinners stilling i samtiden.' }] }
      ]
    };
    const payload = await buildEssayPayload({
      exam,
      essayDoc,
      startedAt: new Date(Date.now() - 7200 * 1000).toISOString(),
      activeSeconds: 6800,
      incidents: []
    });
    expect(payload.wordCount).toBeGreaterThan(10);
    console.log('2. Elev skriver i SEB: Ordantall', payload.wordCount, ', 0 innlimingsvarsler');

    // 3. Lokal PDF generering i nettleserminne (pdf-lib)
    const pdfBytes = await renderEssayPdf(payload);
    expect(pdfBytes.length).toBeGreaterThan(1000);
    console.log('3. PDF bygget lokalt i RAM (' + pdfBytes.length + ' bytes)');

    // 4. Lærer kontrollerer innlevering i Fane 2 (100% offline)
    const result = await parseExamPdfFile(fileFromBytes(pdfBytes, 'elev_innlevering.pdf'));
    expect(result.verdict).toBe('verified-unsigned');
    expect(result.payload.receiptCode).toBe(payload.receiptCode);
    expect(result.layer1).toBe(true);
    expect(result.layer2.ok).toBe(true);
    console.log('4. Fane 2 kontroll: Verdict VERIFIED-UNSIGNED (offline), SHA-256 matcher, synlig tekst matcher 100%!');
  });

  it('Scenario 2: Prøve MED hjelpemidler (Clarify, SNL, Lingdys, VoxLex)', async () => {
    console.log('\n======================================================');
    console.log('   SCENARIO 2: PRØVE MED HJELPEMIDLER (CLARIFY, APP, NETT)');
    console.log('======================================================');
    
    // 1. Lærer oppretter prøve med tillatte hjelpemidler og nettressurser
    const exam = { id: 'aids_002', title: 'Heldagsprøve i historie (med hjelpemidler)' };
    const plist = buildStandaloneSebPlist({
      examId: exam.id,
      allowedWebsites: [
        { id: 'clarify', title: 'Clarify Ordbøker (Feide)', url: 'https://app.clarify.no/auth', domain: 'app.clarify.no' },
        { id: 'snl', title: 'Store norske leksikon', url: 'https://snl.no', domain: 'snl.no' }
      ],
      allowedApps: { voxlex: true, ordnett: false, lingdys: true }
    });

    // Sjekk at godkjente apper og utklippstavle for opplesing er tillatt, mens Alt-Tab og menylinje er sperret
    expect(plist).toContain('<key>allowSwitchToApplications</key>\n  <true/>');
    expect(plist).toContain('<key>enableAltTab</key>\n  <false/>');
    expect(plist).toContain('<key>showMenuBar</key>\n  <false/>');
    expect(plist).toContain('<key>clipboardPolicy</key>\n  <integer>0</integer>');
    expect(plist).toContain('<key>enablePrivateClipboard</key>\n  <false/>');
    expect(plist).toContain('<key>enablePrivateClipboardMacEnforce</key>\n  <false/>');
    expect(plist).toContain('<key>URLFilterEnable</key>\n  <true/>');
    expect(plist).toContain('app.clarify.no/*');
    expect(plist).toContain('idp.feide.no/*');
    expect(plist).toContain('snl.no/*');
    expect(plist).toContain('data:*');
    expect(plist).toContain('about:blank');
    expect(plist).toContain('no.voxlex.skole');
    expect(plist).toContain('no.lingit.lingdys');

    // Valider med macOS plutil
    writeFileSync('/tmp/test_scen2.seb', plist);
    const lint = execFileSync('plutil', ['-lint', '/tmp/test_scen2.seb']).toString().trim();
    unlinkSync('/tmp/test_scen2.seb');
    expect(lint).toMatch(/OK/);
    console.log('1. SEB-fil generert: Alt-Tab TILLATT (for godkjente apper), URL-filter PÅ med Feide/Clarify/SNL (plutil:', lint, ')');

    // 2. Elev skriver tekst og limer inn et sitat (f.eks. fra SNL)
    const essayDoc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Opplysningstiden og menneskerettigheter' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'John Lockes teorier om folkesuverenitet fikk stor betydning for den amerikanske uavhengighetserklæringen.' }] }
      ]
    };
    const incidents = [
      { type: 'PASTE', timestamp: new Date(Date.now() - 1000 * 60).toISOString(), detail: '18 tegn limt inn' }
    ];
    const payload = await buildEssayPayload({
      exam,
      essayDoc,
      startedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      activeSeconds: 3400,
      incidents
    });
    expect(payload.pasteIncidents).toBe(1);
    console.log('2. Elev skriver i SEB: Ordantall', payload.wordCount, ', 1 innliming registrert i loggen');

    // 3. Lokal PDF-generering
    const pdfBytes = await renderEssayPdf(payload);
    expect(pdfBytes.length).toBeGreaterThan(1000);
    console.log('3. PDF bygget lokalt i RAM (' + pdfBytes.length + ' bytes)');

    // 4. Lærer kontrollerer innlevering i Fane 2 (100% offline)
    const result = await parseExamPdfFile(fileFromBytes(pdfBytes, 'elev_historie.pdf'));
    expect(result.verdict).toBe('verified-unsigned');
    expect(result.payload.receiptCode).toBe(payload.receiptCode);
    expect(result.payload.pasteIncidents).toBe(1);
    expect(result.layer1).toBe(true);
    expect(result.layer2.ok).toBe(true);
    console.log('4. Fane 2 kontroll: Verdict VERIFIED-UNSIGNED (offline), SHA-256 matcher, innlimingsvarsel registrert!');
  });

  it('Scenario 3: Innebygd stavekontroll for alle 7 språk (nb-NO, nn-NO, en-GB, en-US, de-DE, es-ES, fr-FR)', async () => {
    const samples = {
      'nb-NO': { valid: 'skolen', invalid: 'skolne', expectSug: 'skolen' },
      'nn-NO': { valid: 'skulen', invalid: 'skulne', expectSug: 'skulen' },
      'en-GB': { valid: 'colour', invalid: 'coluor', expectSug: 'colour' },
      'en-US': { valid: 'walked', invalid: 'walkd', expectSug: 'walked' },
      'de-DE': { valid: 'gemacht', invalid: 'gemahct', expectSug: 'gemacht' },
      'es-ES': { valid: 'hablar', invalid: 'hablra', expectSug: 'hablar' },
      'fr-FR': { valid: 'parler', invalid: 'parlre', expectSug: 'parler' }
    };

    for (const locale of BROWSER_SPELLCHECK_LOCALES) {
      const zipBuf = readFileSync(`public/dictionaries/${locale}.zip`);
      const ab = zipBuf.buffer.slice(zipBuf.byteOffset, zipBuf.byteOffset + zipBuf.byteLength);
      const rawDic = await extractDicFromZipBuffer(ab);
      expect(rawDic.length).toBeGreaterThan(10000);
      const checker = buildChecker(rawDic, locale);
      const { valid, invalid, expectSug } = samples[locale];
      expect(checker.isValidWord(valid)).toBe(true);
      expect(checker.isValidWord(invalid)).toBe(false);
      const suggestions = checker.suggestWords(invalid, 5);
      expect(suggestions).toContain(expectSug);
    }
  });
});
