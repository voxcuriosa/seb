import { AlertTriangle } from 'lucide-react';
import VerdictBadge from './VerdictBadge';
import { formatDateTime } from '../../utils/exam/formatTime';

/** Venstre kolonne: alle innlastede besvarelser. */
export default function SubmissionList({ items, selectedId, onSelect }) {
  return (
    <ul className="space-y-1.5" aria-label="Innleverte besvarelser">
      {items.map((s) => {
        const p = s.payload;
        const name = s.folderName || s.fileName;
        const active = s.id === selectedId;
        const hasAlert = Boolean(s.isDuplicate || s.examIdMismatch);
        const signedValid = s.signature?.status === 'valid' && p?.signedAt;

        let borderCls = 'bg-slate-900 border-slate-800 hover:border-slate-600';
        if (active && hasAlert) {
          borderCls = 'bg-slate-800 border-red-500 ring-1 ring-red-500/60';
        } else if (active) {
          borderCls = 'bg-slate-800 border-emerald-500/70';
        } else if (hasAlert) {
          borderCls = 'bg-red-950/30 border-red-500/80 hover:border-red-400';
        }

        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              aria-current={active}
              className={`w-full text-left p-3 rounded-2xl border transition-colors ${borderCls}`}
            >
              <p className="text-sm font-black text-white truncate">
                {name} {p?.receiptCode && <span className="text-emerald-300 font-mono">#{p.receiptCode}</span>}
              </p>

              {(s.isDuplicate || s.examIdMismatch) && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {s.isDuplicate && (
                    <span
                      title={`Samme sjekksum, signatur eller kvitteringskode som ${s.duplicateOf}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-950 text-red-100 border border-red-500/90"
                    >
                      <AlertTriangle size={11} aria-hidden="true" /> Duplikat!
                    </span>
                  )}
                  {s.examIdMismatch && (
                    <span
                      title="Denne besvarelsen har en annen prøve-ID enn resten av bunken"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-950 text-red-100 border border-red-500/90"
                    >
                      <AlertTriangle size={11} aria-hidden="true" /> Avvikende prøve-ID
                    </span>
                  )}
                </div>
              )}

              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <VerdictBadge verdict={s.verdict} compact />
                {p && (
                  <span
                    className="text-[11px] text-slate-200"
                    title="Antall ord og antall registrerte sikkerhetsvarsler"
                  >
                    {p.wordCount ?? '–'} ord, {p.incidentCount ?? 0} varsler
                  </span>
                )}
              </div>

              {p && (p.examId || signedValid) && (
                <div className="mt-1 text-[11px] text-slate-300 font-mono truncate">
                  {p.examId && <span>ID: {p.examId}</span>}
                  {p.examId && signedValid && <span> · </span>}
                  {signedValid && <span>Signert {formatDateTime(p.signedAt)}</span>}
                </div>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
