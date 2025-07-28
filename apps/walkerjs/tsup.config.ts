import {
  defineConfig,
  buildModules,
  buildBrowser,
  buildES5,
} from '@walkeros/tsup';

const globalName = 'Walkerjs';

export default defineConfig([
  buildModules({ format: ['cjs'] }),
  buildModules({ format: ['esm'], noExternal: [/(.*)/] }),
  buildBrowser({
    // globalName,
    format: 'iife',
    entry: { walker: 'src/walkerjs.ts' },
    outExtension() {
      return { js: '.js' };
    },
  }),
  buildES5({ globalName }),
]);
