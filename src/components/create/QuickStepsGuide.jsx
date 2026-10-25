/**
 * QuickStepsGuide.jsx
 * Kort bruksanvisning i punkter for opprettelse av SEB-prøve.
 */
import { FileUp, ShieldCheck, Download, Share2 } from 'lucide-react';

export default function QuickStepsGuide() {
  const steps = [
    {
      icon: FileUp,
      title: 'Velg oppgavekilde',
      desc: 'Skriv tekst, last opp Word/PDF, eller lim inn en lenke til Microsoft Forms.'
    },
    {
      icon: ShieldCheck,
      title: 'Velg hjelpemidler og kodeord',
      desc: 'Tillat ordbøker og nettsider, og sett avslutningskode (påkrevd ved Forms).'
    },
    {
      icon: Download,
      title: 'Generer lenke og .seb-fil',
      desc: 'Alt pakkes ferdig og klart for Safe Exam Browser.'
    },
    {
      icon: Share2,
      title: 'Del i en vanlig Teams-oppgave',
      desc: 'Lim inn startlenken under «Opprett -> Oppgave». Sett gjerne «Elever kan angre innlevering: Nei» (kan lagres som standard under tannhjulet i Oppgaver).'
    }
  ];

  return (
    <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
      <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400">
        Hurtigveiledning: 4 enkle steg
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

      <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/50 space-y-1 text-xs text-amber-200">
        <p className="font-bold text-amber-300">Tips før heldagsprøver:</p>
        <p className="leading-relaxed">
          Før store og viktige prøver anbefales det at elevene restarter PC-en først for å unngå bakgrunnskonflikter.
        </p>
      </div>
    </div>
  );
}
