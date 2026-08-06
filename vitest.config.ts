import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Mirror the `@/*` path alias from tsconfig.json. Next.js resolves it during a
  // build, but Vitest has its own resolver — without this, any module under test
  // that imports `@/lib/...` fails to load.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      include: ['src/lib/**', 'src/app/api/**'],
      reporter: ['text', 'json-summary'],
    },
  },
});
