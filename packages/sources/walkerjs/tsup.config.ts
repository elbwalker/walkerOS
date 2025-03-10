import {
  defineConfig,
  buildModules,
  buildBrowser,
  buildES5,
} from '@elbwalker/tsup';

const globalName = 'Walkerjs';

export default defineConfig([
  buildModules({ format: ['cjs'] }),
  buildModules({ format: ['esm'], noExternal: [/(.*)/] }),
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
