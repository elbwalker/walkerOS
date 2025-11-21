import {
  defineConfig,
  buildModules,
  buildExamples,
} from '@walkeros/config/tsup';

export default defineConfig([
  buildModules({
    terserOptions: {}, // Don't mangle here
  }),
  // Build browser-safe schemas export
  buildModules({
    entry: ['src/schemas.ts'],
    terserOptions: {},
  }),
  buildModules({
    entry: ['src/dev.ts'],
    outDir: 'dist',
  }),
]);
