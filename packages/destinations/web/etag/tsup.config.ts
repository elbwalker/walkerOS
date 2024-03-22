import { config, defineConfig } from '@elbwalker/tsup';

const globalName = 'Destination';

export default defineConfig([
  // Modules
  {
    ...config,
    dts: true,
    format: ['cjs', 'esm'],
    sourcemap: true,
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
