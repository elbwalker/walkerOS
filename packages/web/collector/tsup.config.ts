import {
  defineConfig,
  buildModules,
  buildExamples,
  buildBrowser,
  buildES5,
} from '@walkerOS/tsup';

const globalName = 'Walkerjs';

export default defineConfig([
  buildModules({ format: ['cjs'] }),
  buildModules({ format: ['esm'], noExternal: [/(.*)/] }),
  buildExamples(),
  buildBrowser({ globalName }),
  buildES5({ globalName }),
  // walker.js
  buildBrowser({
    entry: { walker: 'src/walkerjs.ts' },
    outExtension() {
      return { js: `.js` };
    },
    platform: 'browser',
  }),
]);
