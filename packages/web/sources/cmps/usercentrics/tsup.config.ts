import {
  defineConfig,
  buildModules,
  buildExamples,
  buildBrowser,
  buildES5,
} from '@walkeros/config/tsup';

const globalName = 'SourceUsercentrics';

export default defineConfig([
  buildModules(),
  buildExamples(),
  buildBrowser({ globalName }),
  buildES5({ globalName }),
  // Dev build (exports examples for testing)
  buildModules({
    entry: ['src/dev.ts'],
    outDir: 'dist',
  }),
]);
