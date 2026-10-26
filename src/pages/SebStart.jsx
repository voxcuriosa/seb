import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock, ShieldCheck, Download, ArrowRight, ExternalLink, RefreshCw, ArrowUp, AlertTriangle } from 'lucide-react';
import { fetchSebExam } from '../firebase';
import { isSebEnvironment, markAsSebEnvironment } from '../utils/seb/sebEnvironment';
import { downloadStandaloneSebExamFile } from '../utils/seb/sebConfigGenerator';
import { useStudentUiLang } from '../hooks/useStudentUiLang';
import StudentLanguageSelect from '../components/common/StudentLanguageSelect';

const isFormsDomain = (val = '') => /forms\.(office\.com|microsoft\.com|cloud\.microsoft)/i.test(String(val));
const hasHelperWebsites = (sites = []) =>
  Array.isArray(sites) && sites.some((w) => w?.id !== 'web_forms_main' && !isFormsDomain(`${w?.domain || ''} ${w?.url || ''}`));

/** Elevens startside: laster ned .seb-filen, eller går rett til prøverommet hvis vi allerede er i SEB. */
export default function SebStart() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | missing | error
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { uiLang, setUiLang, t } = useStudentUiLang();
  const dir = t.rtl ? 'rtl' : 'ltr';

  useEffect(() => {
    if (isSebEnvironment() && exam) {
      markAsSebEnvironment();
      const hasHelpers = hasHelperWebsites(exam.sebConfig?.allowedWebsites);
      if ((exam.sourceType === 'forms' || exam.formsUrl) && exam.formsUrl && !hasHelpers) {
        window.location.replace(exam.formsUrl);
      } else {
        navigate(`/exam/${encodeURIComponent(examId)}?seb=1`, { replace: true });
      }
    }
  }, [examId, exam, navigate]);

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
      const isForms = exam.sourceType === 'forms' || Boolean(exam.formsUrl);
      const rawSites = Array.isArray(exam.sebConfig?.allowedWebsites) ? exam.sebConfig.allowedWebsites : [];
      const hasHelpers = hasHelperWebsites(rawSites);
      const startURL = isForms && !hasHelpers ? exam.formsUrl : null;
      const sebSites = isForms && exam.formsUrl && !rawSites.some((w) => isFormsDomain(`${w?.domain || ''} ${w?.url || ''}`))
        ? [{ id: 'web_forms_main', title: 'Microsoft Forms', url: exam.formsUrl, domain: 'forms.office.com' }, ...rawSites]
        : rawSites;
      await downloadStandaloneSebExamFile({
        examId: exam.id,
        title: exam.title,
        startURL,
        allowedWebsites: sebSites,
        allowedApps: exam.sebConfig?.allowedApps || {},
        quitPasswordHash: exam.sebConfig?.quitPasswordHash || ''
      });
      setDownloadStarted(true);
    } finally {
      setDownloading(false);
    }
  };

  const title = status === 'loading' ? t.loadingTitle : exam?.title || t.missingTitle;

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6 text-left">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 shrink-0">
              <Lock size={26} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">Safe Exam Browser</span>
              <h1 className="text-xl sm:text-2xl font-black text-white leading-tight break-words">{title}</h1>
            </div>
          </div>
          <StudentLanguageSelect value={uiLang} onChange={setUiLang} id="seb-start-lang" />
        </div>

        <div dir={dir} className={`space-y-6 ${t.rtl ? 'text-right' : 'text-left'}`}>
          {status === 'missing' ? (
            <div className="p-4 rounded-2xl bg-amber-950 border border-amber-600 text-amber-100 text-sm flex gap-3">
              <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-300" aria-hidden="true" />
              <span>{t.missingAlert}</span>
            </div>
          ) : (
            <>
              <div className="space-y-3 text-sm leading-relaxed text-slate-300 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-start gap-2.5 text-slate-200 font-bold">
                  <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{t.mustUseSeb}</span>
                </div>
                <p className={`text-xs text-slate-300 ${t.rtl ? 'pr-6' : 'pl-6'}`}>
                  {exam?.sourceType === 'forms' ? t.formsInfo : t.essayInfo}
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartInSeb}
                disabled={status !== 'ready' || downloading}
                className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
              >
                <Download size={16} aria-hidden="true" />
                <span>{downloading ? t.creatingFileBtn : t.startInSebBtn}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>

              {downloadStarted && (
                <div className="p-5 bg-red-950 border-2 border-red-500 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-2.5 text-red-200 font-black text-xs uppercase tracking-wider">
                    <ArrowUp size={22} className="text-red-300" aria-hidden="true" />
                    <span>{t.downloadedTitle}</span>
                  </div>
                  <p className="text-sm text-white leading-relaxed font-semibold">{t.downloadedBody}</p>
                  <button
                    type="button"
                    onClick={handleStartInSeb}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                  >
                    <RefreshCw size={12} aria-hidden="true" />
                    <span>{t.redownloadIfMissingBtn}</span>
                  </button>
                </div>
              )}
            </>
          )}

          {downloadStarted && (
            <div
              className="fixed top-1/2 -translate-y-1/2 right-4 sm:right-8 z-[1000] flex items-start gap-3.5 bg-red-600 text-white p-4 sm:p-5 rounded-3xl shadow-2xl border-4 border-white max-w-sm animate-bounce"
              role="alert"
            >
              <div className="w-12 h-12 rounded-2xl bg-white text-red-600 flex items-center justify-center shrink-0">
                <ArrowUp size={32} strokeWidth={3} aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <span className="block text-xs font-black uppercase tracking-wider text-red-100">{t.lookUpHere}</span>
                <p className="text-sm font-black leading-tight">{t.clickFileTopRight}</p>
                <p className="text-xs text-red-50 leading-snug">{t.toolbarHint}</p>
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
              <span>{t.downloadSebLink}</span>
              <ExternalLink size={12} aria-hidden="true" />
            </a>
            {status === 'ready' && (
              <button type="button" onClick={handleStartInSeb} className="inline-flex items-center gap-1.5 hover:text-white transition-colors">
                <RefreshCw size={12} aria-hidden="true" />
                <span>{t.redownloadFooterBtn}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
