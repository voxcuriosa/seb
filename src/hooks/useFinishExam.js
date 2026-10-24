/**
 * useFinishExam.js
 * «Fullfør og last ned PDF»: bygger payload lokalt, ber om serversignatur av KUN hashen,
 * genererer PDF lokalt, laster den ned og lar eleven bekrefte før SEB avsluttes og utkastet slettes.
 */
import { useCallback, useState } from 'react';
import { callSignSebSubmission } from '../firebase';
import { EXAM_QUIT_URL } from '../config';
import { buildEssayPayload, renderEssayPdf, essayPdfFileName, downloadBytes } from '../utils/exam/essayPdfGenerator';
import { clearDraft } from '../utils/exam/localStore';

const SIGN_TIMEOUT_MS = 8000;

async function requestSignature(examId, sha256) {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), SIGN_TIMEOUT_MS));
  // Personvern: bare examId og hashen sendes. Aldri tekst eller navn.
  const res = await Promise.race([callSignSebSubmission({ examId, sha256 }), timeout]);
  return res?.data || null;
}

export function useFinishExam({ exam, getEssayDoc, getActiveSeconds, getIncidents, getStartedAt, onFinished, onBeforeExit }) {
  const [phase, setPhase] = useState('idle'); // idle | signing | rendering | done | error
  const [result, setResult] = useState(null);

  const finish = useCallback(async () => {
    setPhase('signing');
    try {
      const payload = await buildEssayPayload({
        exam,
        essayDoc: getEssayDoc(),
        startedAt: typeof getStartedAt === 'function' ? getStartedAt() : getStartedAt,
        activeSeconds: getActiveSeconds(),
        incidents: getIncidents()
      });
      try {
        const sig = await requestSignature(payload.examId, payload.sha256);
        if (sig?.signature) Object.assign(payload, { signature: sig.signature, signedAt: sig.signedAt, keyId: sig.keyId });
      } catch {
        /* Uten nett: PDF-en merkes «Ikke serversignert». */
      }
      setPhase('rendering');
      const bytes = await renderEssayPdf(payload);
      const fileName = essayPdfFileName(payload);
      downloadBytes(bytes, fileName);
      const info = { fileName, receiptCode: payload.receiptCode, signed: Boolean(payload.signature), bytes };
      setResult(info);
      setPhase('done');
      await onFinished?.(payload);
    } catch (err) {
      console.error('[SEB] Kunne ikke lage PDF:', err?.message);
      setPhase('error');
    }
  }, [exam, getEssayDoc, getActiveSeconds, getIncidents, getStartedAt, onFinished]);

  const downloadAgain = useCallback(() => {
    if (result?.bytes) downloadBytes(result.bytes, result.fileName);
  }, [result]);

  const exitSeb = useCallback(async () => {
    // Stopp autolagring før vi sletter, slik at pagehide/beforeunload ikke skriver utkastet tilbake
    onBeforeExit?.();
    if (exam?.id) {
      // Slett lokalt utkast umiddelbart fra disk/cache
      await clearDraft(exam.id);
    }
    // Viktig for SEB: Må gjøre en ekte HTTP-navigering (ikke SPA pushState),
    // slik at SEBs RequestHandler.OnBeforeBrowse fanger opp quitURL og låser opp maskinen.
    window.location.href = EXAM_QUIT_URL;
  }, [exam, onBeforeExit]);

  return { finish, phase, result, downloadAgain, exitSeb };
}
