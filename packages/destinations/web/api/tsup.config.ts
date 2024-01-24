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
    entry: ['src/browser.ts'],
    format: ['iife'],
    globalName: 'Destination',
    outExtension() {
      return { js: `.js` };
    },
  },
  // ES5
  {
    ...config,
    entry: ['src/browser.ts'],
    format: ['iife'],
    globalName: 'Destination',
    minify: true,
    outExtension() {
      return { js: `.es5.js` };
    },
    target: 'es5',
  },
]);
