import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Integration tests hit a real Postgres (DATABASE_URL). Run with `pnpm test:int`.
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['dotenv/config'],
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
});
