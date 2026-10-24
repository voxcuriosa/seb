# VoxCuriosa SEB – Safe Exam Browser Prøvemodul

**100 % Open Source (MIT-lisens) • Zero-Knowledge Elevpersonvern • Fysisk offline-først**

Dette er en åpen kildekode-modul for å opprette, gjennomføre og kontrollere heldagsprøver og tentamener i **Safe Exam Browser (SEB)**. 

Modulen kan **brukes helt fritt av alle skoler, kommuner, fylkeskommuner og IT-avdelinger** til akkurat det man vil. IT-avdelinger som ønsker full suverenitet kan også drifte og bygge hele løsningen på sine egne lokale servere eller i eget skymiljø.

GitHub Repository: [https://github.com/voxcuriosa/seb](https://github.com/voxcuriosa/seb)

---

## Nøkkelfunksjoner og garantier for IT og personvern

1. **Elevarbeid forlater ALDRI nettleseren:**
   - Det eleven skriver under prøven overføres **aldri** over internett til noen server eller skytjeneste.
   - All tekst pakkes og formateres som en PDF lokalt i elevens nettleserminne (`pdf-lib`) ved levering.
   - Når PDF-en er lastet ned til elevens maskin og nettleserøkten lukkes, forsvinner dataene fra nettleseren.
2. **Fane 2 (Kontroll av PDF-er) har 0 nettverkskall:**
   - Når læreren slipper inn elevenes PDF-er eller hele «Student Work»-mappen fra Teams/SharePoint, foretas det **ingen nettverkskall**.
   - Verifisering av manipulasjon (SHA-256 og fulltekst-rekonstruksjon) foregår 100 % lokalt i nettleserens RAM.
   - Håndheves automatisk i kildekoden av en statisk personvernvakt (`scripts/privacy-guard.mjs`).
3. **Ingen innlogging og ingen elevkontoer:**
   - Elevene trenger ingen brukerkonto, e-post eller passord for å ta prøven.
4. **Ingen Kunstig Intelligens (KI):**
   - Ingen elevbesvarelser sendes til noen eksterne språkmodeller eller KI-leverandører.
5. **Auto-sletting etter 90 dager:**
   - Kun lærerens oppgavedefinisjon (oppgavetekst og tillatte nettsider) lagres i skyen (europe-west1), og slettes deterministisk etter 90 dager via Firestore TTL.

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

---

## Lisens og krav om kreditering

Løsningen er utviklet av **Christian Borchgrevink-Vigeland / VoxCuriosa** og lisensiert under [MIT-lisens med krav om kreditering](LICENSE).

Koden kan fritt brukes, modifiseres og driftes av skoler, kommuner, fylkeskommuner og andre uten vederlag, forutsatt at opphavspersonen krediteres tydelig i kildekoden og synlig i brukergrensesnittet:

> **Utviklet av Christian Borchgrevink-Vigeland / VoxCuriosa ([voxcuriosa.no](https://voxcuriosa.no))**
