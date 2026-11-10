import { useState } from 'react';
import { Copy, Printer, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
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

function Stat({ label, value, title, mono = false }) {
  return (
    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800" title={title}>
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`text-sm font-black text-white mt-0.5 break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}

/** Høyre panel: detaljer og verifisert besvarelse. */
export default function SubmissionDetail({ submission }) {
  const [copied, setCopied] = useState(false);
  const p = submission.payload;

  if (!p) {
    return (
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-slate-200">
        <VerdictBadge verdict={submission.verdict} />
        <p className="mt-3 text-sm">{submission.reasons?.join(' ')}</p>
      </div>
    );
  }

  const signedValid = submission.signature?.status === 'valid' && Boolean(p.signedAt);

  const copy = async () => {
    await navigator.clipboard.writeText(p.essayText || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 print-area">
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-white">
            {submission.folderName || submission.fileName} <span className="font-mono text-emerald-300">#{p.receiptCode}</span>
          </h2>
          <p className="text-sm text-slate-200">{p.examTitle || p.topicTitle}</p>
          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs font-mono text-slate-300">
            <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800">
              Prøve-ID: <strong className="text-white">{p.examId || '–'}</strong>
            </span>
            {signedValid && (
              <span className="px-2 py-0.5 rounded-lg bg-emerald-950 border border-emerald-500/60 text-emerald-200">
                Serversignert: <strong>{formatDateTime(p.signedAt)}</strong>
              </span>
            )}
          </div>
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

      {submission.isDuplicate && (
        <div role="alert" className="p-4 rounded-2xl bg-red-950 border border-red-500/90 text-red-100 text-sm flex items-start gap-2.5">
          <AlertTriangle size={18} className="text-red-300 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-black">Duplikat! Samme besvarelse er levert flere ganger.</p>
            <p className="text-xs text-red-200 mt-0.5">
              Deler sjekksum, serversignatur eller kvitteringskode med: <strong>{submission.duplicateOf}</strong>.
            </p>
          </div>
        </div>
      )}

      {submission.examIdMismatch && (
        <div role="alert" className="p-4 rounded-2xl bg-red-950 border border-red-500/90 text-red-100 text-sm flex items-start gap-2.5">
          <AlertTriangle size={18} className="text-red-300 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-black">Avvikende prøve-ID oppdaget!</p>
            <p className="text-xs text-red-200 mt-0.5">
              Denne PDF-en har prøve-ID <strong className="font-mono">{p.examId || 'ukjent'}</strong>
              {submission.expectedExamId
                ? <>, mens flertallet i bunken har <strong className="font-mono">{submission.expectedExamId}</strong></>
                : ' (bunken inneholder ulike prøve-ID-er)'}.
              {' '}Kontroller at eleven ikke har levert en PDF fra en annen eller selvopprettet prøve.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <VerdictBadge verdict={submission.verdict} />
        {submission.reasons?.length > 0 && (
          <ul className="text-sm text-red-200 space-y-1">
            {submission.reasons.map((r, idx) => (
              <li key={`${r}-${idx}`} className="flex gap-1.5">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
                {r}
              </li>
            ))}
          </ul>
        )}
        {submission.signature && submission.verdict !== 'invalid' && (
          <p className="text-xs text-slate-300">
            {submission.signature.detail}
            {signedValid ? ` Serverklokke: ${formatDateTime(p.signedAt)}.` : ''}
            {p.sebConfigKey ? ` SEB ConfigKey: ${String(p.sebConfigKey).slice(0, 16)}…` : ''}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Prøve-ID" value={p.examId || '–'} mono title="Unik prøve-ID som besvarelsen er knyttet til" />
        <Stat label="Start" value={formatDateTime(p.startedAt)} title="Tidspunktet eleven åpnet prøven i SEB (lokal klokke)" />
        <Stat
          label={signedValid ? 'Levert (serversignert)' : 'Levert (lokal klokke)'}
          value={formatDateTime(signedValid ? p.signedAt : p.completedAt)}
          title={
            signedValid
              ? `Uforfalskelig servertidspunkt fra Ed25519-signatur (${formatDateTime(p.signedAt)}). Lokal PC-klokke var ${formatDateTime(p.completedAt)}.`
              : 'Tidspunktet PDF-en ble generert (lokal klokke på elevens maskin)'
          }
        />
        <Stat label="Aktiv tid" value={formatDuration(p.activeSeconds)} title="Tid prøvevinduet var synlig og i fokus" />
        <Stat label="Ord" value={p.wordCount ?? '–'} title="Antall ord i besvarelsen" />
        <Stat label="App-bytter" value={p.appSwitchIncidents ?? 0} title="Antall ganger eleven byttet til tillatt hjelpemiddel eller ordbok" />
        <Stat label="Fokustap" value={p.focusLossIncidents ?? 0} title="Antall ganger eleven forlot prøvevinduet" />
        <Stat label="Innliminger" value={p.pasteIncidents ?? 0} title="Registrerte store innliminger" />
      </div>

      {Array.isArray(p.incidents) && p.incidents.length > 0 && (
        <details className="rounded-xl bg-slate-950 border border-slate-800 p-3">
          <summary className="text-xs font-black uppercase tracking-wider text-slate-200 cursor-pointer">
            Sikkerhets- og fokuslogg ({p.incidents.length})
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-slate-200 font-mono">
            {p.incidents.map((i, idx) => (
              <li key={idx}>
                {formatDateTime(i.at)}: {INCIDENT_LABELS[i.type] || i.type || i.message || 'Hendelse'}{i.detail ? ` (${i.detail})` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}

      <section className="rounded-2xl bg-white text-slate-900 p-5 sm:p-7 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 border-b border-slate-200 pb-2">
          <ShieldCheck size={15} aria-hidden="true" />
          <span>Kryptografisk kontrollert tekstvisning (rendret direkte fra verifisert payload)</span>
        </div>
        {p.essayText !== undefined ? <EssayView payload={p} formattingTrusted={submission.formattingTrusted} /> : (
          <p className="text-sm text-slate-700">Eldre Curiosa-format støttes ikke i SEB-tekstvisningen.</p>
        )}
      </section>
    </article>
  );
}
