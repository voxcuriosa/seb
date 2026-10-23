---
name: ui-readability-contrast
description: Standarder for høy kontrast og krystallklar lesbarhet i brukergrensesnitt for både lys og mørk modus i alle prosjekter.
---

# Retningslinje for UI-lesbarhet og kontrast

Sørg alltid for optimal lesbarhet, høy kontrast og universell utforming (a11y) i alle visuelle komponenter, knapper, tags, menyer og tekst.

## Kjerne-prinsipper

1. **Lys modus vs. mørk modus:**
   - I mørk modus: Unngå for svake gråtoner (f.eks. `text-slate-500` på mørk bakgrunn). Bruk `text-slate-200` eller `text-white` for god kontrast.
   - I lys modus: Unngå lyse tekster på lyse bakgrunner. Særlig på knapper, badges og ved hover må teksten aldri "vaskes ut" eller forsvinne i bakgrunnen.
   - Aksentfarger (rosa, lilla, smaragd, blå, rav):
     - På lys bakgrunn (light mode): Bruk dypere tekst- og kantfarger (f.eks. `text-pink-700`, `bg-pink-100`, `border-pink-300`, `dark:text-pink-300`, `dark:bg-pink-950/40`, `dark:border-pink-500/40`).
     - Telle- og statusbobler: Bruk alltid sterk kontrast (f.eks. `bg-pink-600 text-white` eller `bg-slate-900 text-white`).

2. **Hover-tilstander:**
   - Hover-tilstander skal alltid øke eller beholde kontrasten, aldri redusere den.
   - Pass på at bakgrunnsfarge og tekstfarge ved hover er testet for både mørkt og lyst tema.

3. **Status- og interaksjonsindikatorer:**
   - Ikoner og tellere må være tydelig adskilt fra bakgrunnen med tilstrekkelig opasitet og kontrast.
   - Unngå pastelltekst på pastellbakgrunn uten tilstrekkelig fargedybde.
