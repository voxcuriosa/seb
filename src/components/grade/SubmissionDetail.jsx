import { useState } from 'react';
import { Copy, Printer, CheckCircle2, AlertTriangle } from 'lucide-react';
import VerdictBadge from './VerdictBadge';
import EssayView from './EssayView';
import { formatDateTime, formatDuration } from '../../utils/exam/formatTime';

const INCIDENT_LABELS = {
  APP_SWITCH: 'Brukt tillatt hjelpemiddel / annen app',
  FOCUS_LOST: 'Forlot prøvevinduet',
  FOCUS_RETURNED: 'Tilbake i prøvevinduet',
  PASTE: 'Stor innliming',
  RESTORED: 'Gjenopprettet etter omstart'
};

function Stat({ label, value, title }) {
  return (
    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800" title={title}>
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-sm font-black text-white mt-0.5">{value}</p>
    </div>
  );
}

/** Høyre panel: detaljer og verifisert besvarelse. */
export default function SubmissionDetail({ submission }) {
  const [copied, setCopied] = useState(false);
  const p = submission.payload;

  if (!p) {
    return (
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-slate-300">
        <VerdictBadge verdict={submission.verdict} />
        <p className="mt-3 text-sm">{submission.reasons?.join(' ')}</p>
      </div>
    );
  }

  const copy = async () => {
    await navigator.clipboard.writeText(p.essayText || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 print-area">
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">
            {submission.folderName || submission.fileName} <span className="font-mono text-emerald-300">#{p.receiptCode}</span>
          </h2>
          <p className="text-sm text-slate-300">{p.examTitle || p.topicTitle}</p>
        </div>
        <div className="flex gap-2 no-print">
          <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase">
            {copied ? <CheckCircle2 size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />} {copied ? 'Kopiert' : 'Kopier tekst'}
          </button>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase">
            <Printer size={14} aria-hidden="true" /> Skriv ut
          </button>
        </div>
      </header>

      <div className="space-y-2">
        <VerdictBadge verdict={submission.verdict} />
        {submission.reasons?.length > 0 && (
          <ul className="text-sm text-red-200 space-y-1">
            {submission.reasons.map((r) => <li key={r} className="flex gap-1.5"><AlertTriangle size={14} className="shrink-0 mt-0.5" aria-hidden="true" />{r}</li>)}
          </ul>
        )}
        {submission.signature && submission.verdict !== 'invalid' && (
          <p className="text-xs text-slate-400">
            {submission.signature.detail}
            {submission.signature.status === 'valid' && p.signedAt ? ` Serverklokke: ${formatDateTime(p.signedAt)}.` : ''}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Stat label="Start" value={formatDateTime(p.startedAt)} title="Tidspunktet eleven åpnet prøven i SEB (lokal klokke)" />
        <Stat
          label={submission.signature?.status === 'valid' && p.signedAt ? 'Levert (serversignert)' : 'Levert (lokal klokke)'}
          value={formatDateTime(submission.signature?.status === 'valid' && p.signedAt ? p.signedAt : p.completedAt)}
          title={
            submission.signature?.status === 'valid' && p.signedAt
              ? `Uforfalskelig servertidspunkt fra Ed25519-signatur (${formatDateTime(p.signedAt)}). Lokal PC-klokke var ${formatDateTime(p.completedAt)}.`
              : 'Tidspunktet PDF-en ble generert (lokal klokke på elevens maskin)'
          }
        />
        <Stat label="Aktiv tid" value={formatDuration(p.activeSeconds)} title="Tid prøvevinduet var synlig og i fokus" />
        <Stat label="Ord" value={p.wordCount ?? '–'} title="Antall ord i besvarelsen" />
        {p.appSwitchIncidents > 0 ? (
          <Stat label="App-bytte" value={p.appSwitchIncidents} title="Antall ganger eleven brukte tillatt hjelpemiddel eller ordbok" />
        ) : (
          <Stat label="Fokustap" value={p.focusLossIncidents ?? 0} title="Antall ganger eleven forlot prøvevinduet" />
        )}
        <Stat label="Innliminger" value={p.pasteIncidents ?? 0} title="Innliminger over 200 tegn" />
      </div>

      {Array.isArray(p.incidents) && p.incidents.length > 0 && (
        <details className="rounded-xl bg-slate-950 border border-slate-800 p-3">
          <summary className="text-xs font-black uppercase tracking-wider text-slate-300 cursor-pointer">Sikkerhets- og fokuslogg ({p.incidents.length})</summary>
          <ul className="mt-2 space-y-1 text-xs text-slate-300 font-mono">
            {p.incidents.map((i, idx) => (
              <li key={idx}>{formatDateTime(i.at)}: {INCIDENT_LABELS[i.type] || i.type || i.message}{i.detail ? ` (${i.detail})` : ''}</li>
            ))}
          </ul>
        </details>
      )}

      <section className="rounded-2xl bg-white text-slate-900 p-5 sm:p-7">
        {p.essayText !== undefined ? <EssayView payload={p} formattingTrusted={submission.formattingTrusted} /> : (
          <p className="text-sm text-slate-600">Eldre Curiosa-format: åpne PDF-en for å lese hele besvarelsen.</p>
        )}
      </section>
    </article>
  );
}
