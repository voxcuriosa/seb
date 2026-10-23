import { Loader2, CheckCircle2, AlertTriangle, Download } from 'lucide-react';

/** Bekreftelse før levering og status under generering. */
export default function FinishDialog({ open, phase, result, wordCount, onConfirm, onCancel, onDownloadAgain }) {
  if (!open) return null;
  const busy = phase === 'signing' || phase === 'rendering';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="finish-title">
      <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-700 space-y-4 text-slate-100">
        {phase === 'done' ? (
          <>
            <h2 id="finish-title" className="text-lg font-black flex items-center gap-2"><CheckCircle2 className="text-emerald-400" size={22} aria-hidden="true" /> PDF-en er lastet ned</h2>
            <p className="text-sm text-slate-300">Kvittering <strong className="font-mono text-emerald-300">#{result?.receiptCode}</strong>. {result?.signed ? 'Serversignert.' : 'Ikke serversignert (ingen nettforbindelse), men fortsatt beskyttet med SHA-256.'}</p>
            <p className="text-sm text-slate-300">Safe Exam Browser avsluttes om et øyeblikk. Lever PDF-en fra Nedlastinger i Teams.</p>
            <button type="button" onClick={onDownloadAgain} className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-emerald-200">
              <Download size={14} aria-hidden="true" /> Last ned PDF-en på nytt
            </button>
          </>
        ) : phase === 'error' ? (
          <>
            <h2 id="finish-title" className="text-lg font-black flex items-center gap-2"><AlertTriangle className="text-amber-300" size={22} aria-hidden="true" /> Noe gikk galt</h2>
            <p className="text-sm text-slate-300">PDF-en kunne ikke lages. Teksten din er fortsatt lagret. Prøv igjen, eller last ned sikkerhetskopi og si fra til læreren.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-sm text-slate-300 hover:text-white">Lukk</button>
              <button type="button" onClick={onConfirm} className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-sm font-black">Prøv igjen</button>
            </div>
          </>
        ) : (
          <>
            <h2 id="finish-title" className="text-lg font-black">Er du ferdig?</h2>
            <p className="text-sm text-slate-300">Besvarelsen din ({wordCount} ord) lagres som en sikret PDF i Nedlastinger. Du kan ikke endre teksten etterpå.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={onCancel} disabled={busy} className="px-4 py-2 rounded-xl text-sm text-slate-300 hover:text-white disabled:opacity-50">Fortsett å skrive</button>
              <button type="button" onClick={onConfirm} disabled={busy}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 text-sm font-black inline-flex items-center gap-2">
                {busy && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
                {phase === 'signing' ? 'Signerer...' : phase === 'rendering' ? 'Lager PDF...' : 'Fullfør og last ned PDF'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
