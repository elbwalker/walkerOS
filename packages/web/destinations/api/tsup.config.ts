import {
  defineConfig,
  buildModules,
  buildExamples,
  buildBrowser,
  buildES5,
  buildDev,
} from '@walkeros/config/tsup';

const globalName = 'Walkerjs';

export default defineConfig([
  buildModules({ format: ['cjs'] }),
  buildModules({ format: ['esm'], noExternal: [/(.*)/] }),
  buildExamples(),
  buildBrowser({ globalName }),
  buildES5({ globalName }),
  buildDev(),
]);
