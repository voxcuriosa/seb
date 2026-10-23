#!/usr/bin/env node
/**
 * privacy-guard.mjs
 * Personvernvakt: verifiserer at elevarbeid aldri kan forlate nettleseren.
 *
 * Regler:
 *  1. LOKAL SONE (Fane 2 / kontroll av PDF-er og alt den importerer, transitivt):
 *     ingen import av firebase, src/firebase.js eller nettverks-API-er
 *     (fetch, XMLHttpRequest, sendBeacon, WebSocket, EventSource, axios, navigator.share).
 *  2. PRØVEROMMET (elevens skriving og alt det importerer, transitivt):
 *     nettverk er bare lov via de godkjente funksjonene i src/firebase.js
 *     (fetchSebExam, fetchPromptPdf, callSignSebSubmission). Rå nettverks-API-er er forbudt,
 *     bortsett fra lokal henting av egne statiske filer i ALLOWED_FETCH_FILES.
 *  3. callSignSebSubmission får bare { examId, sha256 }.
 *  4. Cloud Function signSebSubmission leser bare examId og sha256 fra request.data.
 *  5. src/firebase.js eksporterer bare de godkjente funksjonene (ingen generisk skriving).
 *
 * Kjøres av `npm test` (src/test/privacyGuard.test.js), git pre-commit og GitHub Actions.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'src');
const FIREBASE_MODULE = resolve(SRC, 'firebase.js');

export const LOCAL_ONLY_ENTRIES = [
  'src/components/grade/GradeSubmissionsTab.jsx',
  'src/hooks/useSubmissions.js',
  'src/utils/integrity/examPdfParser.js'
];

export const EXAM_ROOM_ENTRIES = ['src/pages/SebExamRoom.jsx'];

export const APPROVED_FIREBASE_EXPORTS = ['db', 'functions', 'storage', 'fetchSebExam', 'fetchPromptPdf', 'callCreateSebExam', 'callSignSebSubmission'];
const EXAM_ROOM_ALLOWED_FIREBASE_IMPORTS = ['fetchSebExam', 'fetchPromptPdf', 'callSignSebSubmission'];

/** Filer som får bruke fetch() mot egne statiske filer (ordbøker), aldri med elevdata. */
const ALLOWED_FETCH_FILES = ['src/utils/seb/sebDictionaries.js'];

const NETWORK_PATTERNS = [
  [/\bfetch\s*\(/, 'fetch()'],
  [/\bXMLHttpRequest\b/, 'XMLHttpRequest'],
  [/\bsendBeacon\s*\(/, 'navigator.sendBeacon'],
  [/\bnew\s+WebSocket\b/, 'WebSocket'],
  [/\bnew\s+EventSource\b/, 'EventSource'],
  [/\bnavigator\.share\s*\(/, 'navigator.share'],
  [/\bwindow\.open\s*\(\s*['"`]https?:/, 'window.open(ekstern URL)'],
  [/\bimportScripts\s*\(/, 'importScripts']
];
const FORBIDDEN_PACKAGES = [/^firebase(\/|$)/, /^@firebase\//, /^axios$/, /^ky$/, /^got$/, /^socket\.io/];

const IMPORT_RE = /(?:import\s+(?:[\s\S]*?)\s+from\s+|import\s*\(\s*|export\s+(?:[\s\S]*?)\s+from\s+)['"]([^'"]+)['"]/g;

function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  const base = resolve(dirname(fromFile), spec.replace(/\?.*$/, ''));
  for (const cand of [base, `${base}.js`, `${base}.jsx`, `${base}/index.js`, `${base}/index.jsx`]) {
    if (existsSync(cand) && statSync(cand).isFile()) return cand;
  }
  return null;
}

function walk(entries) {
  const seen = new Map();
  const stack = entries.map((e) => resolve(ROOT, e)).filter(existsSync);
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    const code = stripComments(readFileSync(file, 'utf8'));
    const imports = [];
    for (const m of code.matchAll(IMPORT_RE)) imports.push({ spec: m[1], statement: m[0] });
    seen.set(file, { code, imports });
    for (const { spec } of imports) {
      const target = resolveImport(file, spec);
      if (target && target !== FIREBASE_MODULE && /\.(jsx?|mjs)$/.test(target)) stack.push(target);
    }
  }
  return seen;
}

const rel = (f) => relative(ROOT, f);

function networkViolations(file, code, zone) {
  const out = [];
  for (const [re, name] of NETWORK_PATTERNS) {
    if (re.test(code) && !(name === 'fetch()' && ALLOWED_FETCH_FILES.includes(rel(file)))) {
      out.push(`[${zone}] ${rel(file)} bruker ${name}`);
    }
  }
  return out;
}

export function runPrivacyGuard() {
  const violations = [];

  // Regel 1: lokal sone
  for (const [file, { code, imports }] of walk(LOCAL_ONLY_ENTRIES)) {
    for (const { spec } of imports) {
      if (FORBIDDEN_PACKAGES.some((re) => re.test(spec))) violations.push(`[lokal sone] ${rel(file)} importerer ${spec}`);
      if (resolveImport(file, spec) === FIREBASE_MODULE) violations.push(`[lokal sone] ${rel(file)} importerer src/firebase.js`);
    }
    violations.push(...networkViolations(file, code, 'lokal sone'));
  }

  // Regel 2 og 3: prøverommet
  for (const [file, { code, imports }] of walk(EXAM_ROOM_ENTRIES)) {
    for (const { spec, statement } of imports) {
      if (FORBIDDEN_PACKAGES.some((re) => re.test(spec))) violations.push(`[prøverom] ${rel(file)} importerer ${spec} direkte`);
      if (resolveImport(file, spec) === FIREBASE_MODULE) {
        const names = (statement.match(/\{([^}]*)\}/)?.[1] || '').split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean);
        const bad = names.filter((n) => !EXAM_ROOM_ALLOWED_FIREBASE_IMPORTS.includes(n));
        if (bad.length || !names.length) violations.push(`[prøverom] ${rel(file)} importerer ikke-godkjent fra firebase.js: ${bad.join(', ') || 'standard/stjerne-import'}`);
      }
    }
    violations.push(...networkViolations(file, code, 'prøverom'));
    for (const m of code.matchAll(/callSignSebSubmission\s*\(\s*\{([^}]*)\}/g)) {
      const keys = m[1].split(',').map((s) => s.trim().split(':')[0].trim()).filter(Boolean);
      const extra = keys.filter((k) => !['examId', 'sha256'].includes(k));
      if (extra.length) violations.push(`[prøverom] ${rel(file)} sender mer enn examId/sha256 til signering: ${extra.join(', ')}`);
    }
    if (/callSignSebSubmission\s*\(\s*[^{\s)]/.test(code)) {
      violations.push(`[prøverom] ${rel(file)} kaller callSignSebSubmission uten et eksplisitt { examId, sha256 }-objekt`);
    }
  }

  // Regel 4: serverfunksjonen leser bare examId og sha256
  const signFn = resolve(ROOT, 'functions/src/signSebSubmission.js');
  if (existsSync(signFn)) {
    const code = stripComments(readFileSync(signFn, 'utf8'));
    const reads = [...code.matchAll(/request\.data(?:\.(\w+)|\s*\|\|\s*\{\})/g)];
    const destructured = code.match(/const\s*\{([^}]*)\}\s*=\s*request\.data/)?.[1] || '';
    const keys = [...destructured.split(','), ...reads.map((r) => r[1])].map((s) => (s || '').trim()).filter(Boolean);
    const extra = keys.filter((k) => !['examId', 'sha256'].includes(k));
    if (extra.length) violations.push(`[server] signSebSubmission leser ${extra.join(', ')} fra request.data`);
    if (/\.(set|add|update)\s*\(/.test(code)) violations.push('[server] signSebSubmission skriver til databasen');
    if (/console\.(log|info|warn|error)\([^)]*(request\.data|sha256)/.test(code)) violations.push('[server] signSebSubmission logger innleveringsdata');
  }

  // Regel 5: firebase.js eksporterer bare godkjente funksjoner
  if (existsSync(FIREBASE_MODULE)) {
    const code = stripComments(readFileSync(FIREBASE_MODULE, 'utf8'));
    for (const m of code.matchAll(/export\s+(?:const|async\s+function|function|let)\s+(\w+)/g)) {
      if (!APPROVED_FIREBASE_EXPORTS.includes(m[1])) violations.push(`[firebase.js] ny eksport «${m[1]}» må godkjennes i privacy-guard`);
    }
    if (/\b(setDoc|addDoc|updateDoc|uploadBytes|uploadString|writeBatch|runTransaction)\b/.test(code)) {
      violations.push('[firebase.js] klienten skal aldri skrive til Firestore eller Storage');
    }
  }

  return violations;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const v = runPrivacyGuard();
  if (v.length) {
    console.error('Personvernvakt: elevarbeid kan forlate nettleseren!\n');
    v.forEach((x) => console.error(`  - ${x}`));
    process.exit(1);
  }
  console.log('Personvernvakt: OK (elevarbeid forblir i nettleseren).');
}
