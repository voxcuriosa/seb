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
   - Når PDF-en er lastet ned til elevens maskin og nettleserøkten lukkes, forsvinner dataene fra nettleseren.
   - **Kryptografisk signering:** Ved innlevering overføres kun to tekniske verdier til Cloud Function `signSebSubmission` (dersom eleven har nett): `{ examId, sha256 }`. Dette er en enveis matematisk kontrollsum (SHA-256) som signeres med Ed25519. Det overføres ingen elevtekst, ord eller elevnavn. Dersom eleven er offline, fullføres innleveringen likevel lokalt uten signatur.
2. **Skille mellom skriveprøve og Microsoft Forms:**
   - **Skriveprøve (Curiosa editor):** Elevarbeidet forblir lokalt, og ingen data lagres eksternt.
   - **Microsoft Forms-prøver:** Når læreren velger Forms-modus, fungerer Safe Exam Browser som en sikker, nedlåst nettleser mot skolens egen Microsoft 365- og Feide-leietaker. Besvarelsen leveres direkte til Microsoft Forms i henhold til skoleeiers eksisterende databehandleravtale (DPA) med Microsoft.
3. **Fane 2 (Kontroll av PDF-er) har 0 nettverkskall:**
   - Når læreren slipper inn elevenes PDF-er eller hele «Student Work»-mappen fra Teams/SharePoint, foretas det **ingen nettverkskall**.
   - Verifisering av manipulasjon (SHA-256 og fulltekst-rekonstruksjon) foregår 100 % lokalt i nettleserens RAM.
   - Håndheves automatisk i kildekoden av en statisk personvernvakt (`scripts/privacy-guard.mjs`).
4. **Ingen innlogging og ingen elevkontoer:**
   - Elevene trenger ingen brukerkonto, e-post eller passord for å ta prøven.
5. **Ingen Kunstig Intelligens (KI):**
   - Ingen elevbesvarelser sendes til noen eksterne språkmodeller eller KI-leverandører.
6. **Auto-sletting etter 90 dager:**
   - Kun lærerens oppgavedefinisjon (oppgavetekst og tillatte nettsider) lagres i skyen (europe-west1), og slettes automatisk etter 90 dager via Firestore TTL (Time-to-Live er aktivert på `expiresAt` i samlingen `sebExams`).

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
