import {
  defineConfig,
  buildModules,
  buildExamples,
} from '@walkeros/config/tsup';

export default defineConfig([
  buildModules({
    terserOptions: { mangle: false }, // Don't mangle identifiers
  }),
  buildExamples(),
  buildModules({
    entry: ['src/dev.ts'],
    outDir: 'dist',
  }),
]);
