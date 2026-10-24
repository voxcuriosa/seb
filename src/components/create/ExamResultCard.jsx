import { useState } from 'react';
import { CheckCircle2, Copy, Download, Loader2, Plus } from 'lucide-react';
import { examStartUrl } from '../../config';
import { downloadStandaloneSebExamFile } from '../../utils/seb/sebConfigGenerator';
import { formatDateTime } from '../../utils/exam/formatTime';

export function useSebDownload() {
  const [downloading, setDownloading] = useState(false);
  const download = async (exam) => {
    setDownloading(true);
    try {
      await downloadStandaloneSebExamFile(exam);
    } finally {
      setDownloading(false);
    }
  };
  return { downloading, download };
}

export function CopyLinkButton({ examId, compact = false }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(examStartUrl(examId));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt('Kopier lenken:', examStartUrl(examId));
    }
  };
  return (
    <button type="button" onClick={copy}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-black uppercase tracking-wider transition-colors ${
        compact ? 'px-3 py-1.5 text-[11px] bg-slate-800 hover:bg-slate-700 text-white' : 'px-5 py-3 text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950'
      }`}>
      {copied ? <CheckCircle2 size={compact ? 13 : 16} aria-hidden="true" /> : <Copy size={compact ? 13 : 16} aria-hidden="true" />}
      <span>{copied ? 'Kopiert' : compact ? 'Kopier lenke' : 'Kopier SEB-lenke til Teams'}</span>
    </button>
  );
}

/** Steg 3: resultat med lenke for Teams og .seb-fil. */
export default function ExamResultCard({ exam, onNew }) {
  const { downloading, download } = useSebDownload();

  return (
    <div className="p-6 rounded-3xl bg-emerald-950/60 border-2 border-emerald-500/70 space-y-5" role="status">
      <div className="flex items-start gap-3">
        <CheckCircle2 size={28} className="text-emerald-400 shrink-0" aria-hidden="true" />
        <div>
          <h3 className="text-lg font-black text-white">Prøven er klar: {exam.title}</h3>
          <p className="text-sm text-emerald-100">Lagret til {formatDateTime(exam.expiresAt)}. Den slettes automatisk etter 90 dager.</p>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-200 break-all select-all">
        {examStartUrl(exam.examId)}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <CopyLinkButton examId={exam.examId} />
        <button type="button" onClick={() => download(exam.sebFileArgs)} disabled={downloading}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-black uppercase tracking-wider disabled:opacity-60">
          {downloading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
          <span>Last ned .seb-fil</span>
        </button>
        <button type="button" onClick={onNew}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-slate-200 hover:text-white text-xs font-black uppercase tracking-wider">
          <Plus size={16} aria-hidden="true" /> <span>Ny prøve</span>
        </button>
      </div>

      <ol className="text-sm text-slate-200 space-y-1.5 list-decimal pl-5">
        <li>
          {exam.sourceType === 'forms'
            ? 'Opprett en vanlig oppgave i Teams («Opprett -> Oppgave») og lim inn SEB-lenken over (eller legg ved .seb-filen).'
            : 'Lim lenken inn i en Teams-oppgave (eller legg ved .seb-filen). Sett «Elever kan angre innlevering: Nei» øverst i oppgaven (kan også settes som fast standard for klassen under tannhjulet «Oppgaveinnstillinger» i Teams).'}
        </li>
        <li>
          <strong className="text-amber-300 font-bold">Husk:</strong> Be elever som bruker <strong>Lingdys</strong>, <strong>VoxLex</strong> eller <strong>Ordnett Pluss</strong> om å starte disse <em>før</em> de åpner SEB-lenken.
        </li>
        <li>Elevene åpner lenken, laster ned prøvefilen og starter SEB.</li>
        {exam.sourceType === 'forms' ? (
          <li>
            Elevene logger inn og trykker «Send inn» i Forms. Når de viser kvitteringsskjermen på pulten (eller når prøvetiden er ute), bruker de avslutningskoden din til å lukke SEB. Alle svar samles direkte i Microsoft Forms.
          </li>
        ) : (
          <li>
            Elevene leverer den nedlastede PDF-en i Teams-oppgaven. Sjekk at eleven står som «Innlevert» i Teams før eleven forlater rommet, og kontroller PDF-ene i fane 2.
          </li>
        )}
      </ol>
    </div>
  );
}
