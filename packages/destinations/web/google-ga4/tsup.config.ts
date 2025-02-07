import { config, defineConfig } from '@elbwalker/tsup';

const globalName = 'Destination';

export default defineConfig([
  // Modules and examples
  {
    ...config,
    entry: {
      // Main entry point
      index: 'src/index.ts',
      // Examples in separate directory
      'examples/index': 'examples/index.ts',
    },
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
