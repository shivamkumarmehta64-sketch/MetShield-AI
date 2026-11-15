import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    // `unslop/` is a vendored tool with its own `node:test` suites. Vitest was
    // picking up its `*.test.mjs` files, failing every run with "No test suite
    // found" and blocking `npm run verify` for a reason unrelated to this app.
    // Run those with `node --test unslop/test/` instead.
    exclude: ['**/node_modules/**', '**/dist/**', 'unslop/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './'),
    },
  },
});
