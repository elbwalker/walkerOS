import { defineConfig, baseConfig } from '@walkeros/config/tsup';

export default defineConfig({
  ...baseConfig,
  entry: ['src/index.ts'],
  format: ['esm'],
  outExtension() {
    return { js: '.mjs' };
  },
  dts: false, // TODO: Enable after fixing type generation issues with Bundle.Config
  sourcemap: true,
  minify: false, // Disable minification for CLI to avoid runtime issues
  banner: {
    js: '#!/usr/bin/env node',
  },
});
