import { Loader2, Trash2 } from 'lucide-react';
import TeamsGuide from './TeamsGuide';
import PdfDropZone from './PdfDropZone';
import SubmissionList from './SubmissionList';
import SubmissionDetail from './SubmissionDetail';
import VerificationStepsGuide from './VerificationStepsGuide';
import { useSubmissions } from '../../hooks/useSubmissions';

/** Fane 2: Kontroller innleverte PDF-er (100 % lokalt). */
export default function GradeSubmissionsTab() {
  const { items, addFiles, clear, progress, selected, setSelectedId } = useSubmissions();
  const counts = items.reduce((acc, i) => ({ ...acc, [i.verdict]: (acc[i.verdict] || 0) + 1 }), {});

  return (
    <div className="space-y-5">
      <TeamsGuide />

      {progress && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200" role="status">
          <Loader2 size={18} className="animate-spin text-emerald-400" aria-hidden="true" />
          <span className="text-sm font-bold">Verifiserer {progress.done} av {progress.total} filer med SHA-256...</span>
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
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span title="Verifisert / ikke signert / ugyldig">
                {items.length} filer: {counts.verified || 0} verifisert, {counts['verified-unsigned'] || 0} usignert, {counts.invalid || 0} ugyldig
              </span>
              <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-slate-400 hover:text-white" title="Tøm listen (ingenting er lagret)">
                <Trash2 size={13} aria-hidden="true" /> Tøm
              </button>
            </div>
            <PdfDropZone onFiles={addFiles} compact />
            <SubmissionList items={items} selectedId={selected?.id} onSelect={setSelectedId} />
          </aside>
          <div>
            {selected ? <SubmissionDetail submission={selected} /> : (
              <p className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-slate-300 text-sm">Velg en besvarelse i listen.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
