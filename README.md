# VoxCuriosa SEB – Safe Exam Browser Prøvemodul

**100 % Open Source (MIT-lisens) • Zero-Knowledge Elevpersonvern • Fysisk offline-først**

Dette er en åpen kildekode-modul for å opprette, gjennomføre og kontrollere heldagsprøver og tentamener i **Safe Exam Browser (SEB)**. 

Modulen kan **brukes helt fritt av alle skoler, kommuner, fylkeskommuner og IT-avdelinger** til akkurat det man vil. IT-avdelinger som ønsker full suverenitet kan også drifte og bygge hele løsningen på sine egne lokale servere eller i eget skymiljø.

GitHub Repository: [https://github.com/voxcuriosa/seb](https://github.com/voxcuriosa/seb)

---

## Nøkkelfunksjoner for IT og personvern

Modulen leveres som åpen kildekode under MIT-lisens («as is», uten garantier). Løsningen kan brukes som den er, revideres eller modifiseres fritt av skoler, kommuner og IT-avdelinger etter egne behov. Følgende tekniske prinsipper og mekanismer er bygget inn i arkitekturen:

1. **Elevarbeid forlater ALDRI nettleseren (Ordinær skriveprøve):**
   - Det eleven skriver under prøven overføres **aldri** over internett til noen server eller skytjeneste.
   - All tekst pakkes og formateres som en PDF lokalt i elevens nettleserminne (`pdf-lib`) ved levering.
   - **Krasjsikring og lokal sletting:** Under prøven mellomlagres teksten fortløpende lokalt (`localStorage` og `IndexedDB`) slik at eleven ikke mister arbeid ved strømbrudd eller maskinkrasj. Ved normal innlevering og avslutning tømmes utkastet automatisk fra nettleseren. Ved en unormal avslutning (f.eks. tomt batteri) forblir dataene liggende lokalt på enheten inntil eleven fortsetter eller utkastet tømmes.
   - **Kryptografisk signering:** Ved innlevering overføres kun to tekniske verdier til Cloud Function `signSebSubmission` (dersom eleven har nett): `{ examId, sha256 }`. Dette er en matematisk kontrollsum (SHA-256) for integritetskontroll som signeres sammen med serverens eget klokkeslett (`signedAt`) med Ed25519 uten å lagre opplysninger om besvarelsen (kun en midlertidig, enveis HMAC-hashet DoS-teller i `rateLimits` med 2 timers levetid oppdateres for å beskytte endepunktet mot misbruk). I Fane 2 vises det serversignerte klokkeslettet direkte for læreren. Det overføres ingen elevtekst, oppgaveløsning eller elevnavn. Dersom eleven er offline, fullføres innleveringen likevel lokalt uten signatur.
2. **Skille mellom skriveprøve og Microsoft Forms:**
   - **Skriveprøve (Curiosa editor):** Elevarbeidet forblir lokalt, og ingen data lagres eksternt.
   - **Microsoft Forms-prøver:** Når læreren velger Forms-modus, fungerer Safe Exam Browser som en sikker, nedlåst nettleser mot skolens egen Microsoft 365- og Feide-leietaker. Besvarelsen leveres direkte til Microsoft Forms i henhold til skoleeiers eksisterende databehandleravtale (DPA) med Microsoft.
3. **Fane 2 (Valgfri kontroll av PDF-er) er utformet for lokal behandling:**
   - Elevenes PDF-er kan leses og vurderes direkte i Teams uten å bruke Fane 2. Dersom læreren ønsker å kontrollere sjekksum og signatur i Fane 2, behandles filene utelukkende lokalt i nettleseren.
   - Verifisering av manipulasjon (SHA-256 og fulltekst-rekonstruksjon) foregår lokalt i nettleserens RAM.
   - Kildekoden inneholder ingen nettverkskall mot eksterne servere, og dette kontrolleres automatisk før hver produksjonsbygging av en statisk personvernvakt (`scripts/privacy-guard.mjs`).
4. **Ingen innlogging, ingen elevkontoer og null elevsporing:**
   - Elevene trenger ingen brukerkonto, e-post eller passord for å ta prøven.
   - Elevsidene (`/start/*`, `/exam/*`, `/quit`) har 0 % sporing, ingen informasjonskapsler for sporing og ingen besøksstatistikk. Kun lærersiden (`/seb/`) benytter enkel besøksstatistikk for å kunne tilby bedre tjenester til lærere.
5. **Ingen Kunstig Intelligens (KI):**
   - Ingen elevbesvarelser sendes til noen eksterne språkmodeller eller KI-leverandører.
6. **Auto-sletting etter 90 dager og skyinfrastruktur (EU `europe-west1`):**
   - Tilgang til både oppgavetekst (`firestore.rules`) og oppgave-PDF (`storage.rules`) sperres automatisk i samme sekund som `expiresAt` utløper etter 90 dager.
   - Lærerens oppgavedefinisjon slettes fysisk via Firestore TTL (`expiresAt` i `sebExams`), og eventuelle oppgave-PDF-er slettes automatisk fra Cloud Storage via triggerfunksjonen `cleanupExamStorage` når Firestore-dokumentet slettes (i tillegg til bøttens GCS-livssyklusregel).
   - Underliggende skyinfrastruktur hos Google Cloud (`europe-west1`) har standard tekniske driftslogger (30 dagers oppbevaring) ved nettverkskall for nedlasting av oppgave og signering. Skoleeiere som ønsker å drifte løsningen uten ekstern skyinfrastruktur, kan bygge og kjøre hele løsningen på egne servere.

---

## Lokal kjøring og egen hosting for IT-avdelinger

Hvis en kommune eller fylkeskommune ønsker å kjøre løsningen på eget intranett eller egen server:

```bash
# 1. Klon kildekoden
git clone https://github.com/voxcuriosa/seb.git
cd seb

# 2. Installer avhengigheter
npm install

# 3. Bygg produksjonsversjon
npm run build

# Innholdet i dist/ kan serveres fra enhver standard webserver (Apache, Nginx, Caddy, Node.js).
```

### Viktig for fylkeskommuner og kommuner ved bruk av Feide-pålogging (Clarify og Microsoft Forms)

Når elever logger inn med Feide i **Clarify Ordbøker** eller **Microsoft Forms** inne i Safe Exam Browser, videresender Feide (`idp.feide.no`) eleven til skoleeiers egen identitetstjener (ADFS eller Microsoft Entra ID SSO). Fordi SEB har et strengt URL-filter aktivert under prøven, må skoleeiers påloggingsdomener være hvitelistet i `src/utils/seb/formsAuthList.js`.

Følgende domener er allerede lagt inn som standard i `src/utils/seb/formsAuthList.js`:
- **Microsoft Entra ID / Azure AD SSO:** `login.microsoftonline.com/*`, `*.msauth.net/*`, `*.msftauth.net/*`, `*.msidentity.com/*`, `*.microsoftazuread-sso.com/*`, `autologon.microsoftazuread-sso.com/*`, `login.windows.net/*`, `sts.windows.net/*`
- **Feide og Sikt:** `feide.no/*`, `idp.feide.no/*`, `dataporten.no/*`, `sikt.no/*`
- **Fylkeskommunale og kommunale Feide-domener:** `*.telemarkfylke.no/*`, `*.vestfoldfylke.no/*`, `*.vfk.no/*`, `*.afk.no/*`, `*.agderfk.no/*`, `*.bfk.no/*`, `*.ofk.no/*`, `*.innlandetfylke.no/*`, `*.rogfk.no/*`, `*.vlfk.no/*`, `*.mrfylke.no/*`, `*.trondelagfylke.no/*`, `*.nfk.no/*`, `*.tffk.no/*`, `*.ffk.no/*`, `*.osloskolen.no/*`, `*.ude.oslo.kommune.no/*`

**Sjekkpunkt for IT-avdelinger og lærere i andre kommuner eller fylker:**
- Dersom deres skoleeier bruker et eget lokalt domene for Feide-innlogging (f.eks. `adfs.dinkommune.no` eller `feide.dittfylke.no`) som ikke står på listen over, vil SEB vise en melding om at adressen er blokkert under pålogging. Læreren kan da legge til domenet direkte under **«Legg til egne nettsider»** i steg 2 ved opprettelse av prøven, eller IT-avdelingen kan legge det fast inn i `src/utils/seb/formsAuthList.js`.
- Ved pålogging i SEB skal elevene velge **«Bruk passordet mitt / Use my password»** (og godkjenne i **Microsoft Authenticator** på mobil dersom tofaktor er påkrevd), ettersom SEB av sikkerhetsgrunner blokkerer lokale OS-dialoger for Windows Hello og Touch ID (ansikt/fingeravtrykk/lokal PIN).

---

## Lisens og krav om kreditering

Løsningen er utviklet av **Christian Borchgrevink-Vigeland / VoxCuriosa** og lisensiert under [MIT-lisens med krav om kreditering](LICENSE).

Koden kan fritt brukes, modifiseres og driftes av skoler, kommuner, fylkeskommuner og andre uten vederlag, forutsatt at opphavspersonen krediteres tydelig i kildekoden og synlig i brukergrensesnittet:

> **Utviklet av Christian Borchgrevink-Vigeland / VoxCuriosa ([voxcuriosa.no](https://voxcuriosa.no))**
