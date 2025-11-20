import {
  defineConfig,
  buildModules,
  buildExamples,
} from '@walkeros/config/tsup';

export default defineConfig([
  buildModules({
    terserOptions: {},
  }),
  // Build browser-safe schemas export
  buildModules({
    entry: ['src/schemas.ts'],
    terserOptions: {},
  }),
  buildExamples(),
  // Schemas build (separate entry for documentation/tooling)
  buildModules({
    entry: ['src/schemas-entry.ts'],
    outDir: 'dist',
  }),
]);
