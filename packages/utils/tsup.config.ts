import { config, defineConfig } from '@elbwalker/tsup';

const globalName = 'Utils';
const filesCoreWeb = [
  'src/core.ts',
  'src/core/index.ts',
  'src/web.ts',
  'src/web/index.ts',
];

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
    entry: filesCoreWeb,
    format: ['cjs', 'esm'],
  },
  // Browser
  {
    ...config,
    entry: filesCoreWeb.concat('src/core/**/*.ts', 'src/web/**/*.ts'),
    format: ['iife'],
    globalName,
    outExtension() {
      return { js: `.browser.js` };
    },
  },
  // Web ES5 files
  {
    ...config,
    entry: filesCoreWeb,
    format: ['iife'],
    globalName,
    outExtension() {
      return { js: `.es5.js` };
    },
    target: 'es5',
  },
]);
