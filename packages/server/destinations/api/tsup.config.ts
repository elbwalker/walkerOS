import {
  defineConfig,
  buildModules,
  buildExamples,
} from '@walkeros/config/tsup';

export default defineConfig([
  buildModules({
    terserOptions: {}, // Don't mangle here
  }),
  buildExamples(),
  buildModules({
    entry: ['src/dev.ts'],
    outDir: 'dist',
  }),
]);
