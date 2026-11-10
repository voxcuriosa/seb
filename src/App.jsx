import { Component, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import TeacherHub from './pages/TeacherHub';
import SebStart from './pages/SebStart';
import SebQuit from './pages/SebQuit';
import LoadingScreen from './components/common/LoadingScreen';

// Prøverommet er tungt (Tiptap, pdf.js, pdf-lib) og lastes bare ved behov.
const SebExamRoom = lazy(() => import('./pages/SebExamRoom'));

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('[SEB] Uventet visningsfeil:', error?.message || error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-700 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle size={24} className="text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1.5">
                <h1 className="text-base font-black text-white">Noe gikk galt ved visning av siden</h1>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Hvis du er i gang med en skriveprøve, er utkastet ditt lagret lokalt på denne maskinen. Last siden inn på nytt for å fortsette.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-3 px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest inline-flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw size={15} aria-hidden="true" />
              <span>Last siden inn på nytt</span>
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <Suspense fallback={<LoadingScreen label="Laster..." />}>
        <Routes>
          <Route path="/" element={<TeacherHub />} />
          <Route path="/start/:examId" element={<SebStart />} />
          <Route path="/exam/:examId" element={<SebExamRoom />} />
          <Route path="/quit" element={<SebQuit />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppErrorBoundary>
  );
}
