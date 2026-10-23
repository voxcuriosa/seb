/**
 * publicKey.js
 * Offentlige Ed25519-nøkler (base64, 32 byte rå nøkkel) for verifisering av serversignaturer.
 * Offentlige nøkler er ikke hemmelige. Den private nøkkelen finnes kun i Google Secret Manager
 * (SEB_SIGNING_KEY) og settes med scripts/setup-signing-key.sh, som også oppdaterer denne filen.
 */
export const ACTIVE_KEY_ID = 'k1';

export const SIGNING_PUBLIC_KEYS = {
  k1: ''
};
