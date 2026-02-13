import {
  defineConfig,
  buildModules,
  buildExamples,
  buildDev,
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
  buildDev(),
]);
