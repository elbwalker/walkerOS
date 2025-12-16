import {
  defineConfig,
  buildModules,
  buildExamples,
} from '@walkeros/config/tsup';

export default defineConfig([
  buildModules({
    terserOptions: { mangle: false }, // Don't mangle here
  }),
  // Build browser-safe schemas export
  buildModules({
    entry: ['src/browser-schemas.ts'],
    terserOptions: { mangle: false },
  }),
  buildExamples(),
  // Schemas build (separate entry for documentation/tooling)
  buildModules({
    entry: ['src/dev.ts'],
    outDir: 'dist',
  }),
]);
