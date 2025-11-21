import {
  defineConfig,
  buildModules,
  buildExamples,
  buildBrowser,
  buildES5,
} from '@walkeros/config/tsup';

const globalName = 'Destination';

export default defineConfig([
  buildModules(),
  buildExamples(),
  buildBrowser({ globalName }),
  buildES5({ globalName }),
  buildModules({
    entry: ['src/dev.ts'],
    outDir: 'dist',
  }),
]);
