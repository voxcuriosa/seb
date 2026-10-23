---
name: student-data-never-leaves-browser
description: Absolutt regel for SEB-modulen. Elevarbeid (besvarelser, PDF-er, elevnavn, mappenavn fra Teams) skal aldri forlate nettleseren. Bruk ved ALL ny eller endret kode i src/, functions/ og scripts/, og før hver commit.
---

# Elevarbeid forlater aldri nettleseren

Dette er den viktigste regelen i prosjektet og går foran alle andre hensyn.

## Hva regnes som elevarbeid
- Elevens tekst (HTML, Tiptap-JSON, ren tekst), utkast og sikkerhetskopier
- Innleverte prøve-PDF-er og alt innhold i dem (payload, synlig tekst)
- Elevnavn og mappenavn fra Teams/SharePoint («Student Work/Ola Nordmann/...»)
- Fokus- og innlimingslogg, aktiv tid og ordtelling knyttet til en elev

## Tillatte nettverkskall (uttømmende liste)
| Hvor | Kall | Innhold |
|---|---|---|
| Lærer, Fane 1 | `callCreateSebExam` | PIN og prøveoppsett (lærerens tekst). Ingen elevdata. |
| Elev, startside og prøverom | `fetchSebExam`, `fetchPromptPdf` | Bare lesing av prøveoppsettet |
| Elev, ved «Fullfør» | `callSignSebSubmission({ examId, sha256 })` | Bare SHA-256-hashen. Aldri tekst eller navn. |
| Lærer, «Last ned .seb» | `fetch()` av `/seb/dictionaries/*.zip` | Egne statiske filer, ingen data sendes |

Alt annet er forbudt. Fane 2 (kontroll av PDF-er) har **null** nettverkskall.

## Sjekkliste ved hver endring
1. Importerer filen (direkte eller indirekte) `src/firebase.js`, `firebase/*`, `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource` eller tredjeparts HTTP-klienter? Er filen i Fane 2 eller prøverommet, er svaret nei.
2. Sendes noe mer enn `{ examId, sha256 }` til `callSignSebSubmission`? Det skal ikke skje.
3. Leser eller lagrer `functions/src/signSebSubmission.js` noe annet enn `examId` og `sha256`? Det skal ikke skje.
4. Lagres elevnavn i `localStorage`? Fane 2 holder alt i minnet. Prøverommet lagrer bare elevens egen tekst lokalt på elevens maskin.
5. Analyse, feillogging (Sentry o.l.), KI-kall eller tredjeparts skript? Forbudt i hele appen.
6. Nye eksporter i `src/firebase.js` må legges til i `APPROVED_FIREBASE_EXPORTS` i `scripts/privacy-guard.mjs` med begrunnelse. Klienten skal aldri skrive til Firestore eller Storage.

## Automatisk håndhevelse
- `scripts/privacy-guard.mjs` analyserer importgrafen transitivt fra Fane 2 og prøverommet.
- Kjøres av `npm test` (`src/test/privacyGuard.test.js`), git pre-commit og pre-push (`.githooks/`) og GitHub Actions (`.github/workflows/ci.yml`).
- Vakten skal aldri svekkes, hoppes over (`--no-verify`) eller få unntak for å få en endring gjennom. Hvis en funksjon krever nettverk, må den omdesignes slik at elevdata blir lokale.

## Ved tvil
Stopp og spør brukeren før du legger til et nettverkskall i nærheten av elevdata.
