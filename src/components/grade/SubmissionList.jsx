import VerdictBadge from './VerdictBadge';

/** Venstre kolonne: alle innlastede besvarelser. */
export default function SubmissionList({ items, selectedId, onSelect }) {
  return (
    <ul className="space-y-1.5" aria-label="Innleverte besvarelser">
      {items.map((s) => {
        const p = s.payload;
        const name = s.folderName || s.fileName;
        const active = s.id === selectedId;
        return (
          <li key={s.id}>
            <button type="button" onClick={() => onSelect(s.id)} aria-current={active}
              className={`w-full text-left p-3 rounded-2xl border transition-colors ${
                active ? 'bg-slate-800 border-emerald-500/70' : 'bg-slate-900 border-slate-800 hover:border-slate-600'
              }`}>
              <p className="text-sm font-black text-white truncate">
                {name} {p?.receiptCode && <span className="text-emerald-300 font-mono">#{p.receiptCode}</span>}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <VerdictBadge verdict={s.verdict} compact />
                {p && (
                  <span className="text-[11px] text-slate-300" title="Antall ord og antall registrerte sikkerhetsvarsler (fokustap og innliminger)">
                    {p.wordCount ?? '–'} ord, {p.incidentCount ?? 0} varsler
                  </span>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
