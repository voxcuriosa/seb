import { useState } from 'react';
import { FolderUp, ChevronDown, ShieldCheck } from 'lucide-react';

/** Utvidbar guide for Teams, SharePoint og OneDrive (utvidet fra voxkunnskap). */
export default function TeamsGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-slate-900 border border-emerald-500/40">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left">
        <span className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-2">
          <FolderUp size={15} aria-hidden="true" /> Slik fungerer det med Teams, SharePoint og OneDrive
        </span>
        <ChevronDown size={16} className={`text-slate-300 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 text-sm text-slate-200 leading-relaxed">
          <p className="text-xs text-slate-300 bg-slate-950 border border-slate-800 p-3 rounded-xl">
            <strong className="text-emerald-300">Merk:</strong> Denne kontrollfanen er <strong>helt frivillig å bruke</strong>. Elevene leverer en vanlig, ferdig formatert PDF som du kan lese og vurdere direkte inne i Teams. Bruk kun denne fanen dersom du ønsker å sjekke én enkelt PDF eller hele klassens mappe for etterfølgende endringer.
          </p>
          <ol className="space-y-2 list-decimal pl-5">
            <li><strong className="text-white">Del SEB-lenken eller .seb-filen i en Teams-oppgave.</strong></li>
            <li><strong className="text-white">Elevene laster opp den ferdige PDF-en fra Nedlastinger</strong> til Teams-oppgaven og trykker «Lever».</li>
            <li>
              <strong className="text-white">Klikk «Åpne i SharePoint»</strong> i oppgaven, last ned mappen <strong className="text-white">«Student Work»</strong>, pakk ut ZIP-filen
              og slipp hele mappen (eller alle PDF-ene) her. Alt verifiseres umiddelbart med SHA-256.
            </li>
          </ol>
          <div className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-emerald-200 border border-slate-800 leading-relaxed">
            Student Work /<br />
            &nbsp;&nbsp;├── Ola Nordmann / Prøve i historie / prove-historie-MJVM.pdf<br />
            &nbsp;&nbsp;└── Kari Nordmann / Prøve i historie / prove-historie-B4K1.pdf
          </div>
          <p>Elevnavnet hentes fra mappenavnet og vises som «Ola Nordmann (#MJVM)».</p>
          <div className="text-xs font-bold text-emerald-100 bg-emerald-950 border border-emerald-600/70 p-3 rounded-xl flex items-start gap-2">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0" aria-hidden="true" />
            <span>Personvern: Filene og mappenavnene leses bare lokalt i din nettleser. Ingenting lastes opp eller lagres, og ingenting sendes til KI.</span>
          </div>
        </div>
      )}
    </div>
  );
}
