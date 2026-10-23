---
name: cloud-functions-security
description: Sikkerhetsstandarder og faste regler for Firebase Cloud Functions (både onCall og offentlige onRequest-endepunkter) i Curiosa for å forhindre DoS, API-misbruk og uautorisert tilgang.
---

# Sikkerhetsstandarder for Cloud Functions i Curiosa

Når du oppretter, endrer eller evaluerer Cloud Functions i `functions/index.js`, SKAL følgende sikkerhetsstandarder alltid overholdes:

### 1. Autentisering og kryptografisk token-validering (`onRequest`)
* En egendefinert klientheader (f.eks. `x-curiosa-client`) er et klientskille og en første sperre, men **aldri** et innloggingsbevis.
* **Privilegerte handlinger** (oppgavegenerering med KI, uthenting av fagstoff, administrasjon) MÅ kreve et gyldig Firebase ID-token (`Authorization: Bearer <idToken>` eller `req.body.idToken`).
* Valider alltid tokenet kryptografisk via Firebase Admin SDK: `await getAuth().verifyIdToken(idToken)`.
* **Stol aldri på klientoppgitt identitet:** Identiteten (`uid`, `email`, `email_verified`) skal utelukkende etableres fra det dekodede tokenet, **aldri** fra fritekstfelter som `req.body.teacherEmail` eller `req.body.teacherUid`.
* Avvis manglende eller utløpt token med `401 Unauthorized`.
* Håndter alltid CORS `OPTIONS`-preflight eksplisitt med `204 No Content`.

### 2. Symmetrisk autorisasjon mot Firestore-regler
* Serverfunksjoner (både `onCall` og `onRequest`) må speile autorisasjonskravene i `firestore.rules` 1:1:
  * **E-postverifisering:** Ikke-Feide-brukere MÅ ha `auth.token.email_verified === true`. Unntak for Gmail-suffiks tillates aldri.
  * **Hvitliste-validering:** For ikke-Feide-lærere er aktiv oppføring i `admins_whitelist/{emailId}` et absolutt krav. Et etterlatt `/admins/{uid}`-dokument gir aldri lærertilgang alene dersom brukeren er fjernet fra hvitlisten.
  * **E-postnormalisering:** Bruk alltid samme normalisering (`getEmailId`) som fjerner punktum og pluss-aliaser for Gmail/Googlemail for å unngå omgåelse av tilgangskontroll.

### 3. Frekvensbegrensning (Rate Limiting)
* Alle funksjoner som kaller eksterne betalte API-er (særlig Gemini/Vertex AI) **MÅ** ha frekvensbegrensning:
  * **Anonyme elever (`onCall`):** Maks 20 kall per minutt per bruker-UID.
  * **Offentlige REST-kall (`onRequest`):** Maks 15–30 kall per minutt per IP-adresse (via glidende tidsvindu).
* Avvis overskridelser med `429 Too Many Requests` eller `HttpsError("resource-exhausted")`.

### 4. Validering og lengdebegrensning på inndata
* Valider alltid inndata før prosessering starter.
* Sett strenge grenser på tillatt tekstlengde (f.eks. maks 50 000–60 000 tegn for oppgavegenerering) for å hindre minne-krasj, høye tokenkostnader eller DoS-angrep.

### 5. Isolasjon av datatilgang (Never Expose in Bulk)
* Endepunkter som returnerer data (som emner eller delte elever) må **aldri** returnere alle data globalt dersom læreridentitet mangler eller delingslister er tomme.
* Hvis delinger mangler eller autorisasjon avvises, skal funksjonen umiddelbart returnere tomme lister `[]` eller kaste `HttpsError("permission-denied")`.
