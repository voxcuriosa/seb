import { useState } from 'react';
import { CheckCircle2, LogOut, KeyRound, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { sha256Hex } from '../../utils/integrity/sha256';
import { useStudentUiLang } from '../../hooks/useStudentUiLang';

const HASH_HEX_RE = /^[0-9a-f]{64}$/i;

function FormsExitDialogBody({ quitPasswordHash = '', onConfirm, onCancel }) {
  const { t } = useStudentUiLang();
  const dir = t.rtl ? 'rtl' : 'ltr';
  const [codeInput, setCodeInput] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [verifying, setVerifying] = useState(false);

  const normalizedHash = String(quitPasswordHash || '').trim().toLowerCase();
  const requiresPassword = HASH_HEX_RE.test(normalizedHash);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (verifying) return;
    if (!requiresPassword) {
      onConfirm?.();
      return;
    }

    const trimmed = codeInput.trim();
    if (!trimmed) {
      setErrorMsg('Skriv inn avslutningskoden fra læreren for å avslutte prøven.');
      return;
    }

    setVerifying(true);
    setErrorMsg('');
    try {
      const digest = await sha256Hex(trimmed);
      if (digest.toLowerCase() !== normalizedHash) {
        setErrorMsg('Feil kodeord. Kontroller avslutningskoden med læreren og prøv igjen.');
        return;
      }
      await onConfirm?.();
    } catch {
      setErrorMsg('Kunne ikke kontrollere koden. Prøv igjen.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/95 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forms-exit-title"
    >
      <form
        onSubmit={handleSubmit}
        dir={dir}
        className={`w-full max-w-md p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-700 space-y-5 text-slate-100 shadow-2xl ${
          t.rtl ? 'text-right' : 'text-left'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 size={26} aria-hidden="true" />
          </div>
          <div>
            <h2 id="forms-exit-title" className="text-xl font-black text-white">
              {t.exitSebTitle}
            </h2>
            <p className="text-xs text-slate-400">{t.formsBadge}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-slate-200 space-y-2">
          <p className="font-bold text-white">{t.didYouSubmitForms}</p>
          <p className="text-xs text-slate-400 leading-relaxed">{t.formsSavedDirectly}</p>
        </div>

        {requiresPassword && (
          <div className="space-y-2">
            <label htmlFor="forms-quit-code" className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <KeyRound size={14} className="text-emerald-400 shrink-0" aria-hidden="true" />
              <span>Avslutningskode fra lærer</span>
            </label>
            <div className="relative">
              <input
                id="forms-quit-code"
                type={showCode ? 'text' : 'password'}
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                autoFocus
                autoComplete="off"
                placeholder="Skriv inn avslutningskode..."
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowCode((s) => !s)}
                aria-label={showCode ? 'Skjul avslutningskode' : 'Vis avslutningskode'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
              >
                {showCode ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errorMsg && (
              <p role="alert" className="text-xs font-bold text-red-300 flex items-start gap-1.5">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-400" aria-hidden="true" />
                <span>{errorMsg}</span>
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 justify-end pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={verifying}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {t.backToExamBtn}
          </button>
          <button
            type="submit"
            disabled={verifying}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 text-xs font-black uppercase tracking-wider inline-flex items-center justify-center gap-2 transition-colors shadow-lg"
          >
            <LogOut size={15} aria-hidden="true" />
            <span>{t.confirmExitSebBtn}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * FormsExitDialog.jsx
 * Trygg avslutningsdialog for prøver som gjennomføres i Microsoft Forms.
 * Når prøven har quitPasswordHash (64-tegns SHA-256 hex), må avslutningskoden
 * verifiseres kryptografisk før SEB får navigere til quitURL.
 */
export default function FormsExitDialog({ open, quitPasswordHash = '', onConfirm, onCancel }) {
  if (!open) return null;
  return <FormsExitDialogBody quitPasswordHash={quitPasswordHash} onConfirm={onConfirm} onCancel={onCancel} />;
}
