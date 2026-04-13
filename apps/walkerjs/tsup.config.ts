import {
  defineConfig,
  buildModules,
  buildBrowser,
  buildDev,
  buildES5,
} from '@walkeros/config/tsup';

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
  buildDev(),
  buildES5({ globalName }),
]);
