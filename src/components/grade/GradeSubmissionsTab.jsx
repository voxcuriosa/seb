import { Component } from 'react';
import { AlertTriangle, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import TeamsGuide from './TeamsGuide';
import PdfDropZone from './PdfDropZone';
import SubmissionList from './SubmissionList';
import SubmissionDetail from './SubmissionDetail';
import VerificationStepsGuide from './VerificationStepsGuide';
import { useSubmissions } from '../../hooks/useSubmissions';

class GradeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Uventet visningsfeil ved behandling av filen.'
    };
  }

  componentDidCatch(error) {
    console.error('[PDF-kontroll] Fanget feil i ErrorBoundary:', error?.message);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="p-6 rounded-3xl bg-slate-900 border border-red-500/80 text-slate-100 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={22} className="text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="text-base font-black text-white">Visning av en korrupt eller manipulert fil ble stoppet</h2>
              <p className="text-sm text-slate-300 mt-1">
                En av de opplastede filene inneholdt uventede data som utløste en feil. Ingen data har forlatt nettleseren.
              </p>
              {this.state.message && (
                <p className="text-xs font-mono text-red-200 mt-2">{this.state.message}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase"
          >
            <RotateCcw size={14} aria-hidden="true" /> Nullstill kontrollvisningen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Fane 2: Kontroller innleverte PDF-er (100 % lokalt). */
export default function GradeSubmissionsTab() {
  const { items, addFiles, clear, progress, selected, setSelectedId } = useSubmissions();
  const counts = items.reduce((acc, i) => ({ ...acc, [i.verdict]: (acc[i.verdict] || 0) + 1 }), {});
  const duplicateCount = items.filter((i) => i.isDuplicate).length;
  const mismatchCount = items.filter((i) => i.examIdMismatch).length;

  return (
    <GradeErrorBoundary onReset={clear}>
      <div className="space-y-5">
        <TeamsGuide />

        {progress && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200" role="status">
            <Loader2 size={18} className="animate-spin text-emerald-400" aria-hidden="true" />
            <span className="text-sm font-bold">Verifiserer {progress.done} av {progress.total} filer med SHA-256...</span>
          </div>
        )}

        {(duplicateCount > 0 || mismatchCount > 0) && (
          <div role="alert" className="p-4 rounded-2xl bg-red-950 border border-red-500/90 text-red-100 text-sm flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-red-300 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-0.5">
              {duplicateCount > 0 && (
                <p className="font-bold">
                  Duplikatvarsel: {duplicateCount} opplastede filer deler sjekksum, signatur eller kvitteringskode.
                </p>
              )}
              {mismatchCount > 0 && (
                <p className="font-bold">
                  Prøve-ID-varsel: Bunken blander ulike prøve-ID-er ({mismatchCount} avvikende besvarelser markert i listen).
                </p>
              )}
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
            <PdfDropZone onFiles={addFiles} />
            <aside className="lg:sticky lg:top-6 space-y-4">
              <VerificationStepsGuide />
            </aside>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 items-start">
            <aside className="space-y-3 no-print">
              <div className="flex items-center justify-between text-xs text-slate-200">
                <span title="Verifisert / ikke signert / ugyldig">
                  {items.length} filer: {counts.verified || 0} verifisert, {counts['verified-unsigned'] || 0} usignert, {counts.invalid || 0} ugyldig
                </span>
                <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-slate-300 hover:text-white" title="Tøm listen (ingenting er lagret)">
                  <Trash2 size={13} aria-hidden="true" /> Tøm
                </button>
              </div>
              <PdfDropZone onFiles={addFiles} compact />
              <SubmissionList items={items} selectedId={selected?.id} onSelect={setSelectedId} />
            </aside>
            <div>
              {selected ? <SubmissionDetail submission={selected} /> : (
                <p className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-slate-200 text-sm">Velg en besvarelse i listen.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </GradeErrorBoundary>
  );
}
