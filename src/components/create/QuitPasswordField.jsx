import { useState } from 'react';
import { Eye, EyeOff, KeyRound, AlertTriangle, ShieldCheck } from 'lucide-react';

/**
 * Avslutningspassord / PIN.
 * Hashes med SHA-256 før lagring; klarteksten sendes aldri til server.
 * Valgfritt ved ordinære prøver, men påkrevd ved Microsoft Forms.
 */
export default function QuitPasswordField({ value, onChange, required = false }) {
  const [show, setShow] = useState(false);
  const weak = value && value.length < 4;

  return (
    <section className={`p-4 rounded-2xl border transition-colors ${
      required
        ? 'bg-amber-950/20 border-amber-500/50'
        : 'bg-slate-900 border-slate-800'
    } space-y-2.5`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
          <KeyRound size={15} className={required ? 'text-amber-400' : 'text-emerald-400'} aria-hidden="true" />
          <span>Avslutningspassord / PIN</span>
          {required ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black">
              Påkrevd for Forms
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-normal lowercase">(valgfritt)</span>
          )}
        </h3>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        {required
          ? 'Siden Microsoft Forms ikke kan lukke SEB automatisk, må du opprette en PIN (minst 4 tegn). Når eleven har levert og viser deg kvitteringsskjermen på pulten, taster du inn koden for å avslutte SEB.'
          : 'Lar deg avslutte SEB manuelt på en elevmaskin (f.eks. ved tekniske problemer). Uten passord kan SEB bare avsluttes ved fullført innlevering.'}
      </p>

      <div className="relative max-w-sm">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
          placeholder={required ? 'Skriv inn en PIN (minst 4 tegn)' : 'Minst 8 tegn anbefales'}
          aria-label="Avslutningspassord"
          aria-required={required}
          className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none ${
            required && !value
              ? 'border-amber-500/70 focus:border-amber-400'
              : 'border-slate-700 focus:border-emerald-500'
          }`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Skjul passord' : 'Vis passord'}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {required && !value && (
        <p className="text-xs text-amber-300 font-medium flex items-center gap-1.5">
          <AlertTriangle size={13} className="shrink-0" aria-hidden="true" />
          Sett en PIN for å kunne fullføre oppsettet av Forms-prøven.
        </p>
      )}

      {weak && (
        <p className="text-xs text-amber-200 flex items-start gap-1.5">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-300" aria-hidden="true" />
          Koden bør være minst 4 siffer eller tegn.
        </p>
      )}

      {value && value.length >= 4 && (
        <p className="text-xs text-emerald-400 flex items-center gap-1.5">
          <ShieldCheck size={14} className="shrink-0" aria-hidden="true" />
          Koden hashes lokalt i nettleseren og kan ikke leses av andre.
        </p>
      )}
    </section>
  );
}
