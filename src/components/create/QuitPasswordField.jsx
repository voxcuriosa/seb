import { useState } from 'react';
import { Eye, EyeOff, KeyRound, AlertTriangle } from 'lucide-react';

/** Valgfritt avslutningspassord (nød-PIN). Hashes med SHA-256 før lagring, klarteksten sendes aldri. */
export default function QuitPasswordField({ value, onChange }) {
  const [show, setShow] = useState(false);
  const weak = value && value.length < 8;

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
        <KeyRound size={14} className="text-emerald-400" aria-hidden="true" /> Avslutningspassord / nød-PIN (valgfritt)
      </h3>
      <p className="text-xs text-slate-400">Lar deg avslutte SEB manuelt på en elevmaskin (for eksempel ved tekniske problemer). Uten passord kan SEB bare avsluttes ved levering.</p>
      <div className="relative max-w-sm">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
          placeholder="Minst 8 tegn anbefales"
          aria-label="Avslutningspassord"
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Skjul passord' : 'Vis passord'}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {weak && (
        <p className="text-xs text-amber-200 flex items-start gap-1.5">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-300" aria-hidden="true" />
          Korte passord kan knekkes av teknisk kyndige elever, fordi .seb-filen inneholder en hash av passordet.
        </p>
      )}
    </section>
  );
}
