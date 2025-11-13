import { defineConfig, baseConfig } from '@walkeros/config/tsup';

export default defineConfig({
  ...baseConfig,
  entry: ['src/index.ts'],
  format: ['esm'],
  outExtension() {
    return { js: '.mjs' };
  },
  dts: false, // No types needed for CLI-only package
  sourcemap: true,
  minify: false, // Disable minification for CLI to avoid runtime issues
  banner: {
    js: '#!/usr/bin/env node',
  },
});
