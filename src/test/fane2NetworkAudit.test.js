// @vitest-environment node
/**
 * fane2NetworkAudit.test.js
 * Empirisk nettverksovervåking av Fane 2 (sensor/kontroll av innleverte PDF-er)
 * og enhetstester for runtimeNetworkFirewall i prøverommet.
 *
 * Installerer aktive nettverkssonder på alle kjente transportlag (fetch, XMLHttpRequest,
 * sendBeacon, WebSocket), mater inn ekte PDF-er og verifiserer at Fane 2 utfører
 * nøyaktig 0 eksterne forespørsler under hele analyse- og kontrolløpet.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildEssayPayload, renderEssayPdf } from '../utils/exam/essayPdfGenerator.js';
import { parseExamPdfFile } from '../utils/integrity/examPdfParser.js';
import { assertAllowedExamRoomPayload, withZeroNetworkFirewall, installRuntimeNetworkFirewall } from '../utils/runtimeNetworkFirewall.js';

describe('Empirisk nettverksrevisjon av Fane 2 (Kontroll av PDF-er)', () => {
  const recordedNetworkCalls = [];
  let originalFetch;
  let originalXhr;
  let originalSendBeacon;
  let originalWebSocket;

  beforeEach(() => {
    recordedNetworkCalls.length = 0;

    // 1. Spioner på globalThis.fetch
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn((url, options) => {
      recordedNetworkCalls.push({ type: 'fetch', url: String(url), options });
      return Promise.reject(new Error(`Uventet nettverkskall blokkert: ${url}`));
    });

    // 2. Spioner på XMLHttpRequest
    originalXhr = globalThis.XMLHttpRequest;
    class MockXHR {
      open(method, url) {
        recordedNetworkCalls.push({ type: 'xhr', method, url: String(url) });
        throw new Error(`Uventet XHR blokkert: ${url}`);
      }
      send() {}
    }
    globalThis.XMLHttpRequest = MockXHR;

    // 3. Spioner på navigator.sendBeacon
    if (typeof navigator !== 'undefined') {
      originalSendBeacon = navigator.sendBeacon;
      navigator.sendBeacon = vi.fn((url) => {
        recordedNetworkCalls.push({ type: 'sendBeacon', url: String(url) });
        return false;
      });
    }

    // 4. Spioner på WebSocket
    originalWebSocket = globalThis.WebSocket;
    class MockWebSocket {
      constructor(url) {
        recordedNetworkCalls.push({ type: 'websocket', url: String(url) });
        throw new Error(`Uventet WebSocket blokkert: ${url}`);
      }
    }
    globalThis.WebSocket = MockWebSocket;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.XMLHttpRequest = originalXhr;
    if (typeof navigator !== 'undefined' && originalSendBeacon !== undefined) {
      navigator.sendBeacon = originalSendBeacon;
    }
    globalThis.WebSocket = originalWebSocket;
  });

  it('Verifiserer at Fane 2 leser, parser og kontrollerer PDF-er med nøyaktig 0 nettverkskall', async () => {
    // 1. Klargjør en ekte prøvebesvarelse
    const exam = { id: 'examNetAudit999abc', title: 'Tentamen med empirisk personverntest' };
    const essayDoc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Empirisk personvernrapport' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Dette er elevens besvarelse som skal kontrolleres av sensor i Fane 2.' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Analysen foregår utelukkende i nettleserens RAM via Mozilla pdf.js.' }] }
      ]
    };

    const payload = await buildEssayPayload({
      exam,
      essayDoc,
      startedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      activeSeconds: 3400,
      incidents: []
    });

    const pdfBytes = await renderEssayPdf(payload);

    const mockPdfFile = new File([pdfBytes], 'Elev_123_Tentamen.pdf', {
      type: 'application/pdf',
      lastModified: Date.now()
    });
    Object.defineProperty(mockPdfFile, 'webkitRelativePath', {
      value: 'Student Work/Kari Nordmann/Prøve/Elev_123_Tentamen.pdf'
    });

    // 2. Kjør Fane 2 sin PDF-parser og kontrolllogikk under aktiv overvåking
    const parseResult = await parseExamPdfFile(mockPdfFile);

    // 3. Verifiser at analysen og integritetskontrollen lykkes
    expect(parseResult.verdict).toBe('verified-unsigned');
    expect(parseResult.layer1).toBe(true);
    expect(parseResult.layer2.ok).toBe(true);
    expect(parseResult.payload.examId).toBe('examNetAudit999abc');
    expect(parseResult.payload.examTitle).toBe('Tentamen med empirisk personverntest');
    expect(parseResult.payload.wordCount).toBe(23);

    // 4. BEVIS: Absolutt 0 nettverksforespørsler ble sendt
    expect(recordedNetworkCalls).toHaveLength(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('Verifiserer at runtimeNetworkFirewall kun tillater { examId } eller { examId, sha256 } med gyldig format og null ekstra nøkler', async () => {
    const contentEndpoint = 'https://europe-west1-voxcuriosa-seb.cloudfunctions.net/getSebExamContent';
    const signEndpoint = 'https://europe-west1-voxcuriosa-seb.cloudfunctions.net/signSebSubmission';

    // 1. Gyldig henting av oppgaveinnhold ({ examId }) skal passere
    const validContentBody = JSON.stringify({
      data: {
        examId: 'Abc1234567890xyz'
      }
    });
    expect(() => assertAllowedExamRoomPayload(contentEndpoint, validContentBody)).not.toThrow();

    // 2. Gyldig signeringskall ({ examId, sha256 }) skal passere
    const validSignBody = JSON.stringify({
      data: {
        examId: 'Abc1234567890xyz',
        sha256: 'a'.repeat(64)
      }
    });
    expect(() => assertAllowedExamRoomPayload(signEndpoint, validSignBody)).not.toThrow();

    // 3. Ugyldig examId (for kort, ulovlige tegn eller for lang) skal blokkeres
    for (const badId of ['kort123', 'exam_med_understrek_12', 'A'.repeat(41)]) {
      expect(() =>
        assertAllowedExamRoomPayload(contentEndpoint, JSON.stringify({ data: { examId: badId } }))
      ).toThrow(/Ugyldig examId/);
    }

    // 4. Forsøk på å snike med elevtekst eller ekstra nøkler (inne i eller utenfor data) skal blokkeres
    const leakedBody = JSON.stringify({
      data: {
        examId: 'Abc1234567890xyz',
        sha256: 'a'.repeat(64),
        essayText: 'Hemmelig elevbesvarelse'
      }
    });
    expect(() => assertAllowedExamRoomPayload(signEndpoint, leakedBody)).toThrow(/Forbudte felter/);

    const leakedOuterBody = JSON.stringify({
      data: { examId: 'Abc1234567890xyz' },
      extra: 'Hemmelig tekst'
    });
    expect(() => assertAllowedExamRoomPayload(contentEndpoint, leakedOuterBody)).toThrow(/Forbudte felter/);

    // 5. sha256 alene uten examId eller med ugyldig sha256-verdi skal blokkeres
    expect(() =>
      assertAllowedExamRoomPayload(signEndpoint, JSON.stringify({ data: { sha256: 'a'.repeat(64) } }))
    ).toThrow(/Forbudte felter/);

    expect(() =>
      assertAllowedExamRoomPayload(signEndpoint, JSON.stringify({ data: { examId: 'Abc1234567890xyz', sha256: '1234' } }))
    ).toThrow(/Ugyldig sha256/);

    // 6. For stor kropp (> 512 byte) skal blokkeres
    expect(() => assertAllowedExamRoomPayload(signEndpoint, 'x'.repeat(600))).toThrow(/overstiger maksgrensen/);

    // 7. withZeroNetworkFirewall skal totalblokkere fetch under lokal PDF-kontroll
    const fakeGlobal = {
      fetch: vi.fn(() => Promise.resolve({ ok: true }))
    };
    installRuntimeNetworkFirewall(fakeGlobal);
    await expect(withZeroNetworkFirewall(() => fakeGlobal.fetch('https://example.com'))).rejects.toThrow(/totalblokkert/);
  });

  it('Verifiserer at history.replaceState ikke kan skru av brannmuren etter at prøverommet (/exam/*) er lastet', async () => {
    const locationObj = { pathname: '/seb/exam/Abc1234567890xyz' };
    const fakeExamGlobal = {
      location: locationObj,
      history: {
        replaceState: (_state, _title, nextUrl) => {
          locationObj.pathname = nextUrl;
        }
      },
      navigator: {
        sendBeacon: vi.fn(() => true)
      },
      fetch: vi.fn(() => Promise.resolve({ ok: true }))
    };

    installRuntimeNetworkFirewall(fakeExamGlobal);

    // Simuler angrep som prøver å endre URL bort fra /exam/ via history.replaceState
    fakeExamGlobal.history.replaceState(null, '', '/seb/');
    expect(fakeExamGlobal.location.pathname).toBe('/seb/');

    // Brannmuren skal fortsatt være låst PÅ og avvise elevtekst og sendBeacon
    await expect(
      fakeExamGlobal.fetch('https://europe-west1-voxcuriosa-seb.cloudfunctions.net/signSebSubmission', {
        method: 'POST',
        body: JSON.stringify({ data: { examId: 'Abc1234567890xyz', leaked: 'elevtekst' } })
      })
    ).rejects.toThrow(/Forbudte felter/);

    expect(fakeExamGlobal.navigator.sendBeacon('https://example.com', 'data')).toBe(false);
  });
});
