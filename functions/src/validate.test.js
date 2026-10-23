// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { validateExamInput, sanitizePromptHtml, ValidationError, isValidExamId } from './validate.js';

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

  it('beholder tabeller, lister og overskrifter fra Word', () => {
    const html = sanitizePromptHtml('<h1>T</h1><table><tr><td colspan="2">A</td></tr></table><ol start="3"><li>x</li></ol>');
    expect(html).toContain('<table>');
    expect(html).toContain('colspan="2"');
    expect(html).toContain('<ol start="3">');
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

  it('validerer og deduplikerer nettsider', () => {
    const sites = [{ url: 'https://snl.no', title: 'SNL' }];
    expect(validateExamInput({ ...base, sebConfig: { allowedWebsites: sites } }).sebConfig.allowedWebsites[0].domain).toBe('snl.no');
    expect(() => validateExamInput({ ...base, sebConfig: { allowedWebsites: [...sites, ...sites] } })).toThrow(/Duplikat/);
    expect(() => validateExamInput({ ...base, sebConfig: { allowedWebsites: [{ url: 'javascript:alert(1)' }] } })).toThrow(ValidationError);
  });

  it('validerer examId', () => {
    expect(isValidExamId('AbCdEfGhIj0123456789')).toBe(true);
    expect(isValidExamId('../etc')).toBe(false);
  });
});
