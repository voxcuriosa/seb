import { useState } from 'react';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import AuthorMailLink from '../common/AuthorMailLink';

/** PIN-sperre for Fane 1. PIN-en sjekkes av Cloud Function (Secret Manager), aldri i nettleseren. */
export default function TeacherPinGate({ onUnlock, busy, error }) {
  const [pin, setPin] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!pin.trim()) return;
    const ok = await onUnlock(pin.trim());
    if (!ok) setPin('');
  };

  return (
    <form onSubmit={submit} className="max-w-md mx-auto mt-6 p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <KeyRound size={20} aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-black text-white">Lærer-PIN</h2>
          <p className="text-xs text-slate-400">Kreves for å opprette prøver. Kontroll av PDF-er er åpen.</p>
        </div>
      </div>
      <label className="block">
        <span className="sr-only">PIN-kode</span>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN-kode"
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg tracking-[0.4em] text-white placeholder:tracking-normal placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'pin-error' : undefined}
        />
      </label>
      {error && (
        <p id="pin-error" className="text-sm font-bold text-red-300" role="alert">{error}</p>
      )}
      <button
        type="submit"
        disabled={busy || !pin.trim()}
        className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
      >
        {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <ShieldCheck size={16} aria-hidden="true" />}
        <span>Lås opp</span>
      </button>
      <p className="text-[11px] text-slate-500 leading-relaxed text-center">
        Kontakt <AuthorMailLink label="Christian Borchgrevink-Vigeland" subject="Forespørsel om lærer-PIN til SEB-prøver" /> for å få PIN-kode.
      </p>
      <p className="text-[11px] text-slate-500 text-center pt-1 border-t border-slate-800/80">
        Kildekode på GitHub:{' '}
        <a
          href="https://github.com/voxcuriosa/seb"
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:text-emerald-300 underline font-mono"
        >
          github.com/voxcuriosa/seb
        </a>
      </p>
    </form>
  );
}
