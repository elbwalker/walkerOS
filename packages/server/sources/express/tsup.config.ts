import { defineConfig, buildModules } from '@walkeros/config/tsup';

export default defineConfig([
  buildModules({
    terserOptions: { mangle: false }, // Don't mangle identifiers
  }),
  // Schemas build (separate entry for documentation/tooling)
  buildModules({
    entry: ['src/dev.ts'],
    outDir: 'dist',
  }),
]);
