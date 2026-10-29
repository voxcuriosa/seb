/**
 * VerificationStepsGuide.jsx
 * Enkel punktvis forklaring på hvordan innleverte filer sjekkes for manipulasjon.
 */
import { ShieldCheck, FileSearch, Fingerprint, Lock } from 'lucide-react';

export default function VerificationStepsGuide() {
  const steps = [
    {
      icon: FileSearch,
      title: '1. Hent elevenes PDF-er fra Teams',
      desc: 'Åpne Teams-oppgaven i SharePoint, last ned «Student Work»-mappen og pakk den ut.'
    },
    {
      icon: Fingerprint,
      title: '2. Slipp filene eller mappen rett inn her',
      desc: 'Nettleseren leser PDF-dokumentene 100 % lokalt uten at noe lastes opp til noen server.'
    },
    {
      icon: ShieldCheck,
      title: '3. Automatisk 3-lags manipulasjonskontroll',
      desc: 'SHA-256 innholds-hash, fulltekst-rekonstruksjon og digital Ed25519-kryptosignatur verifiseres.'
    },
    {
      icon: Lock,
      title: '4. Få umiddelbar status per elev',
      desc: 'Grønt stempel bekrefter at sjekksum, synlig tekst og Ed25519-serversignatur med serverklokkeslett stemmer uten etterfølgende tekstendring.'
    }
  ];

  return (
    <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
      <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400">
        Slik sjekkes filene for manipulasjon:
      </h3>
      <ol className="space-y-3">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <li key={idx} className="flex items-start gap-3 text-sm">
              <span className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <div>
                <p className="font-bold text-slate-100 leading-snug">{step.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{step.desc}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-slate-400 border-t border-slate-800 pt-3">
        Lokal kontroll i nettleseren: Elevbesvarelsene forlater ikke datamaskinen din.
      </p>
      <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200 space-y-1">
        <p className="font-bold text-emerald-300">Nøkkelfunksjoner for IT og personvern:</p>
        <p className="leading-relaxed text-slate-300">
          Kontrollmotoren i Fane 2 utfører <strong>ingen nettverkskall</strong> under PDF-analysen. Koden leveres «as is», og kontrolleres automatisk av personvernvakten og nettverkstester før deploy.
        </p>
      </div>
    </div>
  );
}
