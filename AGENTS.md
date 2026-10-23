# Prosjektregler for SEB-modulen (voxcuriosa.no/seb)

Åpen, frittstående modul for Safe Exam Browser-prøver. Ingen innlogging for elever, ingen KI.

## 1. Elevarbeid forlater ALDRI nettleseren (viktigst)
- Følg `.agents/skills/student-data-never-leaves-browser/SKILL.md` ved all endring.
- Fane 2 (kontroll av PDF-er) har null nettverkskall. Prøverommet sender bare `{ examId, sha256 }` til signering.
- `scripts/privacy-guard.mjs` håndhever dette i `npm test`, git-hooks og CI. Vakten skal aldri svekkes eller omgås.

## 2. Ingen hemmeligheter i git eller på FTP
- Lærer-PIN (`SEB_TEACHER_PIN`) og signeringsnøkkel (`SEB_SIGNING_KEY`) ligger kun i Google Secret Manager.
- FTP-pålogging hentes fra macOS-nøkkelringen (tjeneste `voxcuriosa-ftp`). Deploy bruker FTPS.
- Firebase web-konfigurasjon og den offentlige Ed25519-nøkkelen er offentlige av design.
- Lim aldri inn passord i chat eller kode. Pre-commit-hooken stopper åpenbare hemmeligheter.

## 3. Arkitektur
- Vite + React 19 + Tailwind 4, `base: '/seb/'`, SPA-fallback i `public/.htaccess` (Apache-webhotell, FTP-deploy).
- Firebase-prosjekt `voxcuriosa-seb`, alt i `europe-west1`. Billing: «Chromo - Privex» med budsjettvarsel.
- Klienten skriver aldri til Firestore eller Storage. Alle skriveoperasjoner skjer i Cloud Functions (Admin SDK).
- `sebExams` har TTL på `expiresAt` (90 dager). Storage har livssyklusregel for `sebExams/`.
- Firestore-regler skal skrives av `firestore-rules-author`-subagenten.

## 4. Kode og design (arvet fra voxkunnskap, VoxLex, privex og vox_portal)
- Filer under 300 linjer (maks 500). Logikk i `src/hooks/`, rene funksjoner i `src/utils/`. Se `modular-file-size-discipline`.
- Mørkt tema: `slate-950`/`slate-900`, emerald som primærfarge for prøver. Høy kontrast. Se `ui-brand-color-system` og `ui-readability-contrast`.
- Ingen `backdrop-blur`, kun korte `transform`/`opacity`-animasjoner. Se `ui-performance-zero-lag`.
- Ingen emojier i UI, kode eller svar (`no-emojis`). Bruk Lucide-ikoner.
- Norsk typografi: ingen `&` i løpende norsk tekst (`norwegian-typography`).
- All HTML saneres (DOMPurify på klient, sanitize-html på server). Elevtekst vises som React-elementer, aldri via `innerHTML`.
- SEB-kompatibilitet: pdf.js legacy-bygg, ingen avhengighet av nye nettleser-API-er i prøverommet (`offline-exam-integrity`).
- Hold hjelpeteksten (`src/components/HelpPanel.jsx`) oppdatert ved endringer i funksjonalitet.

## 5. Verifisering
- `npm test` (enhetstester og personvernvakt), `npm run build`, `npm run test:rules` (krever Java for emulator).
- Endringer i `.seb`-generatoren testes med `plutil -lint` (automatisk i testene) og manuelt i SEB for Windows og macOS.
