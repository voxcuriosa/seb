import { useState } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, Download, ArrowUpRight, LogOut } from 'lucide-react';

/**
 * FinishDialog.jsx
 * Sikrer at eleven ALDRI kan forlate Safe Exam Browser før PDF-en faktisk er lastet ned.
 * Viser en stor, tydelig rød boks med instruksjon om nedlasting, og lar eleven
 * klikke "Avslutt Safe Exam Browser" først etter at filen er sikret på disk.
 */
export default function FinishDialog({
  open,
  phase,
  result,
  wordCount,
  onConfirm,
  onCancel,
  onDownloadAgain,
  onExitSeb
}) {
  const [downloadConfirmed, setDownloadConfirmed] = useState(false);

  if (!open) return null;
  const busy = phase === 'signing' || phase === 'rendering';

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/95 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="finish-title"
    >
      <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-700 space-y-6 text-slate-100 shadow-2xl">
        {phase === 'done' ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 size={26} aria-hidden="true" />
              </div>
              <div>
                <h2 id="finish-title" className="text-xl font-black text-white">
                  PDF-en er ferdig generert!
                </h2>
                <p className="text-xs text-slate-400">
                  Kvittering: <strong className="font-mono text-emerald-300">#{result?.receiptCode}</strong>
                </p>
              </div>
            </div>

            {/* Stor rød oppmerksomhetsboks: Du får ikke forlate SEB før PDF er sikret */}
            <div className="p-5 rounded-2xl bg-red-950/90 border-2 border-red-500 text-red-50 space-y-3">
              <div className="flex items-center gap-2.5 text-red-200 font-black text-xs uppercase tracking-wider">
                <ArrowUpRight size={20} className="text-red-300" aria-hidden="true" />
                <span>Viktig: Sjekk nedlastingen øverst til høyre</span>
              </div>
              <p className="text-sm text-white font-medium leading-relaxed">
                PDF-en med besvarelsen din ble nettopp lastet ned. Sjekk at filen <strong className="underline text-emerald-300">{result?.fileName}</strong> ligger i nettleserens nedlastingsfelt eller i <strong>Nedlastinger</strong>-mappen din.
              </p>
              <div className="pt-2 border-t border-red-900/60 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onDownloadAgain}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-white text-xs font-bold transition-colors"
                >
                  <Download size={13} aria-hidden="true" />
                  <span>Last ned PDF på nytt</span>
                </button>
                <span className="text-[11px] text-red-200">
                  Leveres i Teams etter at SEB er lukket.
                </span>
              </div>
            </div>

            {/* Bekreftelse før avslutning */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={downloadConfirmed}
                  onChange={(e) => setDownloadConfirmed(e.target.checked)}
                  className="w-5 h-5 rounded-md border-slate-700 text-emerald-500 focus:ring-emerald-400 bg-slate-900 mt-0.5"
                />
                <span className="text-xs text-slate-200 leading-normal font-medium">
                  Jeg bekrefter at PDF-en er lastet ned til min maskin, og er klar til å avslutte og slette lokalt utkast.
                </span>
              </label>

              <button
                type="button"
                onClick={onExitSeb}
                disabled={!downloadConfirmed}
                className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                <LogOut size={16} aria-hidden="true" />
                <span>Avslutt Safe Exam Browser nå</span>
              </button>
            </div>
          </>
        ) : phase === 'error' ? (
          <>
            <div className="flex items-center gap-3 text-amber-300">
              <AlertTriangle size={26} aria-hidden="true" />
              <h2 id="finish-title" className="text-xl font-black text-white">Noe gikk galt</h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              PDF-en kunne ikke lages akkurat nå. Teksten din er <strong>100 % trygt lagret</strong> på denne maskinen. Prøv igjen, eller last ned en tekst-sikkerhetskopi fra toppmenyen og si fra til læreren.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-xl text-sm text-slate-300 hover:text-white"
              >
                Lukk
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-sm font-black"
              >
                Prøv igjen
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="finish-title" className="text-xl font-black text-white">Er du klar til å levere?</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Besvarelsen din på <strong className="text-white">{wordCount} ord</strong> pakkes og sikres som en PDF i nettleserminnet. Du kan ikke endre teksten etter at du har fullført.
            </p>
            <p className="text-xs text-slate-400">
              PDF-en lastes ned til Nedlastinger-mappen din, slik at du kan levere den i Teams etterpå.
            </p>
            <div className="flex gap-2 justify-end pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="px-4 py-2 rounded-xl text-sm text-slate-300 hover:text-white disabled:opacity-50"
              >
                Fortsett å skrive
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 text-sm font-black inline-flex items-center gap-2"
              >
                {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                {phase === 'signing' ? 'Sjekker signatur...' : phase === 'rendering' ? 'Lager sikret PDF...' : 'Fullfør og generer PDF'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
