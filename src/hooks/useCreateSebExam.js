/**
 * useCreateSebExam.js
 * PIN-kontroll og oppretting av prøve via Cloud Function createSebExam.
 * PIN-en lagres bare i sessionStorage for denne fanen (forsvinner når fanen lukkes).
 */
import { useCallback, useState } from 'react';
import { callCreateSebExam } from '../firebase';
import { fileToBase64 } from '../utils/files';
import { sha256Hex } from '../utils/integrity/sha256';

const PIN_KEY = 'seb_teacher_pin_session';

function readPin() {
  try {
    return sessionStorage.getItem(PIN_KEY) || '';
  } catch {
    return '';
  }
}

function friendlyError(err) {
  const code = String(err?.code || '').replace('functions/', '');
  if (code === 'permission-denied') return 'Feil PIN-kode.';
  if (code === 'resource-exhausted') return err.message || 'For mange forsøk. Vent litt og prøv igjen.';
  if (code === 'invalid-argument') return err.message || 'Noe i skjemaet er ugyldig.';
  if (code === 'unavailable' || code === 'deadline-exceeded') return 'Fikk ikke kontakt med serveren. Sjekk nettforbindelsen.';
  return 'Noe gikk galt. Prøv igjen om litt.';
}

export function useCreateSebExam() {
  const [pin, setPin] = useState(readPin);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const unlock = useCallback(async (candidate) => {
    setBusy(true);
    setError('');
    try {
      await callCreateSebExam({ pin: candidate, dryRun: true });
      sessionStorage.setItem(PIN_KEY, candidate);
      setPin(candidate);
      return true;
    } catch (err) {
      setError(friendlyError(err));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const lock = useCallback(() => {
    sessionStorage.removeItem(PIN_KEY);
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
      const res = await callCreateSebExam({ pin, exam });
      return { ...res.data, quitPasswordHash: exam.sebConfig.quitPasswordHash };
    } catch (err) {
      if (String(err?.code).includes('permission-denied')) lock();
      setError(friendlyError(err));
      return null;
    } finally {
      setBusy(false);
    }
  }, [pin, lock]);

  return { isUnlocked: Boolean(pin), unlock, lock, createExam, busy, error, setError };
}
