# VoxCuriosa SEB – Safe Exam Browser Prøvemodul

**Åpen kildekode (MIT-lisens med krav om synlig kreditering) • Lokal behandling av elevarbeid • Fysisk offline-først**

Dette er en åpen kildekode-modul for å opprette, gjennomføre og kontrollere heldagsprøver og tentamener i **Safe Exam Browser (SEB)**.

Modulen kan **brukes fritt av skoler, kommuner, fylkeskommuner og IT-avdelinger** mot synlig kreditering av opphavspersonen (se [LICENSE](LICENSE)). IT-avdelinger som ønsker full suverenitet eller egen databehandleravtale for all infrastruktur kan drifte og bygge hele løsningen (både frontend og backend) på egne servere eller i eget skymiljø.

GitHub Repository: [https://github.com/voxcuriosa/seb](https://github.com/voxcuriosa/seb)

---

## Nøkkelfunksjoner for IT og personvern

Modulen leveres som åpen kildekode under [MIT-lisens med krav om kreditering](LICENSE) («as is», uten garantier). Løsningen kan brukes som den er, revideres eller modifiseres av skoler, kommuner og IT-avdelinger etter egne behov. Følgende tekniske prinsipper og mekanismer er bygget inn i arkitekturen:

1. **Elevarbeid forlater ALDRI nettleseren (Ordinær skriveprøve):**
   - Det eleven skriver under den ordinære skriveprøven overføres **aldri** over internett til noen server eller skytjeneste.
   - All tekst pakkes og formateres som en PDF lokalt i elevens nettleserminne (`pdf-lib`) ved levering.
   - **Dobbel nettverkssikring (både statisk og ved kjøring):**
     - **Statisk vakt (`scripts/privacy-guard.mjs`):** Verifiserer automatisk i `npm test`, pre-commit og CI at prøverommet og Fane 2 aldri importerer rå nettverks-API-er eller sender annet enn `{ examId, sha256 }` til signering.
     - **Aktiv, rutelåst runtime-brannmur (`src/utils/runtimeNetworkFirewall.js`) og `Content-Security-Policy`:** Overvåker `window.fetch`, `XMLHttpRequest` og `navigator.sendBeacon` direkte i nettleseren under kjøring, og fryser rutesjekken ved innlasting av `/exam/*` slik at `history.replaceState` aldri kan skru av vernet. I prøverommet avvises enhver utgående forespørsel (utenfor ren Firestore-lesing) som overstiger 512 byte eller inneholder andre nøkler enn `{ examId }` (henting av oppgaveinnhold i SEB) eller `{ examId, sha256 }` (signering ved levering). Under PDF-kontroll i Fane 2 (`withZeroNetworkFirewall`) er alle nettverkskall totalblokkert ved kjøring.
   - **Krasjsikring, låne-PC-beskyttelse, umiddelbar sletting og 12-timers utløp:**
     - Under prøven mellomlagres teksten lokalt (`localStorage` og `IndexedDB`) knyttet til et økt-token i `sessionStorage` (`seb_active_session_${examId}`).
     - **Beskyttelse av delte låne-PC-er:** Dersom SEB eller maskinen har vært lukket eller startet på nytt (slik at `sessionStorage` ikke har samme økt-token), fylles et eldre utkast på disken **aldri** automatisk inn i editoren. Editoren holdes tom mens et tydelig banner (`RestoreBanner.jsx`) lar eleven velge mellom «Gjenopprett utkastet mitt» (ved strømbrudd) eller «Nei, start ny tom besvarelse» (som kaller `clearDraft` så neste elev starter med blanke ark). I tillegg setter `.seb`-profilen `examSessionClearCookiesOnStart = true` på alle prøver.
     - Ved fullført PDF-eksport stoppes autolagring umiddelbart, og ved avslutning (`/quit`) tømmes alle lokale utkast (`clearDraft` og `clearAllDrafts`). Uavsluttede utkast eldre enn 12 timer slettes automatisk ved oppstart (`purgeExpiredDrafts` i `src/utils/exam/localStore.js`).
   - **Kryptografisk salting (`nonce`) og signering uten datalekkasje:**
     - Før `sha256` beregnes lokalt på elevens maskin, legges et kryptografisk tilfeldig 128-bits salt (`nonce`, 32 hex-tegn generert med `crypto.getRandomValues`) inn i PDF-ens lokale payload (`src/utils/exam/essayPdfGenerator.js` og `src/utils/integrity/payloadHash.js`). Fordi `nonce` kun ligger inne i den lokale PDF-filen på elevens maskin og **aldri** sendes til serveren, er `sha256` et kryptografisk skjult commitment som ikke kan brukes til å gjette eller brute-force korte besvarelser.
     - Ved innlevering overføres kun `{ examId, sha256 }` til Cloud Function `signSebSubmission` (kun fra SEB-klient dersom eleven har nett). Serveren signerer `CURIOSA_SEB_SIG_V1|examId|sha256|signedAt` med Ed25519 og returnerer signaturen og serverens uforfalskelige klokkeslett (`signedAt`). Offentlig verifikasjonsnøkkel ligger i `src/utils/integrity/publicKey.js`.

2. **Beskyttet oppgavetekst, avslutningsfrase (12+ tegn) og nedlåsing av SEB:**
   - **Skjult oppgavetekst og Forms-URL før SEB åpnes:** Offentlige prøve-dokumenter i `sebExams/{examId}` (`schemaVersion: 2`) inneholder kun tittel og SEB-innstillinger til startsiden `/start/:examId`. Selve oppgaveteksten, PDF-stien og eventuell Microsoft Forms-lenke lagres adskilt i `sebExamContent/{examId}` og utleveres kun via Cloud Function `getSebExamContent` når klienten kjører i Safe Exam Browser.
   - **Ordinære skriveprøver trenger ikke avslutningspassord:** Når feltet for avslutningspassord står tomt, setter `.seb`-generatoren `allowQuit = false`, `ignoreExitKeys = true` og `showQuitButton = false` (`src/utils/seb/sebConfigGenerator.js`). Da er `Cmd+Q` og `Ctrl+Q` helt deaktivert, og eleven kan **kun** avslutte SEB ved å fullføre prøven, laste ned PDF-en og bekrefte levering.
   - **Høy-entropi kodefrase (minst 12 tegn med bokstaver) når passord brukes:** Safe Exam Browsers `.seb`-standard krever at `<key>hashedQuitPassword</key>` er en usaltet SHA-256-hash i konfigurasjonen. Løsningen krever derfor minst 12 tegn med bokstaver (avviser korte passord og rene tallkoder både i klient og server), verifiserer koden kryptografisk også i `FormsExitDialog.jsx`, og har innebygd generator (`QuitPasswordField.jsx`) som lager en tilfeldig fire-ords frase med sekssifret tall.

3. **Skille mellom skriveprøve og Microsoft Forms:**
   - **Skriveprøve (Curiosa editor):** Elevarbeidet forblir lokalt i nettleseren, og ingen elevtekst lagres eksternt.
   - **Microsoft Forms-prøver:** Når læreren velger Forms-modus (valideres strengt på vertsnavn mot `forms.office.com`, `forms.microsoft.com` og `forms.cloud.microsoft` i `functions/src/validate.js`), åpner `.seb`-filen alltid prøverommet i SEB først før videresending eller visning i ressurspanelet. Besvarelsen leveres direkte til Microsoft Forms under skoleeiers eksisterende databehandleravtale med Microsoft.

4. **Fane 2 (Valgfri kontroll av PDF-er) kjører 100 % lokalt:**
   - Elevenes PDF-er kan leses og vurderes direkte i Teams uten å bruke Fane 2. Dersom læreren ønsker å kontrollere sjekksum, hendelseslogg, PDF-struktur og Ed25519-signatur i Fane 2, behandles filene utelukkende lokalt i nettleseren via Mozilla `pdf.js` og `pdf-lib`.
   - Både statisk kodeanalyse (`scripts/privacy-guard.mjs`), empiriske nettverkstester (`src/test/fane2NetworkAudit.test.js`) og runtime-brannmuren (`withZeroNetworkFirewall`) sikrer at 0 nettverkskall utføres.

5. **Ingen innlogging, ingen elevkontoer, PIN kun i minne og null elevsporing:**
   - Elevene trenger ingen brukerkonto, e-post eller passord for å ta skriveprøver, og lærerens PIN-kode holdes utelukkende i modul-minnet i aktiv fane (aldri i `localStorage` eller `sessionStorage`).
   - Elevsidene (`/start/*`, `/exam/*`, `/quit`) har 0 % sporing, ingen informasjonskapsler for sporing og ingen besøksstatistikk, og startsiden gir tydelig personverninformasjon etter GDPR art. 13. Kun lærersiden (`/seb/`) benytter enkel besøksstatistikk.

6. **Server-sletting av prøver (GDPR art. 17), auto-sletting etter 90 dager og DoS-vern (EU `europe-west1`):**
   - **Umiddelbar sletting på server:** Læreren kan slette opprettede prøver umiddelbart fra «Mine prøver» (`deleteSebExam`), som sletter både `sebExams/{examId}`, `sebExamContent/{examId}` og eventuell oppgave-PDF i Cloud Storage ved hjelp av prøvens kryptografiske `deleteToken` eller lærer-PIN.
   - **Automatisk utløp og fysisk sletting etter 90 dager:** Tilgang til prøveoppsett (`firestore.rules`) og oppgave-PDF (`storage.rules`) sperres i samme sekund som `expiresAt` utløper. Dokumentene slettes fysisk via Firestore TTL (`expiresAt` konfigurert i `firestore.indexes.json` for `sebExams`, `sebExamContent` og `rateLimits`), og oppgave-PDF-er slettes både via triggeren `cleanupExamStorage` og bøttens livssyklusregel (`storage-lifecycle.json`).
   - **Herdet DoS- og PIN-beskyttelse (`functions/src/rateLimit.js`):** Klient-IP leses fra pålitelig posisjon bak Google Cloud Run / GFE, normaliseres (inkl. IPv6 `/64`-prefiks) og hashes enveis med HKDF. Tellerdokumentene i `rateLimits` bruker sharding på signeringsendepunktet og slettes automatisk via Firestore TTL etter 2–24 timer.

7. **Behandlingsansvar og databehandleravtale (Hostet `voxcuriosa.no/seb` kontra egenhosting):**
   - Skolen eller skoleeier (kommune, fylkeskommune eller privatskole) er behandlingsansvarlig for prøvene de gjennomfører.
   - Ved bruk av den åpent hostede løsningen på `voxcuriosa.no/seb` lagres ingen elevbesvarelser i skyen, kun lærerens prøveoppsett i EU (`europe-west1`), mens elevens enhet utfører kortvarige tekniske nettverkskall (nedlasting av oppgave og signering av SHA-256-hash) mot Google Cloud i EØS (der underliggende infrastruktur har standard 30 dagers driftslogger).
   - Dersom skoleeiers personvernombud eller interne retningslinjer krever en direkte databehandleravtale (GDPR art. 28) også for teknisk tilkoblingsinfrastruktur og lagring av prøveoppsett, skal kommunen eller fylkeskommunen benytte **egenhosting** på egne servere eller i eget GCP/Firebase-miljø under egen avtale.

---

## Lokal kjøring og egen hosting for IT-avdelinger (Frontend og Backend)

Hvis en kommune eller fylkeskommune ønsker å kjøre hele løsningen i eget miljø, består arkitekturen av to deler:
1. **Frontend (`src/` -> `dist/`):** Statisk React-applikasjon med sikkerhetsheadere og CSP i `public/.htaccess` (kan serveres fra enhver intern webserver som Nginx, Apache, Caddy eller IIS).
2. **Backend (`functions/`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`, `storage-lifecycle.json`):** Tilstandsløse Cloud Functions i `europe-west1` (`createSebExam`, `getSebExamContent`, `deleteSebExam`, `signSebSubmission` og `cleanupExamStorage`). Kan kjøres i kommunens eget GCP/Firebase-prosjekt eller erstattes av tilsvarende interne endepunkter på kommunens egen server ved å peke om `src/firebase.js`.

```bash
# 1. Klon kildekoden og installer avhengigheter
git clone https://github.com/voxcuriosa/seb.git
cd seb
npm install
npm --prefix functions install

# 2. Kjør alle sikkerhets-, personvern- og enhetstester lokalt
npm test

# 3. Generer eget Ed25519-nøkkelpar for signering (ved egen drift)
openssl genpkey -algorithm ED25519 -out seb_signing_private.pem
openssl pkey -in seb_signing_private.pem -pubout -out seb_signing_public.pem
# Legg offentlig nøkkel inn i src/utils/integrity/publicKey.js, og privat nøkkel + lærer-PIN i Secret Manager:
# firebase functions:secrets:set SEB_SIGNING_KEY < seb_signing_private.pem
# firebase functions:secrets:set SEB_TEACHER_PIN

# 4. Deploy backend-regler, TTL-indekser og funksjoner til eget prosjekt (europe-west1),
#    og aktiver livssyklusregel (91 dager) på Storage-bøtten:
npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage,functions
gcloud storage buckets update gs://<ditt-prosjekt>-storage --lifecycle-file=storage-lifecycle.json

# 5. Bygg produksjonsversjon av frontend
npm run build
# Innholdet i dist/ kan nå serveres fra kommunens egen webserver (Apache, Nginx, Caddy, IIS).
```

### Viktig for fylkeskommuner og kommuner ved bruk av Feide-pålogging (Clarify og Microsoft Forms)

Når elever logger inn med Feide i **Clarify Ordbøker** eller **Microsoft Forms** inne i Safe Exam Browser, videresender Feide (`idp.feide.no`) eleven til skoleeiers egen identitetstjener (ADFS eller Microsoft Entra ID SSO). Disse reglene legges **kun** til i `.seb`-filen når læreren faktisk har valgt Microsoft Forms eller Clarify på prøven (`src/utils/seb/sebPlistParts.js`).

For å hindre at elever får tilgang til åpne informasjonssider på fylkeskommunens hoveddomene (som `www.telemarkfylke.no`), hvitelister `src/utils/seb/formsAuthList.js` kun de faktiske påloggings- og SSO-subdomenene:
- **Microsoft Entra ID og Azure AD SSO:** `login.microsoftonline.com/*`, `*.msauth.net/*`, `*.msftauth.net/*`, `*.msidentity.com/*`, `*.microsoftazuread-sso.com/*`, `autologon.microsoftazuread-sso.com/*`, `login.windows.net/*`, `sts.windows.net/*`
- **Feide:** `feide.no/*`, `idp.feide.no/*`, `dataporten.no/*`, `auth.dataporten.no/*`
- **Fylkeskommunale og kommunale SSO-subdomener:** Kun `adfs.<domene>/*`, `sts.<domene>/*`, `feide.<domene>/*`, `idp.<domene>/*`, `login.<domene>/*`, `sso.<domene>/*`, `auth.<domene>/*` og `fs.<domene>/*` for norske fylkeskommuner og kommuner (`telemarkfylke.no`, `vestfoldfylke.no`, `vfk.no`, `afk.no`, `agderfk.no`, `bfk.no`, `ofk.no`, `innlandetfylke.no`, `rogfk.no`, `vlfk.no`, `mrfylke.no`, `trondelagfylke.no`, `nfk.no`, `tffk.no`, `ffk.no`, `osloskolen.no`, `ude.oslo.kommune.no`).

**Sjekkpunkt for IT-avdelinger og lærere i andre kommuner eller fylker:**
- Dersom deres skoleeier bruker et annet lokalt subdomene for Feide-innlogging, kan læreren legge til påloggingsadressen direkte under **«Legg til egne nettsider»** i steg 2 ved opprettelse av prøven, eller IT-avdelingen kan legge det fast inn i `src/utils/seb/formsAuthList.js`.
- Ved pålogging i SEB skal elevene velge **«Bruk passordet mitt / Use my password»** (og godkjenne i **Microsoft Authenticator** på mobil dersom tofaktor er påkrevd), ettersom SEB av sikkerhetsgrunner blokkerer lokale OS-dialoger for Windows Hello og Touch ID.

---

## Lisens og krav om kreditering

Løsningen er utviklet av **Christian Borchgrevink-Vigeland / VoxCuriosa** og lisensiert under [MIT-lisens med krav om synlig kreditering](LICENSE).

Koden kan fritt brukes, modifiseres og driftes av skoler, kommuner, fylkeskommuner og andre uten vederlag, forutsatt at opphavspersonen krediteres tydelig i kildekoden og synlig i brukergrensesnittet (også ved intern drift på egne servere):

> **Utviklet av Christian Borchgrevink-Vigeland / VoxCuriosa ([voxcuriosa.no](https://voxcuriosa.no))**
