import { useEffect } from 'react';
import { CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { clearAllDrafts } from '../utils/exam/localStore';
import { useStudentUiLang } from '../hooks/useStudentUiLang';
import StudentLanguageSelect from '../components/common/StudentLanguageSelect';

/** Avslutningsside. SEB sitt quitURL peker hit og låser opp maskinen. */
export default function SebQuit() {
  const { uiLang, setUiLang, t } = useStudentUiLang();
  const dir = t.rtl ? 'rtl' : 'ltr';

  useEffect(() => {
    // Sikkerhetsgaranti: tøm alle lokale prøveutkast fra disk/minne når avslutningssiden åpnes
    clearAllDrafts();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white relative">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <StudentLanguageSelect value={uiLang} onChange={setUiLang} id="seb-quit-lang" />
      </div>

      <div dir={dir} className="flex flex-col items-center max-w-md w-full">
        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mb-6">
          <CheckCircle2 size={32} aria-hidden="true" />
        </div>

        <h1 className="text-3xl font-black mb-3 tracking-tight">{t.examCompletedTitle}</h1>
        <p className="text-sm text-slate-300 max-w-md mb-8 leading-relaxed">{t.examCompletedBody}</p>

        <div className={`p-4 rounded-2xl bg-slate-900 border border-slate-800 max-w-sm w-full mb-8 space-y-2 ${t.rtl ? 'text-right' : 'text-left'}`}>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400">
            <ShieldCheck size={14} aria-hidden="true" />
            <span>{t.rememberTeamsTitle}</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{t.rememberTeamsBody}</p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-xs font-black uppercase tracking-wider transition-colors"
        >
          <span>{t.backToHubBtn}</span>
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </main>
  );
}
