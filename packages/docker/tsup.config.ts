import { defineConfig, baseConfig } from '@walkeros/config/tsup';

export default defineConfig({
  ...baseConfig,
  entry: ['src/index.ts'],
  format: ['esm'], // ESM only - pure runtime
  target: 'node18',
  outExtension() {
    return { js: '.mjs' };
  },
  dts: true,
  sourcemap: true,
  minify: false, // No minification for runtime package
  // Bundle Docker's own code, keep only runtime dependencies external
  external: ['express', 'cors', 'zod', 'path'],
});
