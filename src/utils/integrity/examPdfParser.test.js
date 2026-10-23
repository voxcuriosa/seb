// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as ed from '@noble/ed25519';
import { buildEssayPayload, renderEssayPdf } from '../exam/essayPdfGenerator';
import { parseExamPdfFile, folderNameFromPath } from './examPdfParser';
import { computeExamPayloadSha256 } from './payloadHash';
import { signatureMessage, verifySebSignature } from './signature';
import { SIGNING_PUBLIC_KEYS } from './publicKey';

const exam = { id: 'abc123XYZ', title: 'Prøve i Historie VG3' };

const essayDoc = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Den kalde krigen' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Etter 1945 ble verden delt i to blokker. ' },
        { type: 'text', text: 'USA', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' og ' },
        { type: 'text', text: 'Sovjetunionen', marks: [{ type: 'italic' }, { type: 'underline' }] },
        { type: 'text', text: ' konkurrerte om makt, våpen og ideologi. Dette er en lang setning som må brytes over flere linjer i PDF-en for å teste at ombrytingen ikke ødelegger verifiseringen av teksten – også med “typografiske” tegn.' }
      ]
    },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Årsaker' }] },
    {
      type: 'bulletList',
      content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ideologiske motsetninger' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Atomvåpen' }] }] }
      ]
    },
    {
      type: 'orderedList',
      attrs: { start: 1 },
      content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Berlinblokaden' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Cubakrisen' }] }] }
      ]
    },
    { type: 'paragraph', content: [] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Æ ø å, Grüße, ¿Qué?, déjà vu.' }] }
  ]
};

const incidents = [
  { type: 'FOCUS_LOST', at: '2026-10-23T10:05:00.000Z', detail: 'Forlot vinduet' },
  { type: 'PASTE', at: '2026-10-23T10:06:00.000Z', detail: '250 tegn' }
];

function fileFromBytes(bytes, name, relativePath) {
  const file = new File([bytes], name, { type: 'application/pdf', lastModified: 1 });
  if (relativePath) Object.defineProperty(file, 'webkitRelativePath', { value: relativePath });
  return file;
}

let payload;
let pdfBytes;

beforeAll(async () => {
  payload = await buildEssayPayload({ exam, essayDoc, startedAt: Date.now() - 3600_000, activeSeconds: 3300, incidents });
  pdfBytes = await renderEssayPdf(payload);
});

describe('payload', () => {
  it('lager kanonisk ren tekst med listemarkører og uten navn', () => {
    expect(payload.essayText).toContain('- Ideologiske motsetninger');
    expect(payload.essayText).toContain('2. Cubakrisen');
    expect(payload.pasteIncidents).toBe(1);
    expect(payload.incidentCount).toBe(2);
    expect(payload.receiptCode).toMatch(/^[2-9A-HJ-NP-Z]{4}$/);
    expect(JSON.stringify(payload)).not.toMatch(/studentName|elevnavn/i);
  });

  it('hash endres når teksten endres', async () => {
    const changed = { ...payload, essayText: `${payload.essayText}!` };
    expect(await computeExamPayloadSha256(changed)).not.toBe(payload.sha256);
  });
});

describe('verifisering av PDF', () => {
  it('godtar en uendret PDF (verifisert, men ikke serversignert)', async () => {
    const res = await parseExamPdfFile(fileFromBytes(pdfBytes, 'a.pdf', 'Student Work/Ola Nordmann/Prøve/a.pdf'));
    expect(res.layer1).toBe(true);
    expect(res.layer2.ok).toBe(true);
    expect(res.verdict).toBe('verified-unsigned');
    expect(res.folderName).toBe('Ola Nordmann');
    expect(res.formattingTrusted).toBe(true);
  });

  it('avviser endret metadata (lag 1)', async () => {
    const tampered = { ...payload, essayText: payload.essayText.replace('Cubakrisen', 'Koreakrigen') };
    const bytes = await renderEssayPdf(tampered);
    const res = await parseExamPdfFile(fileFromBytes(bytes, 'b.pdf'));
    expect(res.layer1).toBe(false);
    expect(res.verdict).toBe('invalid');
  });

  it('avviser omberegnet hash når synlig tekst ikke er endret tilsvarende', async () => {
    // Forfalskning: ny tekst i metadata + ny hash, men den gamle synlige teksten beholdes.
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const forged = { ...payload, essayText: payload.essayText.replace('Atomvåpen', 'Romkappløpet') };
    forged.sha256 = await computeExamPayloadSha256(forged);
    const enc = Buffer.from(JSON.stringify(forged)).toString('base64');
    pdfDoc.setSubject(`CURIOSA_PAYLOAD:${enc}`);
    pdfDoc.setKeywords([`CURIOSA_PAYLOAD:${enc}`]);
    const res = await parseExamPdfFile(fileFromBytes(await pdfDoc.save(), 'c.pdf'));
    expect(res.layer1).toBe(true);
    expect(res.layer2.ok).toBe(false);
    expect(res.layer2.detail).not.toMatch(/Kunne ikke lese/);
    expect(res.verdict).toBe('invalid');
  });

  it('avviser synlig tekst lagt til i etterkant uten å røre metadata (lag 2)', async () => {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.getPages()[0];
    page.drawRectangle({ x: 50, y: 560, width: 500, height: 200, color: rgb(1, 1, 1) });
    page.drawText('Helt ny og bedre tekst skrevet etterpå', { x: 56, y: 700, size: 11, font });
    const res = await parseExamPdfFile(fileFromBytes(await pdfDoc.save(), 'd.pdf'));
    expect(res.layer1).toBe(true);
    expect(res.layer2.ok).toBe(false);
    expect(res.layer2.detail).not.toMatch(/Kunne ikke lese/);
    expect(res.verdict).toBe('invalid');
  });

  it('avviser tekst lagt til utenfor besvarelsesområdet', async () => {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.getPages().at(-1);
    page.drawText('Aktiv tid: 90 min (korrigert)', { x: 300, y: 50, size: 8, font });
    const res = await parseExamPdfFile(fileFromBytes(await pdfDoc.save(), 'f.pdf'));
    expect(res.layer2.ok).toBe(false);
    expect(res.layer2.detail).not.toMatch(/Kunne ikke lese/);
    expect(res.verdict).toBe('invalid');
  });

  it('gjenkjenner PDF-er uten kvittering', async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    const res = await parseExamPdfFile(fileFromBytes(await doc.save(), 'e.pdf'));
    expect(res.verdict).toBe('not-curiosa');
  });
});

describe('Ed25519-signatur', () => {
  it('verifiserer gyldig signatur og avviser feil hash', async () => {
    const priv = ed.utils.randomSecretKey();
    const pub = await ed.getPublicKeyAsync(priv);
    const keys = { ...SIGNING_PUBLIC_KEYS, test: Buffer.from(pub).toString('base64') };
    const signedAt = new Date(Date.parse(payload.completedAt) + 2000).toISOString();
    const msg = new TextEncoder().encode(signatureMessage({ examId: payload.examId, sha256: payload.sha256, signedAt }));
    const signature = Buffer.from(await ed.signAsync(msg, priv)).toString('base64');
    const signed = { ...payload, signature, signedAt, keyId: 'test' };

    expect((await verifySebSignature(signed, keys)).status).toBe('valid');
    expect((await verifySebSignature({ ...signed, sha256: '0'.repeat(64) }, keys)).status).toBe('invalid');
    const late = { ...signed, completedAt: new Date(Date.parse(signedAt) - 10 * 60_000).toISOString() };
    // completedAt endret => signaturen gjelder fortsatt hash, men forsinkelsen flagges
    expect((await verifySebSignature(late, keys)).status).toBe('late');
  });

  it('melder manglende signatur', async () => {
    expect((await verifySebSignature(payload)).status).toBe('missing');
  });
});

describe('mappenavn fra Teams', () => {
  it('henter elevmappen under Student Work', () => {
    expect(folderNameFromPath('Student Work/Kari Nordmann/Kapittel 7/p.pdf')).toBe('Kari Nordmann');
    expect(folderNameFromPath('Historieprøve/Ola/p.pdf')).toBe('Ola');
    expect(folderNameFromPath('p.pdf')).toBe('');
  });
});
