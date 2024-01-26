import { config, defineConfig } from '@elbwalker/tsup';

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
    globalName: 'Destination',
    outExtension() {
      return { js: `.browser.js` };
    },
  },
  // ES5
  {
    ...config,
    format: ['iife'],
    globalName: 'Destination',
    outExtension() {
      return { js: `.es5.js` };
    },
    target: 'es5',
  },
]);
