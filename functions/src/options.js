/**
 * options.js
 * Felles innstillinger for alle callable-funksjoner (EU-region, kostnadstak, CORS).
 */
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

export const CALLABLE_OPTS = {
  region: 'europe-west1',
  maxInstances: 5,
  concurrency: 40,
  cors: isEmulator
    ? ['https://voxcuriosa.no', /^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/]
    : ['https://voxcuriosa.no']
};
