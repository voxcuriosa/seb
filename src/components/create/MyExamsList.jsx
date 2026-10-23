import { Download, Trash2, Clock } from 'lucide-react';
import { CopyLinkButton, useSebDownload } from './ExamResultCard';
import { formatDateTime } from '../../utils/exam/formatTime';

/** «Mine prøver» (kun i denne nettleseren). */
export default function MyExamsList({ exams, onRemove }) {
  const { downloading, download } = useSebDownload();
  if (!exams.length) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
        <Clock size={14} className="text-emerald-400" aria-hidden="true" /> Mine prøver (lagret i denne nettleseren)
      </h3>
      <ul className="space-y-2">
        {exams.map((e) => (
          <li key={e.examId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="min-w-0">
              <p className="text-sm font-black text-white truncate">{e.title}</p>
              <p className="text-[11px] text-slate-400">Opprettet {formatDateTime(e.createdAt)}, slettes {formatDateTime(e.expiresAt)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <CopyLinkButton examId={e.examId} compact />
              <button type="button" disabled={downloading} onClick={() => download(e.sebFileArgs)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-black uppercase disabled:opacity-60">
                <Download size={13} aria-hidden="true" /> .seb
              </button>
              <button type="button" onClick={() => onRemove(e.examId)} aria-label={`Fjern ${e.title} fra listen`} title="Fjern fra listen (prøven slettes automatisk etter 90 dager)"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
