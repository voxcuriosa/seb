---
name: firestore-security-hardening
description: Sikkerhetsstandarder og faste regler for Cloud Firestore i Curiosa for å forhindre rettighetseskalering, datalekkasjer og omgåelse av tilgangskontroll.
---

# Firestore Sikkerhetsherding for Curiosa

Når du leser, endrer eller evaluerer `firestore.rules` i dette prosjektet, SKAL følgende sikkerhetsstandarder alltid overholdes:

### 1. Uforanderlige roller (Role Immutability)
* **Aldri tillat klient-tildeling av roller:** Selv om en bruker eier sitt eget dokument (f.eks. i `/admins/{uid}`), skal de **aldri** kunne sette eller endre sensitive felter som `role`, `isAdmin` eller rettighetsflagg.
* **Mønster:**
  ```firestore
  match /admins/{id} {
    allow read: if auth();
    allow create: if isSuper() || (
      auth() && request.auth.uid == id &&
      (!('role' in request.resource.data) || request.resource.data.role != 'superadmin')
    );
    allow update: if isSuper() || (
      auth() && request.auth.uid == id &&
      (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role']))
    );
    allow delete: if isSuper();
  }
  ```

### 2. Skille `get` og `list` på sensitive samlinger
* Samlinger som inneholder sikkerhetsmetadata (f.eks. `login_attempts`) må aldri ha `allow read: if true;` eller `allow list: if true;`.
* Tillat `get` for spesifikke oppslag når en ID/fingeravtrykk er kjent av klienten, men reserver `list` for `isSuper()` slik at ingen kan dumpe hele samlingen.
* **Mønster:**
  ```firestore
  match /login_attempts/{id} {
    allow get: if true;
    allow list: if isSuper();
    allow create, update: if true && 
      request.resource.data.diff(resource.data == null ? {} : resource.data).affectedKeys().hasOnly(['attempts', 'lastAttempt', 'updatedAt', 'blockedUntil']);
    allow delete: if isSuper();
  }
  ```

### 3. Sperre `delete` på sanksjons- og sperredokumenter
* Klienter skal aldri ha `allow delete` på dokumenter som styrer sperrer, fusk-logger eller rate-limiting.

### 4. Låsing av kjerne-identifikatorer i elevprogresjon
* Elever oppdaterer sine egne progresjonsdokumenter (`student_progress`), men de skal **aldri** kunne endre eller overskrive tilhørighetsidentifikatorer:
* **Mønster:**
  ```firestore
  allow update: if isSuper() || (auth() && (
    ...
    (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['studentId', 'topicId', 'teacherId']))
  ));
  ```

### 5. Eierskapssjekk på sub-samlinger og ressursfiler
* Unngå åpne wildcards som `match /{allSubcollections=**} { allow write: if isTeacher(); }`.
* Verifiser alltid at læreren faktisk er oppretter av overordnet emne eller eier av filen:
* **Mønster:**
  ```firestore
  match /{allSubcollections=**} {
    allow read: if auth();
    allow write: if isSuper() || (
      isTeacher() && (
        resource == null ||
        get(/databases/$(database)/documents/topics/$(id)).data.createdBy == request.auth.uid
      )
    );
  }
  ```

### 6. Obligatorisk e-postverifisering på privilegerte roller
* Tildel **aldri** privilegier (eier, superadmin, lærer) basert kun på e-postadressens tekststreng (`request.auth.token.email`) uten å kreve `request.auth.token.email_verified == true`.
* Hvis `email_verified` utelates, kan en angriper registrere en e-post/passord-konto med en annens e-postadresse og overta rettighetene før adressen er bekreftet.

### 7. Konsistent e-postnormalisering for Gmail-aliaser
* Gmail ignorerer punktum i brukernavnet og tillater pluss-aliaser (`navn+tag@gmail.com`).
* Alle autorisasjonsregler, dokument-ID-er i `admins_whitelist` og delingsregler må bruke en standardisert normaliseringsfunksjon (`getEmailId`) som fjerner punktum og pluss-aliaser for `gmail.com` og `googlemail.com`.
* Dette forhindrer at en deaktivert lærer kan omgå en sperre eller hvitliste ved å logge inn med en alias-variant av samme konto.

### 8. Autoritativ opprydding og feilhåndtering ved deautorisering
* Ved fjerning av lærere eller administratorer må sletterutinen slette **både** hvitlisteoppføringen (`admins_whitelist/{emailId}`) og brukerprofilen (`admins/{uid}`).
* Samle alle feil under sletting og krev at kanonisk dokument faktisk er borte før fullført operasjon meldes. Slettefeil må aldri undertrykkes eller rapportere falsk suksess.
