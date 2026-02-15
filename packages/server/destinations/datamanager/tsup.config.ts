import {
  defineConfig,
  buildModules,
  buildExamples,
  buildDev,
} from '@walkeros/config/tsup';

export default defineConfig([
  buildModules({
    terserOptions: { mangle: false },
  }),
  // Build browser-safe schemas export
  buildModules({
    entry: ['src/schemas.ts'],
    terserOptions: { mangle: false },
  }),
  buildExamples(),
  buildDev(),
]);
