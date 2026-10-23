import { defineConfig } from 'vitest/config';

// Regeltester mot Firebase Emulator (kjøres via `npm run test:rules`).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['rules-tests/**/*.test.js'],
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false
  }
});
