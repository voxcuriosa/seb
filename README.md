# VoxCuriosa SEB – Safe Exam Browser Prøvemodul

**Åpen kildekode (MIT-lisens med krav om synlig kreditering) • Lokal behandling av elevarbeid • Fysisk offline-først**

Dette er en åpen kildekode-modul for å opprette, gjennomføre og kontrollere heldagsprøver og tentamener i **Safe Exam Browser (SEB)**.

Modulen kan **brukes fritt av skoler, kommuner, fylkeskommuner og IT-avdelinger** mot synlig kreditering av opphavspersonen (se [LICENSE](LICENSE)). IT-avdelinger som ønsker full suverenitet kan også drifte og bygge hele løsningen (både frontend og backend) på egne lokale servere eller i eget skymiljø.

GitHub Repository: [https://github.com/voxcuriosa/seb](https://github.com/voxcuriosa/seb)

---

## Nøkkelfunksjoner for IT og personvern

Modulen leveres som åpen kildekode under [MIT-lisens med krav om kreditering](LICENSE) («as is», uten garantier). Løsningen kan brukes som den er, revideres eller modifiseres av skoler, kommuner og IT-avdelinger etter egne behov. Følgende tekniske prinsipper og mekanismer er bygget inn i arkitekturen:

1. **Elevarbeid forlater ALDRI nettleseren (Ordinær skriveprøve):**
   - Det eleven skriver under den ordinære skriveprøven overføres **aldri** over internett til noen server eller skytjeneste.
   - All tekst pakkes og formateres som en PDF lokalt i elevens nettleserminne (`pdf-lib`) ved levering.
   - **Dobbel nettverkssikring (både statisk og ved kjøring):**
     - **Statisk vakt (`scripts/privacy-guard.mjs`):** Verifiserer automatisk i `npm test`, pre-commit og CI at prøverommet og Fane 2 aldri importerer rå nettverks-API-er eller sender annet enn `{ examId, sha256 }` til signering.
     - **Aktiv runtime-brannmur (`src/utils/runtimeNetworkFirewall.js`) + `Content-Security-Policy`:** Overvåker `window.fetch`, `XMLHttpRequest` og `navigator.sendBeacon` direkte i nettleseren under kjøring. I prøverommet (`/exam/*`) avvises enhver utgående forespørsel til signeringsendepunktet som overstiger 512 byte eller inneholder andre nøkler enn `{ examId, sha256 }`. Under PDF-kontroll i Fane 2 (`withZeroNetworkFirewall`) er alle nettverkskall totalblokkert ved kjøring.
   - **Krasjsikring, umiddelbar sletting ved levering og 12-timers automatisk utløp:** Under prøven mellomlagres teksten fortløpende lokalt (`localStorage` og `IndexedDB`) slik at eleven ikke mister arbeid ved strømbrudd eller maskinkrasj. Ved normal innlevering og på avslutningssiden (`/quit`) tømmes alle lokale utkast umiddelbart (`clearDraft` / `clearAllDrafts`). Dersom en prøve avbrytes unormalt uten å nå `/quit`, sørger `purgeExpiredDrafts()` (`DRAFT_MAX_AGE_MS = 12 timer` i `src/utils/exam/localStore.js`) for at gamle utkast uansett slettes automatisk ved neste oppstart på delte skole-PC-er.
   - **Kryptografisk salting (`nonce`) og signering uten datalekkasje:**
     - Før `sha256` beregnes lokalt på elevens maskin, legges et kryptografisk tilfeldig 128-bits salt (`nonce`, 32 hex-tegn generert med `crypto.getRandomValues`) inn i PDF-ens lokale payload (`src/utils/exam/essayPdfGenerator.js` og `src/utils/integrity/payloadHash.js`). Fordi `nonce` kun ligger inne i den lokale PDF-filen på elevens maskin og **aldri** sendes til serveren, er `sha256` et kryptografisk skjult commitment som ikke kan brukes til å gjette eller brute-force korte besvarelser.
     - Ved innlevering overføres kun `{ examId, sha256 }` til Cloud Function `signSebSubmission` (dersom eleven har nett). Serveren signerer `CURIOSA_SEB_SIG_V1|examId|sha256|signedAt` med Ed25519 og returnerer signaturen og serverens uforfalskelige klokkeslett (`signedAt`).
     - **Hva signaturen beviser:** Signaturen beviser at en besvarelse med nøyaktig denne sjekksummen og den innebygde SEB-konfigurasjonsnøkkelen (`sebConfigKey`) forelå ved tidspunktet `signedAt`, og at verken tekst, ordtelling, hendelseslogg eller synlig PDF-innhold er endret i etterkant. Identiteten til eleven knyttes ved at eleven selv leverer PDF-filen på sin egen konto i Microsoft Teams / LMS før eleven forlater klasserommet. Dersom eleven er offline ved levering, fullføres PDF-eksporten lokalt uten serversignatur (merkes «Verifisert, ikke signert»).

2. **Avslutningspassord og nedlåsing av SEB:**
   - **Ordinære skriveprøver trenger ikke avslutningspassord:** Når feltet for avslutningspassord står tomt, setter `.seb`-generatoren `allowQuit = false`, `ignoreExitKeys = true` og `showQuitButton = false` (`src/utils/seb/sebConfigGenerator.js`). Da er `Cmd+Q` / `Ctrl+Q` helt deaktivert, og eleven kan **kun** avslutte SEB ved å fullføre prøven, laste ned PDF-en og bekrefte levering (som navigerer til `quitURL`).
   - **Høy-entropi kodefrase når passord brukes (f.eks. ved Microsoft Forms):** Safe Exam Browsers `.seb`-standard krever at `<key>hashedQuitPassword</key>` er en usaltet SHA-256-hash i konfigurasjonen. For at elever ikke skal kunne knekke korte tallkoder fra `.seb`-filen eller prøvedokumentet, avviser løsningen rene tallkoder og passord under 8 tegn, og den innebygde generatoren (`QuitPasswordField.jsx`) lager en tilfeldig tre-ords frase med firesifret tall (f.eks. `fjord-storm-tind-4829`).

3. **Skille mellom skriveprøve og Microsoft Forms:**
   - **Skriveprøve (Curiosa editor):** Elevarbeidet forblir lokalt i nettleseren, og ingen elevtekst lagres eksternt.
   - **Microsoft Forms-prøver:** Når læreren velger Forms-modus (valideres strengt på vertsnavn mot `forms.office.com`, `forms.microsoft.com` og `forms.cloud.microsoft` i `functions/src/validate.js`), fungerer Safe Exam Browser som en nedlåst nettleser mot skolens egen Microsoft 365- og Feide-leietaker. Besvarelsen leveres direkte til Microsoft Forms under skoleeiers eksisterende databehandleravtale med Microsoft.

4. **Fane 2 (Valgfri kontroll av PDF-er) kjører 100 % lokalt:**
   - Elevenes PDF-er kan leses og vurderes direkte i Teams uten å bruke Fane 2. Dersom læreren ønsker å kontrollere sjekksum, hendelseslogg og Ed25519-signatur i Fane 2, behandles filene utelukkende lokalt i nettleseren via Mozilla `pdf.js` og `pdf-lib`.
   - Både statisk kodeanalyse (`scripts/privacy-guard.mjs`), empiriske nettverkstester (`src/test/fane2NetworkAudit.test.js`) og runtime-brannmuren (`withZeroNetworkFirewall`) sikrer at 0 nettverkskall utføres.

5. **Ingen innlogging, ingen elevkontoer og null elevsporing:**
   - Elevene trenger ingen brukerkonto, e-post eller passord for å ta skriveprøver.
   - Elevsidene (`/start/*`, `/exam/*`, `/quit`) har 0 % sporing, ingen informasjonskapsler for sporing og ingen besøksstatistikk. Kun lærersiden (`/seb/`) benytter enkel besøksstatistikk for å kunne tilby bedre tjenester til lærere.

6. **Auto-sletting etter 90 dager, DoS-vern og skyinfrastruktur (EU `europe-west1`):**
   - Tilgang til både oppgavetekst (`firestore.rules`) og oppgave-PDF (`storage.rules`) sperres automatisk i samme sekund som `expiresAt` utløper etter 90 dager.
   - Lærerens oppgavedefinisjon slettes fysisk via Firestore TTL (`expiresAt` i `sebExams`), og eventuelle oppgave-PDF-er slettes automatisk fra Cloud Storage via triggerfunksjonen `cleanupExamStorage` når Firestore-dokumentet slettes (i tillegg til bøttens GCS-livssyklusregel).
   - **Herdet DoS- og PIN-beskyttelse (`functions/src/rateLimit.js`):** Klient-IP leses fra Google Front Ends pålitelige posisjon (`x-appengine-user-ip` eller siste oppføring i `x-forwarded-for`, slik at falske `X-Forwarded-For`-headere fra klient ignoreres) og hashes enveis med en HKDF-avledet, domeneseparert nøkkel. PIN-forsøk telles atomisk *før* sammenligning (maks 5 forsøk per 15 min) og nullstilles ved gyldig PIN for å forhindre parallelle gjetteangrep. Signeringsendepunktet bruker 10-delt sharding (`shards: 10`) i `rateLimits` slik at en hel skoleklasse (30+ elever bak samme offentlige skole-IP) kan levere i nøyaktig samme sekund uten Firestore-transaksjonskø. Tellerdokumentene i `rateLimits` slettes automatisk via Firestore TTL etter 2–24 timer.
   - Underliggende skyinfrastruktur hos Google Cloud (`europe-west1`) har standard tekniske driftslogger (30 dagers oppbevaring) ved nettverkskall for nedlasting av oppgave og signering. Skoleeiere som ønsker å drifte løsningen uten ekstern skyinfrastruktur, kan bygge og kjøre hele løsningen på egne servere.

---

## Lokal kjøring og egen hosting for IT-avdelinger (Frontend + Backend)

Hvis en kommune eller fylkeskommune ønsker å kjøre hele løsningen i eget miljø, består arkitekturen av to deler:
1. **Frontend (`src/` -> `dist/`):** Statisk React-applikasjon (kan serveres fra enhver intern webserver som Nginx, Apache, Caddy eller IIS).
2. **Backend (`functions/`, `firestore.rules`, `storage.rules`):** Tre små, tilstandsløse endepunkter for å lagre lærerens oppgavetekst (90 dagers TTL) og signere SHA-256-hash ved levering. Kan enten kjøres i kommunens eget GCP/Firebase-prosjekt (`europe-west1`) eller erstattes av to interne REST-endepunkter (`POST /api/exams`, `GET /api/exams/:id`, `POST /api/sign`) på kommunens egen server ved å peke om `src/firebase.js`.

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
# Legg offentlig nøkkel inn i src/utils/integrity/signature.js, og privat nøkkel + lærer-PIN i Secret Manager:
# firebase functions:secrets:set SEB_SIGNING_KEY < seb_signing_private.pem
# firebase functions:secrets:set SEB_TEACHER_PIN

# 4. Deploy backend-regler og funksjoner til eget prosjekt (europe-west1)
npx firebase-tools deploy --only firestore:rules,storage,functions

# 5. Bygg produksjonsversjon av frontend
npm run build
# Innholdet i dist/ kan nå serveres fra kommunens egen webserver (Apache, Nginx, Caddy, IIS).
```

### Viktig for fylkeskommuner og kommuner ved bruk av Feide-pålogging (Clarify og Microsoft Forms)

Når elever logger inn med Feide i **Clarify Ordbøker** eller **Microsoft Forms** inne i Safe Exam Browser, videresender Feide (`idp.feide.no`) eleven til skoleeiers egen identitetstjener (ADFS eller Microsoft Entra ID SSO). Disse reglene legges **kun** til i `.seb`-filen når læreren faktisk har valgt Microsoft Forms eller Clarify på prøven (`src/utils/seb/sebPlistParts.js`).

For å hindre at elever får tilgang til åpne informasjonssider på fylkeskommunens hoveddomene (som `www.telemarkfylke.no`), hvitelister `src/utils/seb/formsAuthList.js` kun de faktiske påloggings- og SSO-subdomenene:
- **Microsoft Entra ID / Azure AD SSO:** `login.microsoftonline.com/*`, `*.msauth.net/*`, `*.msftauth.net/*`, `*.msidentity.com/*`, `*.microsoftazuread-sso.com/*`, `autologon.microsoftazuread-sso.com/*`, `login.windows.net/*`, `sts.windows.net/*`
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
