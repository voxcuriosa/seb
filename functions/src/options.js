/**
 * options.js
 * Felles innstillinger for alle callable-funksjoner (EU-region, kostnadstak, CORS).
 */
export const CALLABLE_OPTS = {
  region: 'europe-west1',
  maxInstances: 5,
  concurrency: 40,
  cors: [
    'https://voxcuriosa.no',
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/
  ]
};
