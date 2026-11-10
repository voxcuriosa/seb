import { RotateCcw, X, AlertTriangle, Trash2 } from 'lucide-react';
import { formatDateTime, formatClock } from '../../utils/exam/formatTime';
import { useStudentUiLang } from '../../hooks/useStudentUiLang';

/**
 * Gjenopprettingsbanner etter strømbrudd/omstart og låne-PC-beskyttelse:
 *  - Ved ny SEB-økt (uten aktivt sessionStorage-token) spørres eleven eksplisitt om
 *    utkastet tilhører eleven før noe fylles inn i editoren.
 *  - Etter gjenoppretting (eller ved oppdatering i samme økt) vises en kort bekreftelse.
 */
export default function RestoreBanner({ savedAt, wordCount, pending = false, onRestore, onDiscard, onClose }) {
  const { t } = useStudentUiLang();
  const dir = t.rtl ? 'rtl' : 'ltr';

  if (pending) {
    const savedClock = savedAt && !Number.isNaN(new Date(savedAt).getTime()) ? formatClock(savedAt) : 'ukjent tidspunkt';
    return (
      <div
        dir={dir}
        role="alert"
        className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 bg-amber-950 border-b border-amber-500 text-amber-50 text-sm"
      >
        <div className="flex items-start md:items-center gap-2.5">
          <AlertTriangle size={18} className="text-amber-300 shrink-0 mt-0.5 md:mt-0" aria-hidden="true" />
          <span className="font-semibold leading-snug">
            Fant et tidligere utkast på denne maskinen ({wordCount} ord, lagret kl. {savedClock}). Er dette ditt utkast?
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onRestore}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-colors"
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span>Gjenopprett utkastet mitt</span>
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-600 text-white text-xs font-bold transition-colors"
          >
            <Trash2 size={14} aria-hidden="true" />
            <span>Nei, start ny tom besvarelse</span>
          </button>
        </div>
      </div>
    );
  }

  const msg = String(t.restoredMsg || '')
    .replace('{words}', String(wordCount))
    .replace('{time}', formatDateTime(savedAt));

  return (
    <div dir={dir} className="flex items-center gap-3 px-4 py-2.5 bg-emerald-950 border-b border-emerald-600 text-emerald-50 text-sm" role="status">
      <RotateCcw size={16} className="text-emerald-300 shrink-0" aria-hidden="true" />
      <span>{msg}</span>
      <button type="button" onClick={onClose} aria-label={t.closeBtn} className="ml-auto p-1 rounded-lg hover:bg-emerald-900">
        <X size={15} />
      </button>
    </div>
  );
}
