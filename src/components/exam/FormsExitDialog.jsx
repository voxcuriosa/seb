import { CheckCircle2, AlertTriangle, LogOut } from 'lucide-react';

/**
 * FormsExitDialog.jsx
 * Enkel og trygg avslutningsdialog for prøver som gjennomføres i Microsoft Forms.
 * Krever ingen PDF, men sikrer at eleven bekrefter at svaret er sendt inn i Forms før SEB lukkes.
 */
export default function FormsExitDialog({ open, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/95 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forms-exit-title"
    >
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-700 space-y-5 text-slate-100 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 size={26} aria-hidden="true" />
          </div>
          <div>
            <h2 id="forms-exit-title" className="text-xl font-black text-white">
              Avslutte Safe Exam Browser?
            </h2>
            <p className="text-xs text-slate-400">Microsoft Forms-prøve</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-slate-200 space-y-2">
          <p className="font-bold text-white">
            Har du trykket «Send inn» (Submit) inne i Microsoft Forms?
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Svarene dine lagres direkte hos læreren i Microsoft Teams / Forms. Det skal <strong>ikke</strong> lages eller leveres noen PDF.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 justify-end pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Nei, gå tilbake til prøven
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider inline-flex items-center justify-center gap-2 transition-colors shadow-lg"
          >
            <LogOut size={15} aria-hidden="true" />
            <span>Ja, avslutt SEB nå</span>
          </button>
        </div>
      </div>
    </div>
  );
}
