import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // Point to the local CLI package so the ./dev subpath resolves
      // (the published npm version may not include the dev export yet).
      '@walkeros/cli': path.resolve(__dirname, '../cli'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
});
