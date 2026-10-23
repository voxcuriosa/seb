# SEB – Safe Exam Browser-prøver på voxcuriosa.no/seb

Åpen, frittstående modul for å opprette SEB-prøver, gjennomføre dem i Safe Exam Browser og kontrollere innleverte PDF-er lokalt med SHA-256.

- Ingen elevdata sendes til server eller KI (zero-knowledge for elevdata).
- Ingen passord, nøkler eller FTP-pålogginger skal noen gang ligge i dette repoet. Hemmeligheter ligger i Google Secret Manager (Firebase) og macOS-nøkkelringen (FTP).
