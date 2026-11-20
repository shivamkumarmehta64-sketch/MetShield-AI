import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    // `unslop/` is a vendored tool with its own `node:test` suites. Vitest was
    // picking up its `*.test.mjs` files, failing every run with "No test suite
    // found" and blocking `npm run verify` for a reason unrelated to this app.
    // Run those with `node --test unslop/test/` instead.
    // `.claude/` holds agent workspaces: frozen checkouts whose tests duplicate
    // the ones in `__tests__/` and can drift from the working tree.
    exclude: ['**/node_modules/**', '**/dist/**', 'unslop/**', '.claude/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './'),
    },
  },
});
