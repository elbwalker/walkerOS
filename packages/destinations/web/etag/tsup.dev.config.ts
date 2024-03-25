import { config, defineConfig } from '@elbwalker/tsup';

const globalName = 'Destination';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    minify: false,
    dts: true,
    format: ['cjs', 'esm'],
    sourcemap: false,
  },
  {
    ...config,
    format: ['iife'],
    globalName,
    outExtension() {
      return { js: `.browser.js` };
    },
  },
]);
