/**
 * useFinishExam.js
 * «Fullfør og last ned PDF»: bygger payload lokalt, ber om serversignatur av KUN hashen,
 * genererer PDF lokalt, laster den ned og sender eleven til /quit (SEB låses opp).
 */
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { callSignSebSubmission } from '../firebase';
import { buildEssayPayload, renderEssayPdf, essayPdfFileName, downloadBytes } from '../utils/exam/essayPdfGenerator';

const SIGN_TIMEOUT_MS = 8000;
const QUIT_DELAY_MS = 3000;

async function requestSignature(examId, sha256) {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), SIGN_TIMEOUT_MS));
  // Personvern: bare examId og hashen sendes. Aldri tekst eller navn.
  const res = await Promise.race([callSignSebSubmission({ examId, sha256 }), timeout]);
  return res?.data || null;
}

export function useFinishExam({ exam, getEssayDoc, getActiveSeconds, getIncidents, startedAt, onFinished }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('idle'); // idle | signing | rendering | done | error
  const [result, setResult] = useState(null);

  const finish = useCallback(async () => {
    setPhase('signing');
    try {
      const payload = await buildEssayPayload({
        exam,
        essayDoc: getEssayDoc(),
        startedAt,
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
      setTimeout(() => navigate('/quit', { replace: true }), QUIT_DELAY_MS);
    } catch (err) {
      console.error('[SEB] Kunne ikke lage PDF:', err?.message);
      setPhase('error');
    }
  }, [exam, getEssayDoc, getActiveSeconds, getIncidents, startedAt, onFinished, navigate]);

  const downloadAgain = useCallback(() => {
    if (result?.bytes) downloadBytes(result.bytes, result.fileName);
  }, [result]);

  return { finish, phase, result, downloadAgain };
}
