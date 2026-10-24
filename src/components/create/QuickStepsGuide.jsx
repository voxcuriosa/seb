/**
 * QuickStepsGuide.jsx
 * Kort bruksanvisning i punkter for opprettelse av SEB-prøve.
 */
import { FileUp, ShieldCheck, Download, Share2 } from 'lucide-react';

export default function QuickStepsGuide() {
  const steps = [
    {
      icon: FileUp,
      title: 'Last opp prøven din som Word eller PDF',
      desc: 'Eller skriv/lim inn teksten rett inn i editoren.'
    },
    {
      icon: ShieldCheck,
      title: 'Velg hjelpemidler som skal være tillatt',
      desc: 'Ordbøker, nettsider og egne tillatte programmer.'
    },
    {
      icon: Download,
      title: 'Generer lenke og .seb-fil',
      desc: 'Alt pakkes ferdig og klart for Safe Exam Browser.'
    },
    {
      icon: Share2,
      title: 'Del denne med elevene i Teams Oppgaver',
      desc: 'Lim inn startlenken eller legg ved .seb-filen i oppgaven.'
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
        <p className="font-bold text-amber-300">Viktig huskeregel for elevene:</p>
        <p className="leading-relaxed">
          Skal eleven bruke hjelpeprogrammer som <strong>Lingdys</strong>, <strong>VoxLex</strong> eller <strong>Ordnett Pluss</strong>, må disse startes <em>før</em> eleven klikker på SEB-lenken eller åpner .seb-filen.
        </p>
        <p className="leading-relaxed text-[11px] text-amber-300/80 pt-1 border-t border-amber-500/30">
          <strong>Tips før heldagsprøver:</strong> Før store og viktige prøver anbefales det at elevene restarter PC-en først for å unngå bakgrunnskonflikter.
        </p>
      </div>
    </div>
  );
}
