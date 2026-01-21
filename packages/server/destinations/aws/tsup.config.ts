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
    entry: ['src/schemas.ts'],
    terserOptions: { mangle: false },
  }),
  buildExamples(),
  buildModules({
    entry: ['src/dev.ts'],
    outDir: 'dist',
  }),
]);
