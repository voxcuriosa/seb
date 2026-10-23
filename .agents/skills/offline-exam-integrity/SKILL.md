---
name: offline-exam-integrity
description: Garantier for 100 % offline-drift under eksamen, SEB-kompatibilitet og fysisk nettverkssperre.
---

# Offline Exam Integrity (SEB & Eksamen)

VoxLex skal forhåndsgodkjennes for bruk på eksamen og tentamen etter Utdanningsdirektoratets (Udir) retningslinjer og i samspill med Safe Exam Browser (SEB).

## Regler
1. **100 % Offline kjerne:** Ordbokoppslag, fonologisk stavekontroll, ordprediksjon, tospråklige basisordbøker og talesyntese må aldri kreve nettverk eller pålogging.
2. **Fysisk nettverkssperre i Eksamensmodus:**
   - Når `ExamMode` er aktiv i Rust-staten, skal ethvert kall til eksterne/online KI- eller oversettelsesmoduler avvises umiddelbart på Rust-nivå (`Err(ExamModeRestricted)`).
3. **SEB-deteksjon og PIN-lås:**
   - Bakgrunnssjekk i Rust detekterer om Safe Exam Browser (`SafeExamBrowser`) kjører og låser appen automatisk i eksamensmodus.
   - Eksamensvakt/lærer kan også låse og låse opp eksamensmodus manuelt med PIN-kode, tydelig bekreftet av et visuelt kontrollbanner øverst i vinduet.
