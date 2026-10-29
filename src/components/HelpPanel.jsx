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
          <p>Lås opp med lærer-PIN. Skriv eller lim inn oppgavetekst, last opp Word/PDF, eller lim inn en lenke til Microsoft Forms. Velg hjelpemidler, nettsider og avslutningskode (påkrevd for Forms).</p>
        </section>
        <section>
          <h3 className="font-black text-emerald-300 mb-1">2. Del i Teams</h3>
          <p>Opprett en vanlig oppgave i Teams («Opprett -&gt; Oppgave») og lim inn SEB-lenken eller legg ved .seb-filen. Sett «Elever kan angre innlevering: Nei» (kan settes som fast standard for klassen under tannhjulet «Oppgaveinnstillinger» i Oppgaver-fanen).</p>
        </section>
        <section>
          <h3 className="font-black text-emerald-300 mb-1">3. Innlevering (og valgfri kontroll)</h3>
          <p>Ved skriveprøver laster eleven ned en ferdig PDF som leveres i Teams. Sjekk at eleven står som «Innlevert» i Teams før eleven går. Du kan lese og vurdere PDF-ene direkte i Teams – <strong>fane 2 er helt frivillig</strong> og brukes bare hvis du vil kontrollere sjekksum og signatur. Ved Forms-prøver lagres svarene direkte i Microsoft Forms.</p>
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
          <li><strong>Direkte start i SEB og synlige nettsider:</strong> Uten nettbaserte hjelpemidler åpnes Forms direkte som hovedside i fullskjerm. Hvis du har valgt tillatte nettsider eller nettordbøker (som Clarify, SNL eller NDLA), åpner SEB et eget ressurspanel med knapper til alle de tillatte nettsidene og en knapp som åpner Microsoft Forms i et eget SEB-vindu ved siden av. Dette sikrer at innlogging med Feide og Microsoft 365 fungerer uten at sikkerhetssperrer for innramming (X-Frame-Options) blokkerer siden, samtidig som nettsidene alltid er tilgjengelige på både Mac og Windows.</li>
          <li><strong>Pålogging i SEB (Passord og Microsoft Authenticator):</strong> Fordi Safe Exam Browser blokkerer lokale OS-dialoger for Windows Hello og Touch ID (ansikt/fingeravtrykk/PIN på maskinen), skal eleven velge <strong>«Bruk passordet mitt / Use my password»</strong> (eventuelt sammen med <strong>Microsoft Authenticator</strong> på mobil hvis skolen bruker tofaktor) når påloggingsbildet vises.</li>
          <li><strong>Tømming av øktkapsler på låne-PC:</strong> SEB sletter automatisk innloggingskapsler (cookies) ved oppstart og avslutning av Forms-prøver, slik at en elevs Feide-økt aldri blir liggende igjen på en låne-PC.</li>
          <li><strong>Slik deles den i Teams:</strong> Velg «Opprett -&gt; Oppgave» i Teams (ikke «Spørreskjema») og lim inn SEB-lenken. Husk å ha «Ett svar per person» påslått inne i Microsoft Forms.</li>
          <li><strong>Påkrevd avslutningskode:</strong> Fordi Forms ikke kan lukke SEB automatisk, må du sette et kodeord (minst 6 tegn, f.eks. «sol-482»). Hold koden hemmelig under prøven: oppgi den ved pulten når eleven viser kvitteringsskjermen («Takk for svaret ditt»), eller skriv den på tavla når prøvetiden er ute og alle har levert.</li>
        </ul>
      </div>

      {/* Hjelpeprogrammer Mac vs Windows */}
      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1.5">
        <div className="flex items-center gap-1.5 text-white font-bold">
          <Monitor size={15} className="text-emerald-400" />
          <span>Fungerer Lingdys, VoxLex og Ordnett på Mac?</span>
        </div>
        <p className="leading-relaxed">
          <strong>Ja, de fungerer fullt ut på både Mac og Windows!</strong>
        </p>
        <ul className="space-y-1 list-disc pl-4 text-slate-300">
          <li><strong>På Mac:</strong> SEB-konfigurasjonen vår er ferdig satt opp med offisielle macOS Bundle Identifiers (<code className="text-emerald-300">no.lingit.lingdys</code>, <code className="text-emerald-300">no.voxlex.skole</code>, <code className="text-emerald-300">no.kunnskapsforlaget.ordnettpluss</code>), tillater tilgjengelighet (<code className="text-slate-400">allowAccessibility = true</code>) og åpner delt utklippstavle (<code className="text-slate-400">enablePrivateClipboard = false</code>) når hjelpeprogrammer er valgt, slik at både VoxLex og Lingdys kan lese opp markert tekst direkte.</li>
          <li><strong>Opplesing av markert tekst i Lingdys og VoxLex:</strong> Marker ønsket tekst i prøverommet (eller i Microsoft Forms) og trykk på «Les opp» i VoxLex eller «Play»-knappen i Lingdys sin flytende verktøylinje. I skriveprøver kan eleven også bruke knappen <strong>«Les i Lingdys»</strong> på verktøylinjen.</li>
          <li><strong>Clarify Ordbøker (Feide) og fylkeskommunale påloggingsdomener:</strong> Velges under «Nettbaserte ordbøker og skolekilder» i steg 2 (<code className="text-emerald-300">https://app.clarify.no/auth</code>). Når en elev logger inn med Feide i Microsoft Forms eller Clarify, videresender Feide ofte eleven til fylkeskommunens eller kommunens egen påloggingstjener (ADFS / Microsoft Entra SSO). Vi har forhåndshvitelistet Microsoft Entra SSO (<code className="text-slate-400">*.msidentity.com/*</code>, <code className="text-slate-400">*.microsoftazuread-sso.com/*</code>, <code className="text-slate-400">login.windows.net/*</code>, <code className="text-slate-400">sts.windows.net/*</code>) og kjente fylkeskommunale domener (<code className="text-slate-400">*.telemarkfylke.no/*</code>, <code className="text-slate-400">*.vestfoldfylke.no/*</code>, <code className="text-slate-400">*.afk.no/*</code>, <code className="text-slate-400">*.vlfk.no/*</code>, <code className="text-slate-400">*.rogfk.no/*</code>, <code className="text-slate-400">*.trondelagfylke.no/*</code>, <code className="text-slate-400">*.innlandetfylke.no/*</code>, <code className="text-slate-400">*.osloskolen.no/*</code> m.fl.) i <code className="text-emerald-300">src/utils/seb/formsAuthList.js</code>. Dersom en skole eller et fylke benytter et annet lokalt påloggingsdomene for Feide, bør dette legges inn under «Legg til egne nettsider» i steg 2 (eller i <code className="text-slate-400">formsAuthList.js</code> ved egen drift).</li>
        </ul>
      </div>

      {/* Avslutningspassord forklaring */}
      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1.5">
        <div className="flex items-center gap-1.5 text-white font-bold">
          <KeyRound size={15} className="text-emerald-400" />
          <span>Slik fungerer Avslutningspassord (Manuell nød-override):</span>
        </div>
        <p className="leading-relaxed">
          Avslutningspassordet er <strong>ikke en boks som står åpen</strong> under prøven. Det fungerer som en <em>skjult nødnøkkel</em> for læreren:
        </p>
        <ul className="space-y-1 list-disc pl-4 text-slate-300">
          <li><strong>Normal avslutning:</strong> Elevene fullfører prøven ved å trykke «Fullfør», laste ned besvarelsen som PDF og bekrefte lagring. Da låser SEB seg opp automatisk uten at noe passord trengs.</li>
          <li><strong>Manuell tvang-avslutning (nød-override):</strong> Hvis en elev opplever tekniske problemer (eller må avbryte prøven før tiden uten å restarte maskinen), trykker læreren på tastatursnarveien:
            <div className="my-1 pl-2 font-mono text-[11px] text-emerald-300">
              • Mac: <strong>Cmd + Q</strong><br />
              • Windows: <strong>Ctrl + Q</strong> (eller <strong>Alt + F4</strong>, eller det lille røde ikonet nederst til høyre i SEBs oppgavelinje)
            </div>
            Da spretter SEBs passordboks opp, og læreren taster koden for å låse opp maskinen umiddelbart.</li>
          <li><strong>Hvis feltet står tomt:</strong> Er alle snarveier sperret, og SEB kan kun lukkes ved å fullføre og levere PDF-en.</li>
        </ul>
      </div>

      <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 space-y-1">
        <p className="font-bold text-emerald-300">
          Elevarbeid forlater ALDRI nettleseren:
        </p>
        <p className="text-slate-300 leading-relaxed">
          Alt eleven skriver i skriveeditoren lagres lokalt i nettleseren på elevens egen datamaskin. Ved innlevering pakkes teksten som en ferdig PDF direkte i nettleserminnet og lastes ned til maskinen. Ingen elevtekst eller elevnavn sendes til noen server eller skytjeneste (kun prøve-ID og SHA-256-kontrollsum ved signering), og det lokale utkastet tømmes automatisk ved normal innlevering og avslutning.
        </p>
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
        <div className="flex items-center gap-1.5 text-white font-bold">
          <Code2 size={14} className="text-emerald-400" />
          <span>100 % Open Source (MIT-lisens med krav om kreditering):</span>
        </div>
        <p className="leading-relaxed">
          Utviklet av <strong className="text-white"><AuthorMailLink label="Christian Borchgrevink-Vigeland" className="text-white hover:text-emerald-300 underline font-semibold" /> / VoxCuriosa</strong>. Kildekoden er åpen og leveres «as is» (uten garantier). Den kan fritt brukes, modifiseres og driftes på egne servere av skoler, kommuner og fylkeskommuner, forutsatt synlig kreditering av opphavspersonen i kode og brukergrensesnitt:
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
        <li><strong className="text-white">Omstart av PC:</strong> Er i utgangspunktet frivillig, og elevene kan starte vanlige prøver rett fra skolehverdagen. <strong>Før store og viktige prøver (som heldagsprøver og tentamen) anbefales det likevel at elevene restarter PC-en først.</strong> Dette tømmer maskinminnet og forhindrer at bakgrunnsprogrammer, Discord eller skjermopptakere skaper sjeldne konflikter med Safe Exam Browser.</li>
        <li><strong className="text-white">Lagring:</strong> Bare lærerens prøveoppsett (tittel, oppgavetekst, innstillinger) lagres i EU, og både tilgang og filer utløper og slettes automatisk etter 90 dager.</li>
        <li><strong className="text-white">Fane 2 (Valgfri kontroll):</strong> Helt frivillig å bruke – PDF-ene kan leses direkte i Teams som vanlig, eller slippes inn i fane 2 dersom du ønsker å sjekke sjekksum og signatur. Utfører ingen nettverkskall under filkontrollen.</li>
        <li><strong className="text-white">Stavekontroll:</strong> Innebygd stavekontroll for norsk bokmål, nynorsk, engelsk (UK/US), tysk, spansk og fransk. Høyreklikk på ord med rød strek for å få forslag.</li>
        <li><strong className="text-white">Statusmerker:</strong> «Verifisert» betyr at SHA-256, synlig tekst og Ed25519-serversignatur (med serverens uforfalskelige klokkeslett) stemmer. «Verifisert, ikke signert» betyr at eleven var offline ved innlevering. «Ugyldig» betyr at filen er endret etter eksport.</li>
      </ul>
    </aside>
  );
}
