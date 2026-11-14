// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// GitHub Pages serves the site from /plutonyx/. Change `base` if a custom domain is used.
export default defineConfig({
  base: '/plutonyx/',
  resolve: { alias: { '@shared': fileURLToPath(new URL('../shared', import.meta.url)) } },
  server: { fs: { allow: ['..'] }, port: 5173, strictPort: false },
  build: { target: 'es2022', chunkSizeWarningLimit: 2500 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
