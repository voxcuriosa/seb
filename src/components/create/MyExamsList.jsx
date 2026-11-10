import { useState } from 'react';
import { Download, Trash2, Clock, Loader2, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { CopyLinkButton, useSebDownload } from './ExamResultCard';
import { formatDateTime } from '../../utils/exam/formatTime';

/** «Mine prøver» (lagret lokalt i denne nettleseren, med sletting på server). */
export default function MyExamsList({ exams, onDelete, onRemove }) {
  const { downloading, download } = useSebDownload();
  const [confirmId, setConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'ok' | 'error', text, failedExamId }

  if (!exams.length && !feedback) return null;

  const handleConfirmDelete = async (exam) => {
    if (deletingId) return;
    setDeletingId(exam.examId);
    setFeedback(null);
    try {
      if (onDelete) {
        const res = await onDelete(exam);
        if (res?.ok) {
          setConfirmId(null);
          setFeedback({ type: 'ok', text: res.message || `Prøven «${exam.title}» ble slettet på serveren og fjernet fra listen.` });
        } else {
          setFeedback({
            type: 'error',
            text: res?.message || 'Kunne ikke slette prøven på serveren.',
            failedExamId: exam.examId
          });
        }
      } else {
        onRemove?.(exam.examId);
        setConfirmId(null);
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
        <Clock size={14} className="text-emerald-400" aria-hidden="true" /> Mine prøver (lagret i denne nettleseren)
      </h3>

      {feedback && (
        <div
          role="status"
          className={`p-3 rounded-2xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
            feedback.type === 'ok'
              ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-100'
              : 'bg-red-950/70 border-red-500/70 text-red-100'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'ok' ? (
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" aria-hidden="true" />
            ) : (
              <AlertTriangle size={15} className="text-red-300 shrink-0" aria-hidden="true" />
            )}
            <span>{feedback.text}</span>
          </div>
          <div className="flex items-center gap-2">
            {feedback.failedExamId && onRemove && (
              <button
                type="button"
                onClick={() => {
                  onRemove(feedback.failedExamId);
                  setConfirmId(null);
                  setFeedback({ type: 'ok', text: 'Prøven ble fjernet lokalt fra listen i denne nettleseren.' });
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold"
              >
                Fjern kun fra listen
              </button>
            )}
            <button
              type="button"
              onClick={() => setFeedback(null)}
              aria-label="Lukk melding"
              className="p-1 rounded-lg hover:bg-slate-800/70 text-slate-200"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {exams.length > 0 && (
        <ul className="space-y-2">
          {exams.map((e) => {
            const isConfirming = confirmId === e.examId;
            const isDeleting = deletingId === e.examId;
            return (
              <li
                key={e.examId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-slate-900 border border-slate-800"
              >
                <div className="min-w-0">
                  <p className="text-sm font-black text-white truncate">{e.title}</p>
                  <p className="text-[11px] text-slate-400">
                    Opprettet {formatDateTime(e.createdAt)}, utløper automatisk {formatDateTime(e.expiresAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {isConfirming ? (
                    <>
                      <span className="text-xs font-bold text-red-300">Slette prøven på serveren?</span>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleConfirmDelete(e)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-[11px] font-black uppercase"
                      >
                        {isDeleting ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Trash2 size={13} aria-hidden="true" />}
                        <span>Slett</span>
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => setConfirmId(null)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold"
                      >
                        Avbryt
                      </button>
                    </>
                  ) : (
                    <>
                      <CopyLinkButton examId={e.examId} compact />
                      <button
                        type="button"
                        disabled={downloading}
                        onClick={() => download(e.sebFileArgs)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-black uppercase disabled:opacity-60"
                      >
                        <Download size={13} aria-hidden="true" /> .seb
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(e.examId)}
                        aria-label={`Slett ${e.title}`}
                        title="Slett prøven fra serveren og fjern fra listen"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-300 hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
