/**
 * PrivacyAuditModal.jsx
 * Grundig teknisk redegjørelse for personvern, IT-sikkerhet og GDPR
 * tilpasset personvernombud (DPO), IT-avdelinger og lærere i norsk skole.
 */
import { X, ShieldCheck, Server, Lock, Database, Trash2, Cpu, CheckCircle2, FileCheck } from 'lucide-react';

export default function PrivacyAuditModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-none" role="dialog" aria-modal="true" aria-labelledby="privacy-modal-title">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={22} aria-hidden="true" />
            </div>
            <div>
              <h2 id="privacy-modal-title" className="text-lg font-black text-white">
                Personvern, Databehandling og IT-sikkerhet (DPIA)
              </h2>
              <p className="text-xs text-slate-400">Teknisk garanti for personvernombud, IT-drift og lærere</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Lukk personvernerklæring"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-200 leading-relaxed">
          {/* Hovedregel */}
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 space-y-2">
            <h3 className="font-black text-emerald-300 flex items-center gap-2 text-sm uppercase tracking-wider">
              <CheckCircle2 size={16} className="text-emerald-400" />
              1. Hovedprinsipp: Elevarbeid forlater ALDRI nettleseren
            </h3>
            <p className="text-xs text-emerald-100 leading-relaxed">
              Verken elevens tekst, navn, besvarelser eller innleverte PDF-filer overføres over nettverket til noen ekstern server eller skytjeneste. Alt arbeid og all verifisering skjer 100 % lokalt i nettleserens minne på den aktuelle datamaskinen.
            </p>
          </div>

          {/* Hva lagres hvor */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <h4 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
                <Server size={14} className="text-emerald-400" />
                Hva lagres i skyen (europe-west1)
              </h4>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                <li><strong>Lærerens oppgavetekst</strong> (tittel og instrukser) lagret som statisk JSON.</li>
                <li>Eventuell <strong>oppgave-PDF</strong> dersom læreren la ved et vedlegg til oppgaven.</li>
                <li><strong>Tillatte hjelpemidler og URL-er</strong> for SEB-profilen.</li>
                <li><strong>Auto-sletting:</strong> Alt slettes deterministisk og ugjenkallelig etter 90 dager via Firestore TTL.</li>
                <li><strong className="text-red-400">Ingen elevdata eller elevsvar</strong> lagres noensinne i databasen.</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <h4 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
                <Database size={14} className="text-emerald-400" />
                Hva skjer lokalt på elevens maskin
              </h4>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                <li><strong>Autosave:</strong> Teksten lagres hvert sekund i nettleserens lokale minne (<code className="text-slate-400">localStorage / IndexedDB</code>).</li>
                <li><strong>Strømbrudd / Krasj:</strong> Hvis maskinen går tom for batteri eller omstartes, gjenopprettes teksten umiddelbart lokalt.</li>
                <li><strong>Eksport:</strong> Ved levering genereres PDF-dokumentet lokalt i minnet via klientbiblioteket pdf-lib.</li>
              </ul>
            </div>
          </div>

          {/* Fane 2 verifisering */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
              <FileCheck size={14} className="text-emerald-400" />
              2. Fane 2 (Kontroll av innleverte filer) har NULL nettverkskall
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Når læreren slipper inn PDF-er eller hele «Student Work»-mappen fra Teams/SharePoint, er det <strong>fysisk umulig</strong> at dokumentene lekker ut:
            </p>
            <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">
              <li>Koden i Fane 2 inneholder ingen <code className="text-slate-400">fetch</code>, <code className="text-slate-400">XMLHttpRequest</code> eller Firebase-klienter.</li>
              <li>Dette håndheves automatisk i kildekoden før hver eneste deploy av en statisk kodegransker (<code className="text-emerald-400">scripts/privacy-guard.mjs</code>).</li>
              <li>Innholdet i PDF-en leses utelukkende i nettleserens RAM via Mozilla <code className="text-slate-400">pdf.js</code> og sjekkes mot den matematiske SHA-256 kontrollsummen.</li>
            </ul>
          </div>

          {/* Teknisk krypto */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
              <Lock size={14} className="text-emerald-400" />
              3. Hvordan fungerer den digitale signeringen uten datalekkasje?
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ved ferdigstillelse sender elevens nettleser <em>kun</em> to verdier: <code className="text-emerald-400">&#123; examId, sha256 &#125;</code> til Cloud Function <code className="text-slate-300">signSebSubmission</code>.
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              Serveren mottar <strong>ingen ord, ingen setninger og intet elevnavn</strong>. Serveren signerer den enveis-krypterte SHA-256-hashen med Ed25519 og returnerer signaturen. Hvis eleven var offline, fullføres innleveringen likevel lokalt uten signatur (merkes som «Verifisert, ikke signert»).
            </p>
          </div>

          {/* Sikkerhet og GDPR oppsummering */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
              <Cpu size={14} className="text-emerald-400" />
              4. Nøkkelpunkter for IT-sikkerhet og Databehandleravtale (DPA)
            </h4>
            <div className="grid sm:grid-cols-2 gap-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Ingen brukerkontoer:</strong> Verken lærere eller elever logger inn. Ingen brukernavn, e-poster eller passord lagres.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Ingen kunstig intelligens (KI):</strong> Ingen data sendes til OpenAI, Google Gemini, Anthropic eller andre språkmodeller.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Ingen sporing eller annonser:</strong> Ingen tredjeparts sporingsskript, informasjonskapsler for sporing eller Google Analytics.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Dataminimering (GDPR art. 5):</strong> Systemet behandler kun et absolutt minimum av data for å kunne generere SEB-konfigurasjonen.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400 font-mono">
            Standard: GDPR Art. 25 (Privacy by Design) & Art. 32 (Sikkerhet)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wider"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  );
}
