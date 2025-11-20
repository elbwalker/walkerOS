import {
  defineConfig,
  buildModules,
  buildBrowser,
  buildES5,
} from '@walkeros/config/tsup';

const globalName = 'Source';

export default defineConfig([
  buildModules(),
  buildBrowser({ globalName }),
  buildES5({ globalName }),
  // Schemas build (separate entry for documentation/tooling)
  buildModules({
    entry: ['src/schemas-entry.ts'],
    outDir: 'dist',
  }),
]);
