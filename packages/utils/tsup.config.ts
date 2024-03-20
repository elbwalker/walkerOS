import { config, defineConfig } from '@elbwalker/tsup';

const globalName = 'Utils';

export default defineConfig([
  // Full index bundle with definitions
  {
    ...config,
    dts: true,
    format: ['cjs', 'esm'],
    sourcemap: true,
  },
  // Core and Web files
  {
    ...config,
    entry: ['src/core/*', 'src/web/**/*.ts'],
    format: ['cjs', 'esm'],
  },
  // Browser
  {
    ...config,
    entry: ['src/index.ts', 'src/core/*', 'src/web/**/*.ts'],
    format: ['iife'],
    globalName,
    outExtension() {
      return { js: `.browser.js` };
    },
  },
  // Web ES5 files
  {
    ...config,
    entry: ['src/index.ts', 'src/core/*', 'src/web/**/*.ts'],
    format: ['iife'],
    globalName,
    outExtension() {
      return { js: `.es5.js` };
    },
    target: 'es5',
  },
]);
