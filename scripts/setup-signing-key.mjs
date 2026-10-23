import { generateKeyPairSync } from 'node:crypto';
import { writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { publicKey, privateKey } = generateKeyPairSync('ed25519');

const privDer = privateKey.export({ format: 'der', type: 'pkcs8' });
const pubDer = publicKey.export({ format: 'der', type: 'spki' });

const privBase64 = privDer.toString('base64');
const pubBase64 = pubDer.toString('base64');

console.log('Ed25519 Keypair Generated:');
console.log('Public Key (base64):', pubBase64);
console.log('');
console.log('Private key length:', privDer.length, 'bytes');

const publicKeyFilePath = join(__dirname, '..', 'src', 'utils', 'integrity', 'publicKey.js');
const publicKeyFileContent = `/**
 * publicKey.js
 * Offentlig Ed25519-verifiseringsnøkkel for SEB-innleveringer.
 * Brukes i Fane 2 (GradeSubmissionsTab / examPdfParser) til å verifisere
 * at elevens innleverte PDF ble signert av voxcuriosa-seb under innlevering.
 *
 * Denne nøkkelen er offentlig av design.
 */
export const SUBMISSION_PUBLIC_KEY_BASE64 =
  '${pubBase64}';
`;

writeFileSync(publicKeyFilePath, publicKeyFileContent, 'utf-8');
console.log('Updated', publicKeyFilePath);

// Skriv hemmelighet til en lokal tempfil som aldri sjekkes inn i git
const secretTempPath = join(__dirname, '..', '.tmp-seb-signing-key.txt');
writeFileSync(secretTempPath, privBase64, 'utf-8');
console.log('Saved private key temporarily to', secretTempPath, '(ignored by git)');
