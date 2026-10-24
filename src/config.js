/**
 * config.js
 * Offentlige konstanter for SEB-modulen. Ingen hemmeligheter her:
 * Firebase web-konfigurasjon er offentlig av design (tilgang styres av regler og Cloud Functions).
 */

export const SITE_ORIGIN = 'https://voxcuriosa.no';
export const APP_BASE_PATH = '/seb';
export const APP_ORIGIN_URL = `${SITE_ORIGIN}${APP_BASE_PATH}`;

export const FIREBASE_REGION = 'europe-west1';
export const FIREBASE_PROJECT_ID = 'voxcuriosa-seb';

// Firebase web-nøkler er offentlige identifikatorer, ikke hemmeligheter.
// Nøkkelen bør i tillegg begrenses til voxcuriosa.no i Google Cloud Console (HTTP-referrer).
export const firebaseConfig = {
  apiKey: 'AIzaSyAYaKM5fL__qbV9_FkIYpqdTonYOYi3s1c',
  authDomain: `${FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: `${FIREBASE_PROJECT_ID}-storage`,
  messagingSenderId: '611230089978',
  appId: '1:611230089978:web:b53600273384beb189bf43'
};

export const EXAM_TTL_DAYS = 90;
export const MAX_PROMPT_PDF_BYTES = 8 * 1024 * 1024;
export const MAX_PROMPT_HTML_CHARS = 200_000;
export const LARGE_PASTE_THRESHOLD = 200;

export function examStartUrl(examId) {
  return `${APP_ORIGIN_URL}/start/${encodeURIComponent(examId)}`;
}

export function examRoomUrl(examId) {
  return `${APP_ORIGIN_URL}/exam/${encodeURIComponent(examId)}?seb=1`;
}

export const EXAM_QUIT_URL = `${APP_ORIGIN_URL}/quit`;
