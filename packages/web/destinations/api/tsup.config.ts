import {
  defineConfig,
  buildModules,
  buildExamples,
  buildBrowser,
  buildES5,
} from '@walkeros/config/tsup';

const globalName = 'Walkerjs';

export default defineConfig([
  buildModules({ format: ['cjs'] }),
  buildModules({ format: ['esm'], noExternal: [/(.*)/] }),
  buildExamples(),
  buildBrowser({ globalName }),
  buildES5({ globalName }),
  // Schemas build (separate entry for documentation/tooling)
  buildModules({
    entry: ['src/schemas-entry.ts'],
    outDir: 'dist',
  }),
]);
