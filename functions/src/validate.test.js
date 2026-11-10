// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  validateExamInput,
  sanitizePromptHtml,
  ValidationError,
  isValidExamId,
  isFormsUrl,
  isSebRequest,
  LIMITS
} from './validate.js';
import { clientIp, ipKey, normalizeIpForRateLimit } from './rateLimit.js';

const base = {
  title: 'Prøve i Historie VG3',
  sourceType: 'text',
  promptHtml: '<h2>Oppgave 1</h2><p>Drøft årsakene.</p>',
  sebConfig: { allowedApps: { voxlex: true, hacker: true }, allowedWebsites: [], quitPasswordHash: '' }
};

describe('validateExamInput', () => {
  it('godtar gyldig input og fjerner ukjente apper', () => {
    const out = validateExamInput(base);
    expect(out.sebConfig.allowedApps).toEqual({ voxlex: true, ordnett: false, lingdys: false });
    expect(out.pdfBuffer).toBeNull();
  });

  it('sanerer XSS i oppgaveteksten', () => {
    const html = sanitizePromptHtml('<p onclick="x()">Hei<script>alert(1)</script><a href="javascript:alert(1)">l</a><img src="data:text/html;base64,AAAA"><iframe src="x"></iframe></p>');
    expect(html).not.toMatch(/script|onclick|javascript:|iframe|text\/html/i);
    expect(html).toContain('Hei');
  });

  it('beholder tabeller, lister, overskrifter og innebygde Word-bilder (base64), men fjerner eksterne bilde-URL-er', () => {
    const html = sanitizePromptHtml(
      '<h1>T</h1><table><tr><td colspan="2">A</td></tr></table><ol start="3"><li><a href="https://snl.no">x</a><img src="https://snl.no/b.png"><img src="data:image/png;base64,iVBORw0KGgo="></li></ol>'
    );
    expect(html).toContain('<table>');
    expect(html).toContain('colspan="2"');
    expect(html).toContain('<ol start="3">');
    expect(html).toContain('referrerpolicy="no-referrer"');
    expect(html).toContain('data:image/png;base64,iVBORw0KGgo=');
    expect(html).not.toContain('https://snl.no/b.png');
  });

  it('avviser for lang tittel, tom tekst, ugyldig hash og ekspandert HTML over 400 KB', () => {
    expect(() => validateExamInput({ ...base, title: 'x'.repeat(121) })).toThrow(ValidationError);
    expect(() => validateExamInput({ ...base, promptHtml: '<p> </p>' })).toThrow(ValidationError);
    expect(() => validateExamInput({ ...base, sebConfig: { quitPasswordHash: '1212' } })).toThrow(ValidationError);

    // 7000 korte lenker er under 200 000 rå tegn, men ekspanderes med rel/target/referrerpolicy over 400 000 byte
    const manyLinks = '<a href="https://x.no">x</a>'.repeat(7000);
    expect(manyLinks.length).toBeLessThan(LIMITS.promptHtmlMaxChars);
    expect(() => validateExamInput({ ...base, promptHtml: manyLinks })).toThrow(ValidationError);
  });

  it('krever ekte PDF med %%EOF-markør og avviser for lang pdfBase64 før dekoding', () => {
    const notPdf = Buffer.from('hello').toString('base64');
    expect(() => validateExamInput({ ...base, sourceType: 'pdf', pdfBase64: notPdf })).toThrow(/gyldig PDF/);

    const truncatedPdf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n').toString('base64');
    expect(() => validateExamInput({ ...base, sourceType: 'pdf', promptHtml: '', pdfBase64: truncatedPdf })).toThrow(/%%EOF/);

    const maxBase64 = Math.ceil((LIMITS.pdfMaxBytes * 4) / 3) + 16;
    const oversizedBase64 = 'A'.repeat(maxBase64 + 4);
    expect(() => validateExamInput({ ...base, sourceType: 'pdf', promptHtml: '', pdfBase64: oversizedBase64 })).toThrow(/8 MB/);

    const validPdf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n').toString('base64');
    expect(validateExamInput({ ...base, sourceType: 'pdf', promptHtml: '', pdfBase64: validPdf }).pdfBuffer.length).toBeGreaterThan(10);
  });

  it('validerer og deduplikerer nettsider (krever https://)', () => {
    const sites = [{ url: 'https://snl.no', title: 'SNL' }];
    expect(validateExamInput({ ...base, sebConfig: { allowedWebsites: sites } }).sebConfig.allowedWebsites[0].domain).toBe('snl.no');
    expect(() => validateExamInput({ ...base, sebConfig: { allowedWebsites: [...sites, ...sites] } })).toThrow(/Duplikat/);
    expect(() => validateExamInput({ ...base, sebConfig: { allowedWebsites: [{ url: 'javascript:alert(1)' }] } })).toThrow(ValidationError);
    expect(() => validateExamInput({ ...base, sebConfig: { allowedWebsites: [{ url: 'http://snl.no' }] } })).toThrow(/https:\/\//);
  });

  it('krever gyldig Forms-lenke under 500 tegn (avviser prefiks-spoofing) og avslutningspassord ved sourceType forms', () => {
    const validHash = 'a'.repeat(64);
    expect(() =>
      validateExamInput({
        ...base,
        sourceType: 'forms',
        formsUrl: 'https://forms.office.com/r/abc1234',
        sebConfig: { quitPasswordHash: '' }
      })
    ).toThrow(/Avslutningspassord \(PIN\) er påkrevd/);

    expect(isFormsUrl('https://forms.office.com.evil.no/r/abc')).toBe(false);
    expect(isFormsUrl('https://forms.office.comevil.no/r/abc')).toBe(false);
    expect(isFormsUrl('http://forms.office.com/r/abc')).toBe(false);
    expect(isFormsUrl('https://forms.office.com/r/abc')).toBe(true);
    expect(() =>
      validateExamInput({
        ...base,
        sourceType: 'forms',
        formsUrl: 'https://forms.office.com.evil.no/r/abc1234',
        sebConfig: { quitPasswordHash: validHash }
      })
    ).toThrow(/Ugyldig Microsoft Forms-lenke/);

    // For lang Forms-lenke (> 500 tegn) avvises
    expect(() =>
      validateExamInput({
        ...base,
        sourceType: 'forms',
        formsUrl: `https://forms.office.com/r/${'a'.repeat(500)}`,
        sebConfig: { quitPasswordHash: validHash }
      })
    ).toThrow(/500 tegn/);

    const res = validateExamInput({
      ...base,
      sourceType: 'forms',
      formsUrl: 'https://forms.cloud.microsoft/e/TG1cnrA5Vt',
      sebConfig: { quitPasswordHash: validHash }
    });
    expect(res.sourceType).toBe('forms');
    expect(res.formsUrl).toBe('https://forms.cloud.microsoft/e/TG1cnrA5Vt');
    expect(res.sebConfig.allowedWebsites.some((w) => w.domain === 'forms.office.com')).toBe(true);
  });

  it('validerer examId og SEB-forespørsel', () => {
    expect(isValidExamId('AbCdEfGhIj0123456789')).toBe(true);
    expect(isValidExamId('../etc')).toBe(false);

    const prevEmu = process.env.FUNCTIONS_EMULATOR;
    delete process.env.FUNCTIONS_EMULATOR;
    try {
      expect(isSebRequest({ headers: { 'user-agent': 'Mozilla/5.0 Chrome/125.0' } })).toBe(false);
      expect(isSebRequest({ headers: { 'user-agent': 'SafeExamBrowser/3.6 (SEB; VoxCuriosa)' } })).toBe(true);
      expect(isSebRequest({ headers: { 'x-safeexambrowser-requesthash': 'abc123' } })).toBe(true);
      expect(isSebRequest({ headers: { 'x-safeexambrowser-configkeyhash': 'def456' } })).toBe(true);
    } finally {
      if (prevEmu !== undefined) process.env.FUNCTIONS_EMULATOR = prevEmu;
    }
  });

  it('ignorerer spoofbar x-appengine-user-ip og leser siste IP i X-Forwarded-For', () => {
    const req = {
      headers: {
        'x-appengine-user-ip': '9.9.9.9',
        'x-forwarded-for': '1.2.3.4, 84.215.10.20'
      }
    };
    expect(clientIp(req)).toBe('84.215.10.20');
  });

  it('normaliserer IPv6 til /64 og roterer ipKey per døgn og scope', () => {
    expect(normalizeIpForRateLimit('84.215.10.20')).toBe('84.215.10.20');
    expect(normalizeIpForRateLimit('::ffff:84.215.10.20')).toBe('84.215.10.20');
    expect(normalizeIpForRateLimit('0:0:0:0:0:ffff:84.215.10.20')).toBe('84.215.10.20');
    expect(normalizeIpForRateLimit('::1')).toBe('0000:0000:0000:0000::/64');
    expect(normalizeIpForRateLimit('2a02:fe0:c100:42::1')).toBe('2a02:0fe0:c100:0042::/64');
    expect(normalizeIpForRateLimit('2a02:0FE0:c100:0042:dead:beef:1234:5678')).toBe('2a02:0fe0:c100:0042::/64');

    // To ulike mobil-IPv6-adresser i samme /64 gir identisk rate-limit-nøkkel
    const secret = 'test-secret-256-bits-long-value';
    const kMobile1 = ipKey('2a02:fe0:c100:42::1', secret, 'pinfail', '2026-11-10');
    const kMobile2 = ipKey('2a02:0fe0:c100:0042:aaaa:bbbb:cccc:dddd', secret, 'pinfail', '2026-11-10');
    expect(kMobile1).toBe(kMobile2);

    // Domeneseparasjon per scope og automatisk daglig rotasjon (UTC)
    const kSignSameDay = ipKey('2a02:fe0:c100:42::1', secret, 'sign', '2026-11-10');
    const kNextDay = ipKey('2a02:fe0:c100:42::1', secret, 'pinfail', '2026-11-11');
    expect(kMobile1).toHaveLength(32);
    expect(kMobile1).not.toBe(kSignSameDay);
    expect(kMobile1).not.toBe(kNextDay);
  });
});
