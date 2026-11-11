/**
 * PrivacyAuditModal.jsx
 * Grundig teknisk redegjørelse for personvern, IT-sikkerhet og GDPR
 * tilpasset personvernombud (DPO), IT-avdelinger og lærere i norsk skole.
 */
import { X, ShieldCheck, Server, Lock, Database, Cpu, CheckCircle2, FileCheck } from 'lucide-react';
import AuthorMailLink from './common/AuthorMailLink';

export default function PrivacyAuditModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90" role="dialog" aria-modal="true" aria-labelledby="privacy-modal-title">
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
              <p className="text-xs text-slate-400">Nøkkelfunksjoner for IT og personvern (koden leveres «as is» og kan driftes på egne servere)</p>
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
              Verken det eleven skriver, elevens navn, oppgaveløsning eller innleverte PDF-filer overføres over nettverket til noen ekstern server eller skytjeneste under den ordinære skriveprøven. Alt elevtekstarbeid pakkes og formateres som en PDF direkte i elevens nettleserminne og lastes ned til elevens disk. Teksten mellomlagres lokalt underveis for å tåle krasj og strømbrudd, og tømmes automatisk fra nettleseren ved normal innlevering og avslutning.
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
                <li><strong>Todelt lagring av prøveoppsett:</strong> Offentlig startmetadata (<code className="text-slate-400">sebExams</code>) inneholder kun tittel og SEB-profil, mens oppgavetekst, PDF-sti og eventuell Forms-lenke (<code className="text-slate-400">sebExamContent</code>) kun utleveres via <code className="text-slate-400">getSebExamContent</code> til verifiserte Safe Exam Browser-klienter.</li>
                <li><strong>Umiddelbar sletting og 90-dagers auto-utløp:</strong> Læreren kan når som helst slette en prøve permanent fra serveren via «Mine prøver» (<code className="text-slate-400">deleteSebExam</code>, jf. GDPR art. 17). Uavhengig av dette sperres tilgang ved utløp etter 90 dager i regler, og slettes fysisk via Firestore TTL (<code className="text-slate-400">firestore.indexes.json</code>), <code className="text-slate-400">cleanupExamStorage</code> og bøttens livssyklusregel (<code className="text-slate-400">storage-lifecycle.json</code>).</li>
                <li><strong>DoS-vern og infrastruktur:</strong> En midlertidig, enveis HMAC-hashet teller (<code className="text-slate-400">rateLimits</code>, TTL 2–24 timer, IPv6 <code className="text-slate-400">/64</code>-normalisert) beskytter mot misbruk uten å lagre IP i klartekst. Google Cloud-infrastruktur i EU har standard tekniske driftslogger (30 dager) ved nedlasting av oppgave og signering.</li>
                <li><strong className="text-red-400">Ingen elevbesvarelser eller elevnavn</strong> lagres noensinne i databasen eller skylagringen.</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <h4 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
                <Database size={14} className="text-emerald-400" />
                Hva skjer lokalt på elevens maskin
              </h4>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                <li><strong>Autosave og låne-PC-beskyttelse:</strong> Teksten lagres fortløpende lokalt (<code className="text-slate-400">localStorage</code> og <code className="text-slate-400">IndexedDB</code>) knyttet til et økt-token i <code className="text-slate-400">sessionStorage</code>. Hvis SEB eller maskinen har vært lukket eller startet på nytt, fylles utkastet aldri automatisk inn i skrivefeltet: neste bruker får et eksplisitt valg om å gjenopprette eget utkast eller slette det og starte tom besvarelse.</li>
                <li><strong>Sletting ved avslutning og 12-timers utløp:</strong> Ved fullført eksport stoppes autolagring, og ved avslutning (<code className="text-slate-400">/quit</code>) tømmes det lokale utkastet umiddelbart. Uavsluttede utkast slettes automatisk etter 12 timer (<code className="text-slate-400">purgeExpiredDrafts</code>), og SEB tømmer alltid øktkapsler ved oppstart.</li>
                <li><strong>Eksport:</strong> Ved levering genereres PDF-dokumentet lokalt i minnet via klientbiblioteket <code className="text-slate-400">pdf-lib</code>.</li>
              </ul>
            </div>
          </div>

          {/* Fane 2 verifisering */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
              <FileCheck size={14} className="text-emerald-400" />
              2. Fane 2 (Valgfri kontroll av innleverte filer) kjører 100 % lokalt
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Elevenes PDF-er kan leses og vurderes direkte i Teams uten å bruke Fane 2. Dersom læreren velger å slippe inn PDF-er eller «Student Work»-mappen i Fane 2 for å kontrollere sjekksum og signatur, behandles filene utelukkende lokalt i nettleserens minne:
            </p>
            <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">
              <li>Koden i Fane 2 inneholder ingen <code className="text-slate-400">fetch</code>, <code className="text-slate-400">XMLHttpRequest</code>, <code className="text-slate-400">sendBeacon</code> eller Firebase-klienter.</li>
              <li>Dette håndheves av den statiske personvernvakten (<code className="text-emerald-400">scripts/privacy-guard.mjs</code>) før hver commit og i CI, kombinert med den automatiserte kjøretidstesten <code className="text-slate-400">withZeroNetworkFirewall</code> i <code className="text-slate-400">src/test/fane2NetworkAudit.test.js</code> som verifiserer 0 nettverkskall under full PDF- og signaturkontroll.</li>
              <li>PDF-innholdet kontrolleres lokalt i RAM med <code className="text-slate-400">pdf.js</code>, <code className="text-slate-400">pdf-lib</code> og den offentlige nøkkelen i <code className="text-slate-400">src/utils/integrity/publicKey.js</code>.</li>
            </ul>
          </div>

          {/* Teknisk krypto */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
              <Lock size={14} className="text-emerald-400" />
              3. Digital signering uten datalekkasje og låst runtime-brannmur
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ved ferdigstillelse sender elevens nettleser <em>kun</em> to verdier: <code className="text-emerald-400">&#123; examId, sha256 &#125;</code> til Cloud Function <code className="text-slate-300">signSebSubmission</code>.
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              Serveren mottar <strong>ingen tekst, ingen ord og intet elevnavn</strong>, men utelukkende den matematiske kontrollsummen som er saltet lokalt med et kryptografisk tilfeldig 128-bits <code className="text-slate-300">nonce</code> (som kun ligger i elevens lokale PDF). En aktiv, rutelåst nettverksbrannmur (<code className="text-slate-300">installRuntimeNetworkFirewall</code> i <code className="text-slate-300">runtimeNetworkFirewall.js</code>) låser ved kjøring alle utgående kall i prøverommet (<code className="text-slate-300">/exam/*</code>) direkte i nettleseren, slik at ingen forespørsel kan overstige 512 byte eller inneholde andre nøkler enn <code className="text-slate-300">&#123; examId &#125;</code> (oppstart i SEB) eller <code className="text-slate-300">&#123; examId, sha256 &#125;</code> (signering).
            </p>
          </div>

          {/* Sikkerhet og GDPR oppsummering */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
              <Cpu size={14} className="text-emerald-400" />
              4. Behandlingsansvar, Databehandleravtale (DPA) og egenhosting
            </h4>
            <div className="grid sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span><strong>Behandlingsansvar og DPA:</strong> Skolen eller skoleeier er behandlingsansvarlig for sine prøver. På <code className="text-slate-400">voxcuriosa.no/seb</code> behandles kun lærerens prøveoppsett og kortvarige tekniske tilkoblinger/IP i EØS (<code className="text-slate-400">europe-west1</code>). Skoleeiere som krever egen databehandleravtale (GDPR art. 28) for all nettverksinfrastruktur anbefales å drifte løsningen i eget miljø (egenhosting).</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span><strong>Ingen brukerkontoer, ingen KI og PIN kun i minnet:</strong> Verken lærere eller elever logger inn, lærer-PIN holdes kun i minnet i aktiv fane, og ingen data sendes til KI-modeller.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span><strong>Null elevsporing og GDPR art. 13-informasjon:</strong> Elevsidene (<code className="text-slate-400">/start/*</code>, <code className="text-slate-400">/exam/*</code>, <code className="text-slate-400">/quit</code>) har 0 % sporing og viser tydelig personverninformasjon på startsiden.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span><strong>Microsoft Forms og avslutningskode (minst 8 tegn):</strong> Forms åpnes direkte i SEB mot skolens Microsoft 365 og Feide-leietaker, beskyttet av et avslutningspassord på minst 8 tegn med bokstaver (3 korte ord + 2 sifre ved generering, f.eks. «sol-elg-fjord-42»).</span>
              </div>
              <div className="flex items-start gap-2 sm:col-span-2">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span><strong>100 % Open Source (MIT-lisens med krav om kreditering):</strong> Utviklet av <strong className="text-white"><AuthorMailLink label="Christian Borchgrevink-Vigeland" className="text-emerald-400 hover:text-emerald-300 underline font-semibold" /></strong> / VoxCuriosa (<a href="https://github.com/voxcuriosa/seb" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline font-mono">github.com/voxcuriosa/seb</a>). Koden leveres «as is» uten garantier og kan fritt revideres, tilpasses og hostes av skoler og kommuner mot synlig kreditering av opphavspersonen.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400 font-mono">
            Standard: GDPR Art. 13, 17, 25 og 32 · Leveres «as is» under MIT-lisens
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
