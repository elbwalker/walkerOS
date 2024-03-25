import { config, defineConfig } from '@elbwalker/tsup';

const globalName = 'Destination';

export default defineConfig([
  // CJS
  {
    ...config,
    dts: true,
    format: ['cjs'],
    sourcemap: true,
  },
  // Module mjs
  {
    ...config,
    noExternal: [/(.*)/],
    format: ['esm'],
  },
  // Browser
  {
    ...config,
    format: ['iife'],
    globalName,
    outExtension() {
      return { js: `.browser.js` };
    },
  },
  // ES5
  {
    ...config,
    format: ['iife'],
    globalName,
    outExtension() {
      return { js: `.es5.js` };
    },
    target: 'es5',
  },
]);
