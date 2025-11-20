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
  // Schemas build (separate entry for documentation/tooling)
  buildModules({
    entry: ['src/schemas-entry.ts'],
    outDir: 'dist',
  }),
]);
