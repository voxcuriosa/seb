import { lazy, Suspense, useState } from 'react';
import { Lock, FilePlus2, ShieldCheck, HelpCircle, ArrowLeft, Shield } from 'lucide-react';
import CreateExamTab from '../components/create/CreateExamTab';
import HelpPanel from '../components/HelpPanel';
import PrivacyAuditModal from '../components/PrivacyAuditModal';
import LoadingScreen from '../components/common/LoadingScreen';

// Fane 2 laster pdf.js og kjører helt lokalt: lastes bare ved behov.
const GradeSubmissionsTab = lazy(() => import('../components/grade/GradeSubmissionsTab'));

const TABS = [
  { id: 'create', label: '1. Opprett SEB-prøve', icon: FilePlus2 },
  { id: 'grade', label: '2. Kontroller innleverte PDF-er', icon: ShieldCheck }
];

/** Lærersenter på voxcuriosa.no/seb. */
export default function TeacherHub() {
  const [tab, setTab] = useState('create');
  const [showHelp, setShowHelp] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950 no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <a href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white">
            <ArrowLeft size={14} aria-hidden="true" /> Vox Curiosa
          </a>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Lock size={18} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white leading-tight">SEB-prøver</h1>
              <p className="text-xs text-slate-400">Safe Exam Browser uten innlogging og uten KI. Elevdata blir på elevens maskin.</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={() => setShowPrivacy(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 hover:bg-emerald-900/60 text-xs font-bold text-emerald-300">
              <Shield size={14} aria-hidden="true" /> Personvern og IT
            </button>
            <button type="button" onClick={() => setShowHelp((s) => !s)} aria-expanded={showHelp}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-bold text-slate-200">
              <HelpCircle size={15} aria-hidden="true" /> Hjelp
            </button>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1" role="tablist" aria-label="Lærersenter">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`px-4 py-3 text-xs sm:text-sm font-black border-b-2 inline-flex items-center gap-2 transition-colors ${
                tab === id ? 'border-emerald-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}>
              <Icon size={16} aria-hidden="true" /> {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}
        <PrivacyAuditModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
        <div role="tabpanel">
          {tab === 'create' ? (
            <CreateExamTab />
          ) : (
            <Suspense fallback={<LoadingScreen label="Laster kontroll..." />}>
              <GradeSubmissionsTab />
            </Suspense>
          )}
        </div>
      </main>
    </div>
  );
}
