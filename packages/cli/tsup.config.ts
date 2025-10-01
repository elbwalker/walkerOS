import { defineConfig, baseConfig } from '@walkeros/tsup';

export default defineConfig({
  ...baseConfig,
  entry: ['src/index.ts'],
  format: ['esm'],
  outExtension() {
    return { js: '.mjs' };
  },
  dts: false, // No types needed for CLI-only package
  sourcemap: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
