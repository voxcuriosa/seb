import { X, Code2, KeyRound, Monitor, FileSpreadsheet } from 'lucide-react';
import AuthorMailLink from './common/AuthorMailLink';

/** Lærerhjelp. Hold oppdatert ved endringer i funksjonalitet (se AGENTS.md). */
export default function HelpPanel({ onClose }) {
  return (
    <aside className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-700 text-sm text-slate-200 leading-relaxed space-y-4" aria-labelledby="help-title">
      <div className="flex items-center justify-between">
        <h2 id="help-title" className="text-base font-black text-white">Slik bruker du SEB-modulen</h2>
        <button type="button" onClick={onClose} aria-label="Lukk hjelp" className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"><X size={16} /></button>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <section>
          <h3 className="font-black text-emerald-300 mb-1">1. Opprett prøve</h3>
          <p>Lås opp med lærer-PIN (holdes kun i minnet i aktiv fane). Skriv eller lim inn oppgavetekst, last opp Word/PDF, eller lim inn en lenke til Microsoft Forms. Velg hjelpemidler, nettsider og avslutningskode (minst 8 tegn med bokstaver, påkrevd for Forms).</p>
        </section>
        <section>
          <h3 className="font-black text-emerald-300 mb-1">2. Del i Teams</h3>
          <p>Opprett en vanlig oppgave i Teams («Opprett -&gt; Oppgave») og lim inn SEB-lenken eller legg ved .seb-filen. Oppgaveteksten og eventuell Forms-lenke er skjult på startsiden og lastes kun når eleven åpner prøven inne i ekte Safe Exam Browser. Sett «Elever kan angre innlevering: Nei» i Teams.</p>
        </section>
        <section>
          <h3 className="font-black text-emerald-300 mb-1">3. Innlevering og sletting</h3>
          <p>Ved skriveprøver laster eleven ned en ferdig PDF som leveres i Teams. Sjekk at eleven står som «Innlevert» i Teams før eleven går. Du kan vurdere PDF-ene direkte i Teams – <strong>fane 2 er helt frivillig</strong> for å kontrollere sjekksum og signatur. Prøveoppsettet kan slettes umiddelbart fra serveren under «Mine prøver» når prøven er ferdig.</p>
        </section>
      </div>

      {/* Forms-prøver forklaring */}
      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1.5">
        <div className="flex items-center gap-1.5 text-white font-bold">
          <FileSpreadsheet size={15} className="text-emerald-400" />
          <span>Prøver i Microsoft Forms (med skole- og Feide-innlogging):</span>
        </div>
        <p className="leading-relaxed">
          Når du velger Microsoft Forms som kilde i steg 1, tilpasses Safe Exam Browser spesifikt for Forms-økosystemet:
        </p>
        <ul className="space-y-1 list-disc pl-4 text-slate-300">
          <li><strong>Skjult Forms-lenke og direkte start i SEB:</strong> Forms-lenken eksponeres aldri på den åpne startsiden eller i <code className="text-slate-400">.seb</code>-filen. Først når prøverommet åpnes inne i Safe Exam Browser hentes lenken. Uten nettbaserte hjelpemidler videresendes eleven direkte til Forms i fullskjerm; med tillatte nettsider vises et ressurspanel med knapper til nettsidene og Forms i egne SEB-vinduer.</li>
          <li><strong>Pålogging i SEB (Passord og Microsoft Authenticator):</strong> Fordi Safe Exam Browser blokkerer lokale OS-dialoger for Windows Hello og Touch ID (ansikt, fingeravtrykk og lokal maskin-PIN), skal eleven velge <strong>«Bruk passordet mitt / Use my password»</strong> (eventuelt sammen med <strong>Microsoft Authenticator</strong> på mobil ved tofaktor) når påloggingsbildet vises.</li>
          <li><strong>Tømming av øktkapsler på låne-PC:</strong> SEB sletter automatisk innloggingskapsler (cookies) ved oppstart av alle prøver og ved avslutning av Forms- og Clarify-prøver, slik at en elevs Feide-økt aldri blir liggende igjen på en låne-PC.</li>
          <li><strong>Slik deles den i Teams:</strong> Velg «Opprett -&gt; Oppgave» i Teams (ikke «Spørreskjema») og lim inn SEB-lenken. Husk å ha «Ett svar per person» påslått inne i Microsoft Forms.</li>
          <li><strong>Påkrevd avslutningskode (minst 8 tegn):</strong> Fordi Forms ikke kan lukke SEB automatisk, må du sette et avslutningspassord på minst 8 tegn med bokstaver (3 korte ord + 2 sifre ved tilfeldig generering, f.eks. «sol-elg-fjord-42»). Både avslutningsdialogen i ressurspanelet og SEBs egen avslutningssnarvei krever denne koden. Hold koden hemmelig under prøven og oppgi den ved pulten når eleven viser kvitteringsskjermen, eller på tavla når prøvetiden er ute.</li>
        </ul>
      </div>

      {/* Hjelpeprogrammer Mac vs Windows */}
      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1.5">
        <div className="flex items-center gap-1.5 text-white font-bold">
          <Monitor size={15} className="text-emerald-400" />
          <span>Fungerer Lingdys, VoxLex og Ordnett på Mac og Windows?</span>
        </div>
        <p className="leading-relaxed">
          <strong>Ja, de fungerer fullt ut på både Mac og Windows.</strong>
        </p>
        <ul className="space-y-1 list-disc pl-4 text-slate-300">
          <li><strong>På Mac og Windows:</strong> SEB-konfigurasjonen er satt opp med offisielle macOS Bundle Identifiers (<code className="text-emerald-300">no.lingit.lingdys</code>, <code className="text-emerald-300">no.voxlex.skole</code>, <code className="text-emerald-300">no.kunnskapsforlaget.ordnettpluss</code>) og forhåndsdefinerte Windows-hjelpeprogrammer uten åpen filvelger, tillater tilgjengelighet (<code className="text-slate-400">allowAccessibility = true</code>) og åpner delt utklippstavle når hjelpeprogrammer (Lingdys, VoxLex eller Ordnett) er valgt, slik at opplesing av markert tekst og ordbokoppslag fungerer sømløst.</li>
          <li><strong>Opplesing av markert tekst i Lingdys og VoxLex:</strong> Marker eller kopier ønsket tekst i prøverommet (eller i Microsoft Forms) og bruk opplesing direkte inne i Lingdys eller VoxLex slik eleven er vant til. (Hvis et avhuket hjelpeprogram ikke er installert på elevens maskin, skjer det ingenting når ikonet i SEB-menyen klikkes.)</li>
          <li><strong>Clarify Ordbøker (Feide) og fylkeskommunale påloggingsdomener:</strong> Velges under «Nettbaserte ordbøker og skolekilder» i steg 2 (<code className="text-emerald-300">https://app.clarify.no/auth</code>). Vi har forhåndshvitelistet Microsoft Entra SSO og SSO-subdomener (<code className="text-slate-400">adfs.*</code>, <code className="text-slate-400">sts.*</code>, <code className="text-slate-400">feide.*</code>, <code className="text-slate-400">idp.*</code>, <code className="text-slate-400">login.*</code>, <code className="text-slate-400">sso.*</code>) for norske fylkeskommuner og kommuner i <code className="text-emerald-300">src/utils/seb/formsAuthList.js</code> når Forms eller Clarify brukes, uten å åpne fylkenes vanlige informasjonssider (<code className="text-slate-400">www.*</code>). Andre påloggingsdomener kan legges til under «Legg til egne nettsider» i steg 2.</li>
        </ul>
      </div>

      {/* Avslutningspassord forklaring */}
      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1.5">
        <div className="flex items-center gap-1.5 text-white font-bold">
          <KeyRound size={15} className="text-emerald-400" />
          <span>Slik fungerer Avslutningspassord (minst 8 tegn):</span>
        </div>
        <p className="leading-relaxed">
          Avslutningspassordet fungerer som en nøkkel for læreren (minst 8 tegn med bokstaver, f.eks. 3 korte ord + 2 sifre som «sol-elg-fjord-42»):
        </p>
        <ul className="space-y-1 list-disc pl-4 text-slate-300">
          <li><strong>Normal avslutning (skriveprøve):</strong> Elevene fullfører ved å trykke «Fullfør», laste ned besvarelsen som PDF og bekrefte lagring. Da slettes lokalt utkast og SEB låser seg opp automatisk uten passord.</li>
          <li><strong>Manuell tvang-avslutning (nød-override):</strong> Hvis en elev må avbryte prøven før tiden, trykker læreren på <strong>Cmd + Q</strong> (Mac) eller <strong>Ctrl + Q</strong> (Windows) og taster avslutningskoden.</li>
          <li><strong>Hvis feltet står tomt:</strong> Er alle avslutningssnarveier sperret, og SEB kan kun lukkes ved å fullføre og levere PDF-en.</li>
        </ul>
      </div>

      <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 space-y-1">
        <p className="font-bold text-emerald-300">
          Elevarbeid forlater ALDRI nettleseren og låne-PC-er er beskyttet:
        </p>
        <p className="text-slate-300 leading-relaxed">
          Alt eleven skriver lagres lokalt i nettleseren på elevens egen maskin og eksporteres til PDF i minnet ved levering. Ved ny oppstart av SEB (f.eks. etter strømbrudd eller på en delt låne-PC) fylles et gammelt utkast aldri rett inn i skrivefeltet automatisk: eleven får spørsmål om å gjenopprette sitt eget utkast eller slette det og starte med blanke ark. Ved normal avslutning tømmes utkastet umiddelbart, og uavsluttede utkast slettes uansett automatisk etter 12 timer.
        </p>
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
        <div className="flex items-center gap-1.5 text-white font-bold">
          <Code2 size={14} className="text-emerald-400" />
          <span>100 % Open Source, databehandling og egenhosting:</span>
        </div>
        <p className="leading-relaxed">
          Utviklet av <strong className="text-white"><AuthorMailLink label="Christian Borchgrevink-Vigeland" className="text-white hover:text-emerald-300 underline font-semibold" /> / VoxCuriosa</strong> (MIT-lisens med krav om synlig kreditering, leveres «as is»). Skolen er behandlingsansvarlig for sine prøver. Ved bruk av <code className="text-slate-400">voxcuriosa.no/seb</code> lagres kun lærerens prøveoppsett i EU (opptil 90 dager, eller til du sletter prøven under «Mine prøver»). Kommuner og fylkeskommuner som krever egen databehandleravtale for all teknisk infrastruktur kan drifte hele løsningen på egne servere:
        </p>
        <a
          href="https://github.com/voxcuriosa/seb"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-emerald-400 hover:text-emerald-300 font-mono underline mt-0.5"
        >
          https://github.com/voxcuriosa/seb
        </a>
      </div>

      <ul className="text-xs text-slate-300 space-y-1.5 border-t border-slate-800 pt-3">
        <li><strong className="text-white">Omstart av PC:</strong> Er i utgangspunktet frivillig, men <strong>før store prøver som heldagsprøver og tentamen anbefales det at elevene restarter PC-en først</strong> for å frigjøre minne og lukke bakgrunnsprogrammer.</li>
        <li><strong className="text-white">Lagring og sletting:</strong> Bare lærerens prøveoppsett lagres i EU (<code className="text-slate-400">europe-west1</code>). Du kan slette prøven permanent fra serveren med søppelbøtte-ikonet under «Mine prøver», og uavhengig av dette utløper og slettes alt automatisk etter 90 dager.</li>
        <li><strong className="text-white">Fane 2 (Valgfri kontroll):</strong> Helt frivillig å bruke – PDF-ene kan leses direkte i Teams som vanlig, eller slippes inn i fane 2 for å kontrollere sjekksum, synlig tekst, PDF-struktur og serversignatur helt uten nettverkskall.</li>
        <li><strong className="text-white">Stavekontroll og lange oppgave-PDF-er:</strong> Innebygd stavekontroll for bokmål, nynorsk, engelsk (UK/US), tysk, spansk og fransk. Oppgave-PDF-er virtualiseres side-for-side slik at også store vedlegg vises raskt uten minneproblemer.</li>
        <li><strong className="text-white">Statusmerker:</strong> «Verifisert» betyr at SHA-256, synlig tekst, PDF-struktur og Ed25519-serversignatur stemmer. «Verifisert, ikke signert» betyr at eleven var offline ved innlevering. «Ugyldig» betyr at filen er endret etter eksport.</li>
      </ul>
    </aside>
  );
}
