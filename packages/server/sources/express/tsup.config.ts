import { defineConfig, buildModules } from '@walkeros/config/tsup';

export default defineConfig([
  buildModules({
    terserOptions: {}, // Don't mangle here
  }),
  // Schemas build (separate entry for documentation/tooling)
  buildModules({
    entry: ['src/schemas-entry.ts'],
    outDir: 'dist',
  }),
]);
