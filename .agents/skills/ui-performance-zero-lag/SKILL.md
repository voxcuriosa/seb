---
name: ui-performance-zero-lag
description: Standarder for lynrask ytelse, null lagging (zero lag) og 60 FPS i brukergrensesnitt på både datamaskiner, nettbrett og skole-Chromebooks i Curiosa.
---

# Retningslinje for UI-ytelse og Null Lagging (Zero Lag)

Curiosa brukes i klasserom på et bredt spekter av maskinvare, inkludert eldre laptoper, nettbrett og rimelige skole-Chromebooks med begrenset GPU- og CPU-ytelse. Grensesnittet skal alltid oppleves umiddelbart, responsivt og uten forsinkelser eller hakking (stuttering).

## Kjerne-prinsipper

### 1. Strengt forbud mot tunge CSS-filtre (backdrop-blur)
- **Ingen `backdrop-blur-*`:** Bruk aldri `backdrop-blur-sm`, `backdrop-blur-md`, `backdrop-blur-lg` eller `backdrop-filter: blur(...)` på modaler, overlays, sidemenyer, kort, verktøylinjer eller bakgrunner.
  - *Hvorfor:* Backdrop-filter tvinger nettleseren og GPU-en til å piksel-sample, resample og uskarp-filtrere hele flaten under elementet for hver eneste pikselendring, scroll og animasjonsframe. På skolemaskiner skaper dette umiddelbart merkbar lagging og hakking.
  - *Løsning:* Bruk alltid rene, faste semitransparente eller solide bakgrunnsfarger med god kontrast, for eksempel `bg-slate-950/85`, `bg-slate-900/90`, `bg-white/95` eller solide farger med ren kantlinje (`border`).
- **Unngå store animerte blur-bobler:** Unngå store dekorative sirkler med `blur-[100px]` eller `blur-[120px]` kombinert med `animate-pulse` i bakgrunnen av modaler og sider. Bruk enkle gradienter eller flate aksentflater i stedet.

### 2. GPU-vennlige animasjoner og overganger
- **Animer kun komposittegenskaper:**
  - Animer kun `transform` (forflytning, skalering) og `opacity`.
  - Animer **aldri** geometriske layout-egenskaper som `width`, `height`, `top`, `left`, `margin`, `padding` eller `border-width`. Dette trigger full layout-beregning (reflow) og maling (repaint) for hvert skjermbilde.
- **Korte varigheter:**
  - Hold animasjoner raske og snertne: Overganger for modaler og menyer skal ha en varighet på maksimalt 0.15–0.2 sekunder (f.eks. `transition={{ duration: 0.15 }}`).
- **Begrens vedvarende evighetsanimasjoner:**
  - Begrens bruk av `animate-pulse`, `animate-spin` og `animate-bounce` til små, avgrensede lasteindikatorer eller aktive mikro-handlinger. Ingen hele seksjoner eller store kort skal ha kontinuerlige CSS-animasjoner i bakgrunnen.

### 3. Effektiv React-rendring og memoization
- **Beskytt tunge kalkulasjoner med `useMemo`:**
  - Sortering, søk, filtrering og beregning av mestringsgrader/statistikk for klasser og oppgaver skal alltid ligge i `useMemo` med presise avhengigheter.
- **Unngå unødvendige re-rendringer av lister:**
  - Komponenter i lister (f.eks. `StudentTopicCard`, elevrader i Live Monitor og statistikkort) skal benytte stabile `key`-egenskaper basert på unike dokument-ID-er, aldri tilfeldige verdier eller array-indekser alene.
  - Bruk `React.memo` på gjenbrukbare listekort dersom foreldrekomponenten har hyppige tilstandsendringer (som klokketidtakere eller sanntidsstrømmer).
- **Stabile callbacks med `useCallback`:**
  - Funksjoner som sendes som props til store lister eller tunge komponenter skal pakkes i `useCallback` for å forhindre kaskaderende re-rendringer.

### 4. Kodeoppdeling og lazy loading (Code Splitting)
- **Lazy-load tunge komponenter:**
  - Tunge modaler (f.eks. store hjelpevinduer, eksportveivisere, notatblokk/tegneflate, PDF-visere og changeloger) som ikke vises ved første skjermopptegning skal lazy-loades med `React.lazy()` og `Suspense`.
  - Tunge tredjepartsbiblioteker (som KaTeX, Mermaid, Cytoscape, PDF-motorer) må aldri ligge i den kritiske oppstartsbundelen for forsiden.

### 5. Ryddige listeners og unngå minnelekkasjer
- **Alltid rydde opp effekter (`cleanup`):**
  - Alle `setInterval`, `setTimeout`, `window.addEventListener` og Firestore `onSnapshot`-lyttere i `useEffect` SKAL returnere en oppryddingsfunksjon.
  - Lyttere på sanntidsdokumenter (f.eks. overvåkingslytteren for prøvesikkerhet) skal kun være aktive når eleven faktisk befinner seg inne i oppgaven (`view === 'topic'`), ikke i bakgrunnen på forsiden/portalen.
