/**
 * useCreateSebExam.js
 * PIN-kontroll, oppretting og sletting av prøver via Cloud Functions.
 * PIN holdes kun i modul-minne (aldri i sessionStorage eller localStorage),
 * slik at den ikke deles med andre faner eller sider på samme domene og
 * forsvinner straks siden lukkes eller lastes inn på nytt.
 */
import { useCallback, useState } from 'react';
import { callCreateSebExam, callDeleteSebExam } from '../firebase';
import { fileToBase64 } from '../utils/files';
import { sha256Hex } from '../utils/integrity/sha256';

let memoryPin = '';

export function friendlyServerError(err) {
  const code = String(err?.code || '').replace('functions/', '');
  if (code === 'permission-denied') return 'Feil PIN-kode eller manglende slettetilgang.';
  if (code === 'resource-exhausted') return err.message || 'For mange forsøk. Vent litt og prøv igjen.';
  if (code === 'invalid-argument') return err.message || 'Noe i skjemaet er ugyldig.';
  if (code === 'unavailable' || code === 'deadline-exceeded') return 'Fikk ikke kontakt med serveren. Sjekk nettforbindelsen.';
  return 'Noe gikk galt. Prøv igjen om litt.';
}

export function useCreateSebExam() {
  const [pin, setPin] = useState(() => memoryPin);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const unlock = useCallback(async (candidate) => {
    setBusy(true);
    setError('');
    try {
      await callCreateSebExam({ pin: candidate, dryRun: true });
      memoryPin = candidate;
      setPin(candidate);
      return true;
    } catch (err) {
      const code = String(err?.code || '').replace('functions/', '');
      setError(code === 'permission-denied' ? 'Feil PIN-kode.' : friendlyServerError(err));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const lock = useCallback(() => {
    memoryPin = '';
    setPin('');
  }, []);

  /** form: { title, sourceType, promptHtml, pdfFile, formsUrl, allowedApps, allowedWebsites, quitPassword } */
  const createExam = useCallback(async (form) => {
    setBusy(true);
    setError('');
    try {
      const isForms = form.sourceType === 'forms';
      const exam = {
        title: form.title.trim(),
        sourceType: form.sourceType,
        formsUrl: isForms ? String(form.formsUrl || '').trim() : null,
        promptHtml: isForms ? '' : (form.sourceType === 'pdf' ? form.promptHtml || '' : form.promptHtml),
        sebConfig: {
          allowedApps: form.allowedApps,
          allowedWebsites: form.allowedWebsites,
          quitPasswordHash: form.quitPassword ? await sha256Hex(form.quitPassword.trim()) : ''
        }
      };
      if (form.sourceType === 'pdf' && form.pdfFile) {
        exam.pdfBase64 = await fileToBase64(form.pdfFile);
      }
      const res = await callCreateSebExam({ pin: pin || memoryPin, exam });
      return { ...res.data, quitPasswordHash: exam.sebConfig.quitPasswordHash };
    } catch (err) {
      if (String(err?.code).includes('permission-denied')) lock();
      setError(friendlyServerError(err));
      return null;
    } finally {
      setBusy(false);
    }
  }, [pin, lock]);

  const deleteServerExam = useCallback(async (examId, deleteToken = null) => {
    const res = await callDeleteSebExam({
      examId,
      deleteToken: deleteToken || null,
      pin: pin || memoryPin || null
    });
    return res?.data || { ok: true };
  }, [pin]);

  return {
    isUnlocked: Boolean(pin),
    pin,
    unlock,
    lock,
    createExam,
    deleteServerExam,
    busy,
    error,
    setError
  };
}
