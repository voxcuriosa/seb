import { Columns2, Rows2, Maximize2, Save, FileDown, CheckCircle2, ExternalLink, AlertTriangle, LogOut, FileSpreadsheet } from 'lucide-react';
import { formatClock } from '../../utils/exam/formatTime';

const LAYOUTS = [
  { id: 'split', label: 'Side ved side', icon: Columns2 },
  { id: 'stacked', label: 'Oppgave over skrivefelt', icon: Rows2 },
  { id: 'focus', label: 'Fullskjerm skriving', icon: Maximize2 }
];

export default function ExamTopBar({
  title,
  layout,
  setLayout,
  websites,
  savedAt,
  saveError,
  onBackup,
  onFinish,
  finishing,
  isForms = false,
  onFormsExit
}) {
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 bg-slate-950 border-b border-slate-800 text-slate-100">
      <div className="flex items-center gap-2 max-w-[18rem]">
        {isForms && <FileSpreadsheet size={16} className="text-emerald-400 shrink-0" aria-hidden="true" />}
        <h1 className="text-sm font-black truncate" title={title}>{title}</h1>
      </div>

      {!isForms && (
        <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-slate-900 border border-slate-800" role="radiogroup" aria-label="Visning">
          {LAYOUTS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" role="radio" aria-checked={layout === id} onClick={() => setLayout(id)} title={label}
              className={`px-2 py-1 rounded-lg flex items-center gap-1.5 text-[11px] font-bold ${layout === id ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}>
              <Icon size={14} aria-hidden="true" /><span className="hidden xl:inline">{label}</span>
            </button>
          ))}
        </div>
      )}

      {websites?.length > 0 && (
        <nav className="flex items-center gap-1 flex-wrap" aria-label="Tillatte nettsider">
          {websites.map((w) => (
            <a key={w.id || w.url} href={w.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-600 text-[11px] text-slate-200">
              {w.title}<ExternalLink size={11} aria-hidden="true" />
            </a>
          ))}
        </nav>
      )}

      <div className="ml-auto flex items-center gap-2">
        {isForms ? (
          <button
            type="button"
            onClick={onFormsExit}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-colors shadow-md"
          >
            <LogOut size={14} aria-hidden="true" />
            <span>Jeg har sendt inn Forms – Avslutt SEB</span>
          </button>
        ) : (
          <>
            <span className={`text-[11px] flex items-center gap-1 ${saveError ? 'text-amber-300' : 'text-slate-300'}`} aria-live="polite">
              {saveError ? <AlertTriangle size={13} aria-hidden="true" /> : <Save size={13} className="text-emerald-400" aria-hidden="true" />}
              {saveError ? 'Kunne ikke lagre lokalt. Last ned sikkerhetskopi.' : savedAt ? `Lagret lokalt kl. ${formatClock(savedAt)}` : 'Ikke lagret ennå'}
            </span>
            <button type="button" onClick={onBackup} title="Last ned teksten som .txt hvis du må bytte maskin"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[11px] font-bold text-slate-200">
              <FileDown size={13} aria-hidden="true" /><span className="hidden md:inline">Sikkerhetskopi (.txt)</span>
            </button>
            <button type="button" onClick={onFinish} disabled={finishing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 text-xs font-black uppercase tracking-wider">
              <CheckCircle2 size={14} aria-hidden="true" /> Fullfør og last ned PDF
            </button>
          </>
        )}
      </div>
    </header>
  );
}
