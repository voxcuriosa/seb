// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { validateExamInput, sanitizePromptHtml, ValidationError, isValidExamId, isFormsUrl } from './validate.js';
import { clientIp, ipKey } from './rateLimit.js';

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

  it('avviser for lang tittel, tom tekst og ugyldig hash', () => {
    expect(() => validateExamInput({ ...base, title: 'x'.repeat(121) })).toThrow(ValidationError);
    expect(() => validateExamInput({ ...base, promptHtml: '<p> </p>' })).toThrow(ValidationError);
    expect(() => validateExamInput({ ...base, sebConfig: { quitPasswordHash: '1212' } })).toThrow(ValidationError);
  });

  it('krever ekte PDF ved sourceType pdf', () => {
    const notPdf = Buffer.from('hello').toString('base64');
    expect(() => validateExamInput({ ...base, sourceType: 'pdf', pdfBase64: notPdf })).toThrow(/gyldig PDF/);
    const pdf = Buffer.from('%PDF-1.7\n...').toString('base64');
    expect(validateExamInput({ ...base, sourceType: 'pdf', promptHtml: '', pdfBase64: pdf }).pdfBuffer.length).toBeGreaterThan(5);
  });

  it('validerer og deduplikerer nettsider (krever https://)', () => {
    const sites = [{ url: 'https://snl.no', title: 'SNL' }];
    expect(validateExamInput({ ...base, sebConfig: { allowedWebsites: sites } }).sebConfig.allowedWebsites[0].domain).toBe('snl.no');
    expect(() => validateExamInput({ ...base, sebConfig: { allowedWebsites: [...sites, ...sites] } })).toThrow(/Duplikat/);
    expect(() => validateExamInput({ ...base, sebConfig: { allowedWebsites: [{ url: 'javascript:alert(1)' }] } })).toThrow(ValidationError);
    expect(() => validateExamInput({ ...base, sebConfig: { allowedWebsites: [{ url: 'http://snl.no' }] } })).toThrow(/https:\/\//);
  });

  it('krever gyldig Forms-lenke (avviser prefiks-spoofing) og avslutningspassord ved sourceType forms', () => {
    const validHash = 'a'.repeat(64);
    // Mangler passord
    expect(() =>
      validateExamInput({
        ...base,
        sourceType: 'forms',
        formsUrl: 'https://forms.office.com/r/abc1234',
        sebConfig: { quitPasswordHash: '' }
      })
    ).toThrow(/Avslutningspassord \(PIN\) er påkrevd/);

    // Ugyldig forms-lenke og prefiks-spoofing
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

    // Gyldig forms (både forms.office.com og forms.cloud.microsoft)
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

  it('validerer examId', () => {
    expect(isValidExamId('AbCdEfGhIj0123456789')).toBe(true);
    expect(isValidExamId('../etc')).toBe(false);
  });

  it('sikrer clientIp mot X-Forwarded-For-spoofing og separerer ipKey per scope', () => {
    // Klient sender falsk 1.2.3.4 først; Google Front End legger reell IP (84.215.10.20) bakerst
    const req = { headers: { 'x-forwarded-for': '1.2.3.4, 84.215.10.20' } };
    expect(clientIp(req)).toBe('84.215.10.20');

    // x-appengine-user-ip foretrekkes hvis til stede
    expect(clientIp({ headers: { 'x-appengine-user-ip': '91.100.20.30', 'x-forwarded-for': '1.2.3.4' } })).toBe('91.100.20.30');

    // Domeneseparasjon i HKDF gjør at samme IP + secret gir ulike nøkler for ulike scopes
    const kPin = ipKey('84.215.10.20', 'test-secret-256-bits-long-value', 'pinfail');
    const kSign = ipKey('84.215.10.20', 'test-secret-256-bits-long-value', 'sign');
    expect(kPin).toHaveLength(32);
    expect(kSign).toHaveLength(32);
    expect(kPin).not.toBe(kSign);
  });
});
