/**
 * publicKey.js
 * Offentlig Ed25519-verifiseringsnøkkel for SEB-innleveringer.
 * Brukes i Fane 2 (GradeSubmissionsTab / examPdfParser) til å verifisere
 * at elevens innleverte PDF ble signert av voxcuriosa-seb under innlevering.
 *
 * Denne nøkkelen er offentlig av design.
 */
export const SUBMISSION_PUBLIC_KEY_BASE64 =
  'MCowBQYDK2VwAyEAX0kmKa6ppy56y4/kONzJ9GrRaVmJJaix281/u0FZzQ8=';

export const SIGNING_PUBLIC_KEYS = {
  k1: SUBMISSION_PUBLIC_KEY_BASE64
};
