import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Appen serveres fra https://voxcuriosa.no/seb/ (Apache-webhotell, se public/.htaccess).
export default defineConfig({
  base: '/seb/',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 900
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}', 'functions/src/**/*.test.js'],
    setupFiles: ['./src/test/setup.js']
  }
});
