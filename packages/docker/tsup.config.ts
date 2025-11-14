import { defineConfig, baseConfig } from '@walkeros/config/tsup';

export default defineConfig({
  ...baseConfig,
  entry: ['src/index.ts'],
  format: ['esm'], // ESM only - like CLI
  target: 'node18',
  outExtension() {
    return { js: '.mjs' };
  },
  dts: true,
  sourcemap: true,
  minify: false, // No minification for runtime package
  // Bundle Docker's own code, but keep all dependencies external
  external: [
    '@walkeros/cli', // Don't re-bundle CLI (it already bundles its deps)
    '@walkeros/collector',
    '@walkeros/core',
    'express',
    'cors',
    'zod',
    'fs-extra', // CJS module - must be external in ESM
    'path',
    'fs/promises',
  ],
});
