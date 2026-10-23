---
name: modular-file-size-discipline
description: Standarder for modulær kodeoppdeling, filstørrelsesdisiplin og unngåelse av store monolittiske filer ved implementasjon av ny funksjonalitet.
---

# Retningslinje: Modulær arkitektur og filstørrelsesdisiplin

For å bevare god kodehelse, unngå komplekse megakomponenter, lette testing og holde bundle-størrelser nede i Curiosa, skal all ny kode og utvidelser følge prinsipper om modulær oppdeling i små, oversiktlige filer.

## 1. Grenseverdier for filstørrelse

Ved opprettelse av nye komponenter, hooks og hjelpefunksjoner gjelder følgende tommelfingerregler:

- **UI-komponenter:** Bør ideelt holdes under **250–300 linjer**.
  - Hvis en komponent overstiger 400 linjer, **skal** den brytes ned i underkomponenter (subcomponents), egne presentasjonskort, verktøylinjer eller modaler.
- **Custom hooks:** Bør ideelt holdes under **200–250 linjer**.
  - Del opp ansvar: Skille mellom datainnhenting (fetch/subscription), forretningslogikk (mutasjoner/validering) og lokal UI-tilstand.
- **Hjelpefunksjoner og verktøyfiler (`src/utils/`):** Bør holdes under **200 linjer**.
  - Enkle, rene funksjoner med ett veldefinert formål (Single Responsibility Principle).

## 2. Arkitekturmønstre for oppdeling

### A. Underkomponenter i egne filer
Ikke legg flere store hjelpekomponenter i samme fil som hovedkomponenten.
- Opprett en undermappe ved behov, f.eks.:
  - `src/components/[feature]/components/` eller `src/components/[feature]/subcomponents/`
  - Eksempler: Header, Filters, Cards, ActionButtons, Modals skilles ut i egne filer.

### B. Trekk ut tilstand og logikk i egne hooks
- Hvis en komponent inneholder omfattende `useEffect`, `useState`, `useCallback` eller forretningslogikk, flytt denne logikken ut i en dedikert custom hook i `src/hooks/`.
- Dette gjør komponenten til en ren visningskomponent og gjør logikken enklere å teste og gjenbruke.

### C. Isolering av rene hjelpefunksjoner
- Matematiske beregninger, datatransformasjoner, datoformatering, filtrering og validering skal ligge i `src/utils/`, ikke inline i React-komponenten.

### D. Ytelse og lazy-loading (Kodeoppsplitting)
- Tunge komponenter som ikke trengs ved første sidelasting (f.eks. store modaler, PDF-seere, rike diagrammer, eksportverktøy) skal lastes asynkront ved hjelp av `React.lazy()` og `Suspense`:
  ```javascript
  const HeavyModal = React.lazy(() => import('./HeavyModal'));
  ```
- Dette forhindrer at kjerne-bundlene (`Admin.js`, `Dashboard.js`) vokser ukontrollert.

## 3. Retningslinjer for eksisterende kode
- **Ingen ubedt refaktorering:** Eksisterende store filer skal **ikke** refaktoreres uten at det er eksplisitt bestilt av brukeren ("Ikke rør noe annet").
- **Ved utvidelse av eksisterende store filer:** 
  - Hvis det skal legges til ny funksjonalitet i en eksisterende stor fil (f.eks. `Admin.jsx` eller `TopicList.jsx`), skal den nye funksjonaliteten kapsles inn i en ny, separat fil/komponent/hook og kun importeres og kobles til i hovedfilen.

## 4. Prosjektregler som alltid gjelder
- **Ingen emojier:** Alltid følg no-emojis policyen i både filer og UI.
- **UI-lesbarhet:** Behold universell utforming og høy kontrast uavhengig av filoppdeling.
- **Hjelpedokumentasjon:** Husk å oppdatere `HelpTab.jsx` og `StudentHelpModal.jsx` ved funksjonelle endringer.
