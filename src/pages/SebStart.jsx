import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock, ShieldCheck, Download, ArrowRight, ExternalLink, RefreshCw, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { fetchSebExam } from '../firebase';
import { isSebEnvironment, markAsSebEnvironment } from '../utils/seb/sebEnvironment';
import { downloadStandaloneSebExamFile } from '../utils/seb/sebConfigGenerator';

/** Elevens startside: laster ned .seb-filen, eller går rett til prøverommet hvis vi allerede er i SEB. */
export default function SebStart() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | missing | error
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (isSebEnvironment()) {
      markAsSebEnvironment();
      navigate(`/exam/${encodeURIComponent(examId)}?seb=1`, { replace: true });
    }
  }, [examId, navigate]);

  useEffect(() => {
    let cancelled = false;
    fetchSebExam(examId)
      .then((data) => {
        if (cancelled) return;
        setExam(data);
        setStatus(data ? 'ready' : 'missing');
      })
      .catch(() => !cancelled && setStatus('missing'));
    return () => {
      cancelled = true;
    };
  }, [examId]);

  const handleStartInSeb = async () => {
    if (!exam || downloading) return;
    setDownloading(true);
    try {
      await downloadStandaloneSebExamFile({
        examId: exam.id,
        title: exam.title,
        allowedWebsites: exam.sebConfig?.allowedWebsites || [],
        allowedApps: exam.sebConfig?.allowedApps || {},
        quitPasswordHash: exam.sebConfig?.quitPasswordHash || ''
      });
      setDownloadStarted(true);
    } finally {
      setDownloading(false);
    }
  };

  const title = status === 'loading' ? 'Laster prøve...' : exam?.title || 'Prøven ble ikke funnet';

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6 text-left">
        <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 shrink-0">
            <Lock size={26} aria-hidden="true" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">Safe Exam Browser</span>
            <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">{title}</h1>
          </div>
        </div>

        {status === 'missing' ? (
          <div className="p-4 rounded-2xl bg-amber-950 border border-amber-600 text-amber-100 text-sm flex gap-3">
            <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-300" aria-hidden="true" />
            <span>Prøven finnes ikke, eller den er slettet. Prøver slettes automatisk etter 90 dager. Kontakt læreren din.</span>
          </div>
        ) : (
          <>
            <div className="space-y-3 text-sm leading-relaxed text-slate-300 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-start gap-2.5 text-slate-200">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Denne prøven må gjennomføres i <strong className="text-white">Safe Exam Browser (SEB)</strong>.
                </span>
              </div>
              <p className="text-xs text-slate-400 pl-6">
                Når du trykker på knappen, lastes en prøvefil ned. Åpne den, så starter SEB og låser maskinen til du leverer.
                Teksten din lagres bare på denne maskinen.
              </p>
              {exam?.sebConfig?.allowedApps && Object.values(exam.sebConfig.allowedApps).some(Boolean) && (
                <div className="mt-2 pt-2 border-t border-slate-800 pl-6 text-xs text-amber-300">
                  <strong>Viktig før du starter:</strong> Skal du bruke hjelpeprogrammer (som <em>Lingdys</em>, <em>VoxLex</em> eller <em>Ordnett Pluss</em>)? Start disse på datamaskinen din <strong>før</strong> du åpner prøvefilen og starter SEB.
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleStartInSeb}
              disabled={status !== 'ready' || downloading}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
            >
              <Download size={16} aria-hidden="true" />
              <span>{downloading ? 'Lager prøvefil...' : 'Start prøve i Safe Exam Browser'}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>

            {downloadStarted && (
              <div className="p-5 bg-red-950 border-2 border-red-500 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2.5 text-red-200 font-black text-xs uppercase tracking-wider">
                  <ArrowUpRight size={22} className="text-red-300" aria-hidden="true" />
                  <span>Prøvefilen er lastet ned</span>
                </div>
                <p className="text-sm text-white leading-relaxed">
                  Se opp i <strong>høyre hjørne</strong> av nettleservinduet. Klikk på <strong>.seb-filen</strong> der for å starte Safe Exam Browser.
                </p>
                <button
                  type="button"
                  onClick={handleStartInSeb}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                >
                  <RefreshCw size={12} aria-hidden="true" />
                  <span>Last ned filen på nytt hvis du ikke ser den</span>
                </button>
              </div>
            )}
          </>
        )}

        {downloadStarted && (
          <div
            className="fixed top-3 right-3 sm:top-5 sm:right-6 z-[1000] flex items-start gap-3.5 bg-red-600 text-white p-4 sm:p-5 rounded-3xl shadow-2xl border-4 border-white max-w-sm animate-bounce"
            role="alert"
          >
            <div className="w-12 h-12 rounded-2xl bg-white text-red-600 flex items-center justify-center shrink-0">
              <ArrowUpRight size={32} strokeWidth={3} aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <span className="block text-xs font-black uppercase tracking-wider text-red-100">Se her oppe</span>
              <p className="text-sm font-black leading-tight">Klikk på prøvefilen i nedlastingsfeltet øverst til høyre.</p>
              <p className="text-xs text-red-50 leading-snug">Nettleseren har lagt filen i verktøylinjen. Klikk på den for å åpne Safe Exam Browser.</p>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <a
            href="https://safeexambrowser.org/download_en.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <span>Har du ikke SEB? Last ned gratis</span>
            <ExternalLink size={12} aria-hidden="true" />
          </a>
          {status === 'ready' && (
            <button type="button" onClick={handleStartInSeb} className="inline-flex items-center gap-1.5 hover:text-white transition-colors">
              <RefreshCw size={12} aria-hidden="true" />
              <span>Last ned fil på nytt</span>
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
