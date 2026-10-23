---
name: gdpr-privacy-standards
description: Standarder for personvern, GDPR-samsvar, dataminimering og sletterutiner i Curiosa i henhold til norske skolekrav og databehandleravtaler.
---

# GDPR og Personvernstandarder for Curiosa

Når du implementerer, endrer eller tester kode som behandler elev- eller lærerdata i Curiosa, SKAL følgende standarder alltid overholdes:

### 1. Dataminimering mot KI-modeller (Zero PII to AI)
* **Ingen personopplysninger til KI:** Elevnavn, kallenavn, e-postadresser, Feide-ID-er eller skole-ID-er skal **aldri** interpoleres inn i prompter som sendes til Gemini eller andre språkmodeller.
* **Kun faginnhold:** Send utelukkende oppgavetekst, lærestoff/kildetekst og elevens anonymiserte besvarelsestekst til vurderings- og veiledningsfunksjoner.

### 2. Rett til sletting og kaskaderende sletterutiner
* **Permanent fullstendig sletting:** Når en lærer sletter en elev eller en klasse, skal alle relaterte dokumenter slettes kaskaderende via backend (`deleteStudentsCascading`):
  - `students/{studentId}`
  - `student_progress` (alle besvarelser og delresultater)
  - `fusk_log` (alle hendelses- og fokuslogger)
  - `notes` og `chats`
  - `usage_logs`
* **Ingen etterlatte data:** Data skal aldri etterlates i "halvslettet" tilstand eller forbli liggende under foreldreløse ID-er.

### 3. Automatisk datalagringstid (365 dager)
* **Automatisk opprydding:** Elever som ikke har hatt aktivitet de siste 365 dagene skal fanges opp og slettes automatisk av Cloud Scheduler-jobben `automaticDataRetentionCleanup`.
* **Korrekt tidsstempel:** Sørg for at elevens `lastActivity` eller `updatedAt`-felt alltid oppdateres ved legitim innlogging og prøveaktivitet, slik at inaktive elever identifiseres presist.

### 4. Fullstendig 1-klikks dataeksport for eleven
* **Innsynsrett (GDPR artikkel 15):** Elevens eksportverktøy i portalen (`StudentPrivacyModal` / `studentDataExport.js`) må gi eleven en komplett JSON-eksport av alle lagrede opplysninger om eleven, inkludert:
  - Elevprofil og registrert klasse
  - Alle besvarelser og delmål fra `student_progress`
  - Eventuelle lagrede notater og veiledningssamtaler
  - Fokus- og hendelseslogger

### 5. Databehandling utelukkende i EU
* **Region-låsing:** All behandling og lagring av elevdata og KI-inferens skal foregå innenfor EU (primært `europe-west1` i Belgia) for å overholde EUs personvernforordning og standard databehandleravtale (DPA).
