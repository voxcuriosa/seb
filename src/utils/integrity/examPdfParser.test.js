// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument, PDFName, StandardFonts, rgb, pushGraphicsState, popGraphicsState, PDFOperator } from 'pdf-lib';
import { buildEssayPayload, renderEssayPdf } from '../exam/essayPdfGenerator';
import { parseExamPdfFile, folderNameFromPath } from './examPdfParser';
import { computeExamPayloadSha256, decodePayload, SEB_ESSAY_TYPE, LEGACY_EXAM_TYPE } from './payloadHash';
import { signatureMessage, verifySebSignature } from './signature';
import { SIGNING_PUBLIC_KEYS } from './publicKey';
import { analyzeSubmissionBatch } from '../../hooks/useSubmissions';
import { docToPlainText } from '../exam/essayDocModel';
import { countWords } from './textNormalize';

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

// Minimal gyldig 1x1 gjennomsiktig PNG (base64) for XObject-test
const ONE_PX_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

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

describe('payload (v4 og bakoverkompatibilitet)', () => {
  it('lager v4-payload med kanonisk ren tekst, listemarkører og uten navn', () => {
    expect(payload.version).toBe(4);
    expect(payload.essayText).toContain('- Ideologiske motsetninger');
    expect(payload.essayText).toContain('2. Cubakrisen');
    expect(payload.pasteIncidents).toBe(1);
    expect(payload.focusLossIncidents).toBe(1);
    expect(payload.incidentCount).toBe(2);
    expect(payload.receiptCode).toMatch(/^[2-9A-HJ-NP-Z]{4}$/);
    expect(JSON.stringify(payload)).not.toMatch(/studentName|elevnavn/i);
  });

  it('beholder de 100 første og 100 siste hendelsene når incidents overstiger 200', async () => {
    const many = Array.from({ length: 250 }, (_, idx) => ({
      type: idx === 249 ? 'PASTE' : 'FOCUS_LOST',
      at: new Date(1700000000000 + idx * 1000).toISOString(),
      detail: `hendelse-${idx}`
    }));
    const p = await buildEssayPayload({ exam, essayDoc, startedAt: Date.now() - 3600_000, activeSeconds: 1200, incidents: many });
    expect(p.incidentCount).toBe(250);
    expect(p.incidents).toHaveLength(200);
    expect(p.incidents[0].detail).toBe('hendelse-0');
    expect(p.incidents[99].detail).toBe('hendelse-99');
    expect(p.incidents[100].detail).toBe('hendelse-150');
    expect(p.incidents[199].detail).toBe('hendelse-249');
  });

  it('hash endres når teksten, focusLossIncidents eller incidents endres i v4', async () => {
    const changedText = { ...payload, essayText: `${payload.essayText}!` };
    expect(await computeExamPayloadSha256(changedText)).not.toBe(payload.sha256);

    const changedFocus = { ...payload, focusLossIncidents: 0 };
    expect(await computeExamPayloadSha256(changedFocus)).not.toBe(payload.sha256);

    const changedIncidents = { ...payload, incidents: [] };
    expect(await computeExamPayloadSha256(changedIncidents)).not.toBe(payload.sha256);
  });

  it('decodePayload avviser ikke-objekter som null, tall, strenger og lister', () => {
    expect(decodePayload(Buffer.from('null').toString('base64'))).toBeNull();
    expect(decodePayload(Buffer.from('"streng"').toString('base64'))).toBeNull();
    expect(decodePayload(Buffer.from('[1,2,3]').toString('base64'))).toBeNull();
    expect(decodePayload(Buffer.from('123').toString('base64'))).toBeNull();
    expect(decodePayload(Buffer.from('{"ok":true}').toString('base64'))).toEqual({ ok: true });
  });
});

describe('verifisering av PDF og manipuleringssjekk', () => {
  it('godtar en uendret PDF (verifisert, men ikke serversignert)', async () => {
    const res = await parseExamPdfFile(fileFromBytes(pdfBytes, 'a.pdf', 'Student Work/Ola Nordmann/Prøve/a.pdf'));
    expect(res.layer1).toBe(true);
    expect(res.layer2.ok).toBe(true);
    expect(res.verdict).toBe('verified-unsigned');
    expect(res.folderName).toBe('Ola Nordmann');
    expect(res.formattingTrusted).toBe(true);
  });

  it('godtar ekte flersides v4-PDF med overskrifter, lister og rik formatering 100 %', async () => {
    const longBlocks = Array.from({ length: 45 }, (_, idx) => ({
      type: 'paragraph',
      content: [
        { type: 'text', text: `Avsnitt ${idx + 1}: Dette er en grundig drøfting som strekker seg over flere sider i PDF-dokumentet med ` },
        { type: 'text', text: 'uthevet fagbegrep', marks: [{ type: 'bold' }] },
        { type: 'text', text: ', ' },
        { type: 'text', text: 'kursivert sitat', marks: [{ type: 'italic' }] },
        { type: 'text', text: ' og ' },
        { type: 'text', text: 'understreket konklusjon', marks: [{ type: 'underline' }] },
        { type: 'text', text: ' slik at både sideskift, topptekst og bunntekst testes reelt.' }
      ]
    }));
    const multiDoc = { type: 'doc', content: [...essayDoc.content, ...longBlocks] };
    const multiPayload = await buildEssayPayload({
      exam,
      essayDoc: multiDoc,
      startedAt: Date.now() - 7200_000,
      activeSeconds: 5400,
      incidents
    });
    const multiBytes = await renderEssayPdf(multiPayload);
    const parsedDoc = await PDFDocument.load(multiBytes);
    expect(parsedDoc.getPageCount()).toBeGreaterThanOrEqual(3);

    const res = await parseExamPdfFile(fileFromBytes(multiBytes, 'flersides.pdf'));
    expect(res.layer1).toBe(true);
    expect(res.layer2.ok).toBe(true);
    expect(res.verdict).toBe('verified-unsigned');
    expect(res.formattingTrusted).toBe(true);
  });

  it('godtar eldre v3-PDF 100 % (bakoverkompatibel verifisering)', async () => {
    const essayText = docToPlainText(essayDoc);
    const v3Payload = {
      type: SEB_ESSAY_TYPE,
      version: 3,
      receiptCode: 'K9P4',
      nonce: '0123456789abcdef0123456789abcdef',
      examId: 'legacy_v3_exam',
      examTitle: 'Eldre prøve v3',
      startedAt: '2026-09-01T08:00:00.000Z',
      completedAt: '2026-09-01T10:00:00.000Z',
      wordCount: countWords(essayText),
      activeSeconds: 6000,
      incidentCount: 1,
      pasteIncidents: 0,
      appSwitchIncidents: 0,
      focusLossIncidents: 1,
      incidents: [{ type: 'FOCUS_LOST', at: '2026-09-01T09:00:00.000Z', detail: '4 s utenfor prøven' }],
      essayText,
      essayDoc
    };
    v3Payload.sha256 = await computeExamPayloadSha256(v3Payload);
    const v3Bytes = await renderEssayPdf(v3Payload);
    const res = await parseExamPdfFile(fileFromBytes(v3Bytes, 'eldre-v3.pdf'));
    expect(res.layer1).toBe(true);
    expect(res.layer2.ok).toBe(true);
    expect(res.verdict).toBe('verified-unsigned');
  });

  it('avviser endring av focusLossIncidents eller incidents på en v4-PDF som invalid', async () => {
    const tamperedFocus = { ...payload, focusLossIncidents: 0 };
    const resFocus = await parseExamPdfFile(fileFromBytes(await renderEssayPdf(tamperedFocus), 'focus-tamper.pdf'));
    expect(resFocus.layer1).toBe(false);
    expect(resFocus.verdict).toBe('invalid');

    const tamperedIncidents = {
      ...payload,
      incidents: [{ type: 'FOCUS_LOST', at: '2026-10-23T10:05:00.000Z', detail: 'Endret logglinje' }, incidents[1]]
    };
    const resInc = await parseExamPdfFile(fileFromBytes(await renderEssayPdf(tamperedIncidents), 'inc-tamper.pdf'));
    expect(resInc.layer1).toBe(false);
    expect(resInc.verdict).toBe('invalid');
  });

  it('avviser markør-smugling (CURIOSA_DATA_START:...:CURIOSA_DATA_END) som invalid', async () => {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.getPages()[0];
    page.drawText('CURIOSA_DATA_START: Ekstra smuglet tekst som vises i PDF-leseren :CURIOSA_DATA_END', {
      x: 56,
      y: 60,
      size: 9,
      font
    });
    const res = await parseExamPdfFile(fileFromBytes(await pdfDoc.save(), 'smuggled.pdf'));
    expect(res.layer2.ok).toBe(false);
    expect(res.verdict).toBe('invalid');
  });

  it('avviser innlagt PDF-annotasjon (/Annots) som invalid', async () => {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPages()[0];
    const annotRef = pdfDoc.context.register(
      pdfDoc.context.obj({
        Type: 'Annot',
        Subtype: 'Text',
        Rect: [100, 500, 300, 550],
        Contents: 'Skjult tekst i annotasjon'
      })
    );
    page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([annotRef]));
    const res = await parseExamPdfFile(fileFromBytes(await pdfDoc.save(), 'annot.pdf'));
    expect(res.layer2.ok).toBe(false);
    expect(res.layer2.detail).toMatch(/annotasjoner/i);
    expect(res.verdict).toBe('invalid');
  });

  it('avviser ekstra side lagt til i PDF-en som invalid', async () => {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    pdfDoc.addPage();
    const res = await parseExamPdfFile(fileFromBytes(await pdfDoc.save(), 'extra-page.pdf'));
    expect(res.layer2.ok).toBe(false);
    expect(res.layer2.detail).toMatch(/Sideantallet/i);
    expect(res.verdict).toBe('invalid');
  });

  it('avviser innlagt bilde (/XObject) og vektorkurver (c) som invalid', async () => {
    const pdfWithImg = await PDFDocument.load(pdfBytes);
    const png = await pdfWithImg.embedPng(Buffer.from(ONE_PX_PNG_B64, 'base64'));
    pdfWithImg.getPages()[0].drawImage(png, { x: 100, y: 400, width: 20, height: 20 });
    const resImg = await parseExamPdfFile(fileFromBytes(await pdfWithImg.save(), 'img.pdf'));
    expect(resImg.layer2.ok).toBe(false);
    expect(resImg.verdict).toBe('invalid');

    const pdfWithCurve = await PDFDocument.load(pdfBytes);
    pdfWithCurve.getPages()[0].drawCircle({ x: 200, y: 400, size: 15, color: rgb(0, 0, 0) });
    const resCurve = await parseExamPdfFile(fileFromBytes(await pdfWithCurve.save(), 'curve.pdf'));
    expect(resCurve.layer2.ok).toBe(false);
    expect(resCurve.layer2.detail).toMatch(/vektorkurver/i);
    expect(resCurve.verdict).toBe('invalid');
  });

  it('avviser usynlig tekstmodus (3 Tr) i innholdsstrømmen som invalid', async () => {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPages()[0];
    page.pushOperators(
      pushGraphicsState(),
      PDFOperator.of('BT'),
      PDFOperator.of('3 Tr'),
      PDFOperator.of('ET'),
      popGraphicsState()
    );
    const res = await parseExamPdfFile(fileFromBytes(await pdfDoc.save(), 'invisible-tr.pdf'));
    expect(res.layer2.ok).toBe(false);
    expect(res.verdict).toBe('invalid');
  });

  it('avviser PDF over 20 MB og beskytter mot dyp essayDoc-rekursjon', async () => {
    const hugeFile = {
      name: 'huge.pdf',
      size: 21 * 1024 * 1024,
      lastModified: 1,
      arrayBuffer: async () => new ArrayBuffer(0)
    };
    const resHuge = await parseExamPdfFile(hugeFile);
    expect(resHuge.verdict).toBe('invalid');
    expect(resHuge.reasons[0]).toMatch(/20 MB/);

    let deepNode = { type: 'text', text: 'bunn' };
    for (let d = 0; d < 25; d++) {
      deepNode = { type: 'bulletList', content: [{ type: 'listItem', content: [deepNode] }] };
    }
    const forged = { ...payload, essayDoc: { type: 'doc', content: [deepNode] }, examTitle: { bad: true } };
    forged.sha256 = await computeExamPayloadSha256(forged);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const enc = Buffer.from(JSON.stringify(forged)).toString('base64');
    pdfDoc.setSubject(`CURIOSA_PAYLOAD:${enc}`);
    const resDeep = await parseExamPdfFile(fileFromBytes(await pdfDoc.save(), 'deep.pdf'));
    expect(resDeep.verdict).toBe('invalid');
    expect(typeof resDeep.payload.examTitle).toBe('string');
    expect(resDeep.formattingTrusted).toBe(false);
  });

  it('avviser endret metadata (lag 1)', async () => {
    const tampered = { ...payload, essayText: payload.essayText.replace('Cubakrisen', 'Koreakrigen') };
    const bytes = await renderEssayPdf(tampered);
    const res = await parseExamPdfFile(fileFromBytes(bytes, 'b.pdf'));
    expect(res.layer1).toBe(false);
    expect(res.verdict).toBe('invalid');
  });

  it('avviser omberegnet hash når synlig tekst ikke er endret tilsvarende', async () => {
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

describe('Ed25519-signatur, tidslogikk og bunke-duplikater', () => {
  it('verifiserer gyldig signatur, avviser prototypenøkler (Object.hasOwn) og umulig aktiv tid', async () => {
    const { generateKeyPairSync, createPrivateKey, sign } = await import('node:crypto');
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const privDerB64 = privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64');
    const pubDerB64 = publicKey.export({ format: 'der', type: 'spki' }).toString('base64');

    const keys = { ...SIGNING_PUBLIC_KEYS, derTest: pubDerB64 };
    const signedAt = new Date(Date.parse(payload.completedAt) + 2000).toISOString();
    const msg = Buffer.from(signatureMessage({ examId: payload.examId, sha256: payload.sha256, signedAt }), 'utf8');
    const pk = createPrivateKey({ key: Buffer.from(privDerB64, 'base64'), format: 'der', type: 'pkcs8' });
    const signature = sign(null, msg, pk).toString('base64');
    const signed = { ...payload, signature, signedAt, keyId: 'derTest' };

    expect((await verifySebSignature(signed, keys)).status).toBe('valid');
    expect((await verifySebSignature({ ...signed, keyId: 'toString' })).status).toBe('unknown-key');
    expect((await verifySebSignature({ ...signed, keyId: 'constructor' }, keys)).status).toBe('unknown-key');
    expect((await verifySebSignature({ ...signed, sha256: '0'.repeat(64) }, keys)).status).toBe('invalid');
    const late = { ...signed, completedAt: new Date(Date.parse(signedAt) - 10 * 60_000).toISOString() };
    expect((await verifySebSignature(late, keys)).status).toBe('late');
    const nanDate = { ...signed, completedAt: 'ikke-en-dato' };
    expect((await verifySebSignature(nanDate, keys)).status).toBe('late');

    // End-to-end i parseExamPdfFile: gyldig signatur gir 'verified', mens forfalsket aktiv tid (2t på 10s) avvises som 'invalid'
    SIGNING_PUBLIC_KEYS.derTest = pubDerB64;
    try {
      const signedPdf = await renderEssayPdf(signed);
      const validRes = await parseExamPdfFile(fileFromBytes(signedPdf, 'signed-ok.pdf'));
      expect(validRes.verdict).toBe('verified');

      const nowMs = Date.now();
      const fakeTimePayload = await buildEssayPayload({
        exam,
        essayDoc,
        startedAt: nowMs - 10_000,
        activeSeconds: 7200,
        incidents: []
      });
      const fakeSignedAt = new Date(nowMs + 1000).toISOString();
      const fakeMsg = Buffer.from(signatureMessage({
        examId: fakeTimePayload.examId,
        sha256: fakeTimePayload.sha256,
        signedAt: fakeSignedAt
      }), 'utf8');
      const fakeSig = sign(null, fakeMsg, pk).toString('base64');
      const fakeSignedPdf = await renderEssayPdf({
        ...fakeTimePayload,
        signature: fakeSig,
        signedAt: fakeSignedAt,
        keyId: 'derTest'
      });
      const fakeRes = await parseExamPdfFile(fileFromBytes(fakeSignedPdf, 'signed-fake-time.pdf'));
      expect(fakeRes.verdict).toBe('invalid');
      expect(fakeRes.reasons.join(' ')).toMatch(/tidslogikk/i);
    } finally {
      delete SIGNING_PUBLIC_KEYS.derTest;
    }
  });

  it('avviser skjemafelter (/AcroForm) i katalog og eldre LEGACY_EXAM_TYPE', async () => {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    pdfDoc.catalog.set(PDFName.of('AcroForm'), pdfDoc.context.obj({ Fields: [] }));
    const resAcro = await parseExamPdfFile(fileFromBytes(await pdfDoc.save(), 'acro.pdf'));
    expect(resAcro.verdict).toBe('invalid');
    expect(resAcro.layer2.detail).toMatch(/AcroForm/);

    const legacyDoc = await PDFDocument.create();
    legacyDoc.addPage();
    const legacyEnc = Buffer.from(JSON.stringify({ type: LEGACY_EXAM_TYPE, receiptCode: 'ABCD' })).toString('base64');
    legacyDoc.setSubject(`CURIOSA_PAYLOAD:${legacyEnc}`);
    const resLegacy = await parseExamPdfFile(fileFromBytes(await legacyDoc.save(), 'legacy.pdf'));
    expect(resLegacy.verdict).toBe('not-curiosa');
  });

  it('melder manglende signatur', async () => {
    expect((await verifySebSignature(payload)).status).toBe('missing');
  });

  it('oppdager duplikater og sammenblandede prøve-ID-er i analyzeSubmissionBatch', () => {
    const batch = analyzeSubmissionBatch([
      { id: '1', folderName: 'Ola Nordmann', verdict: 'verified', payload: { examId: 'exA', sha256: 'h1', receiptCode: 'R1', signature: 's1' } },
      { id: '2', folderName: 'Per Hansen', verdict: 'verified', payload: { examId: 'exA', sha256: 'h1', receiptCode: 'R1', signature: 's1' } },
      { id: '3', folderName: 'Kari Olsen', verdict: 'verified', payload: { examId: 'exB', sha256: 'h3', receiptCode: 'R3', signature: 's3' } }
    ]);
    const ola = batch.find((x) => x.id === '1');
    const per = batch.find((x) => x.id === '2');
    const kari = batch.find((x) => x.id === '3');
    expect(ola.isDuplicate).toBe(true);
    expect(ola.duplicateOf).toBe('Per Hansen');
    expect(per.isDuplicate).toBe(true);
    expect(per.duplicateOf).toBe('Ola Nordmann');
    expect(kari.isDuplicate).toBe(false);
    expect(kari.examIdMismatch).toBe(true);
    expect(ola.examIdMismatch).toBe(false);
  });
});

describe('mappenavn fra Teams', () => {
  it('henter elevmappen under Student Work', () => {
    expect(folderNameFromPath('Student Work/Kari Nordmann/Kapittel 7/p.pdf')).toBe('Kari Nordmann');
    expect(folderNameFromPath('Historieprøve/Ola/p.pdf')).toBe('Ola');
    expect(folderNameFromPath('p.pdf')).toBe('');
  });
});
