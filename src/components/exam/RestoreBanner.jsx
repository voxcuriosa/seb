import { RotateCcw, X } from 'lucide-react';
import { formatDateTime } from '../../utils/exam/formatTime';
import { useStudentUiLang } from '../../hooks/useStudentUiLang';

/** Tydelig bekreftelse når teksten er gjenopprettet etter omstart eller strømbrudd. */
export default function RestoreBanner({ savedAt, wordCount, onClose }) {
  const { t } = useStudentUiLang();
  const msg = String(t.restoredMsg || '')
    .replace('{words}', String(wordCount))
    .replace('{time}', formatDateTime(savedAt));

  return (
    <div dir={t.rtl ? 'rtl' : 'ltr'} className="flex items-center gap-3 px-4 py-2.5 bg-emerald-950 border-b border-emerald-600 text-emerald-50 text-sm" role="status">
      <RotateCcw size={16} className="text-emerald-300 shrink-0" aria-hidden="true" />
      <span>{msg}</span>
      <button type="button" onClick={onClose} aria-label={t.closeBtn} className="ml-auto p-1 rounded-lg hover:bg-emerald-900"><X size={15} /></button>
    </div>
  );
}
