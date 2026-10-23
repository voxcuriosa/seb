---
name: frontend-security-hardening
description: Sikkerhetsstandarder og faste regler for frontend i Curiosa for å forhindre Cross-Site Scripting (XSS), prompt injection og lekkasje av sensitive data.
---

# Frontend Sikkerhetsherding for Curiosa

Når du oppretter, endrer eller evaluerer frontend-kode i `src/`, SKAL følgende sikkerhetsstandarder alltid overholdes:

### 1. Strikt XSS-beskyttelse og sanitering
* **Aldri rå `dangerouslySetInnerHTML`:** Bruk av `dangerouslySetInnerHTML` er kun tillatt dersom innholdet er renset med `DOMPurify.sanitize(...)` med eksplisitt tillatte HTML-tagger og attributter.
* **Mermaid-diagrammer:** Sett alltid `securityLevel: 'strict'` ved rendering av Mermaid for å hindre utførelse av skript og klikkhendelser fra diagramkode.
* **KaTeX-rendering:** Sett alltid `trust: false` i KaTeX-konfigurasjonen for å forhindre rendering av skadelige `\url` eller `javascript:`-lenker.
* **Markdown-rendering:** Når `react-markdown` benyttes med HTML-plugins, må renderingen gå gjennom et sanitetsfilter som blokkerer `<script>`, `<iframe>`, `<object>` og skadelige hendelsesattributter (`onload`, `onerror`).

### 2. Beskyttelse mot Prompt Injection i KI-oppgaver
* **Sanitering av elevsvar før KI-vurdering:** Elevsvar og fritekst skrevet av brukere skal aldri interpoleres direkte inn i KI-prompter uten sanitering.
* **Isolasjon med XML-tagger:** Pakk alltid elevtekst inn i entydige XML-tagger som `<elevsvar>...</elevsvar>` og instruer modellen om at innholdet utelukkende er elevens besvarelse.
* **Fjerning av kontrollkoder:** Rens elevteksten for eventuelle lukkende tagger (f.eks. `</elevsvar>`), systemkommandoer eller avgrensningstegn som eleven kan forsøke å bruke for å overstyre sensureringen.

### 3. Sikker håndtering av lokal lagring (localStorage og sessionStorage)
* **Ingen ukrypterte passord eller hemmeligheter:** Hemmelige API-nøkler, service account-nøkler eller private sertifikater skal aldri lagres i nettleserens lagring.
* **Rens ved utlogging:** Ved utlogging (`signOut`) skal alle elev- og lærerdata i `localStorage` og `sessionStorage` tømmes fullstendig for å hindre at neste bruker på en delt skolemaskin får tilgang.

### 4. Origin-sjekk ved `window.postMessage`
* **Alltid valider origin:** Enhver hendelseslytter for `message` (`window.addEventListener('message', ...)`) SKAL eksplisitt validere `event.origin` mot godkjente domener (`https://curiosa.no` og `https://voxkunnskapeuropa.web.app`).
* **Avvis `*` som targetOrigin:** Ved sending av sensitive meldinger via `postMessage` skal det aldri brukes `'*'` som targetOrigin; spesifiser alltid det eksakte måldomenet.

### 5. Ingen emojier i kildekode og grensesnitt
* I tråd med Curiosas policy skal det ikke brukes emojier i feilmeldinger, grensesnittelementer eller kommentarer. Bruk ikoner fra `lucide-react`.
