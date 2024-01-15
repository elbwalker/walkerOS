import { Options, defineConfig } from 'tsup';

const config: Options = {
  // clean: true, // Not yet supported for multiple entry points
  entry: ['src/index.ts'],
  minify: true, // Don't use terser to minify to preserve Const
  splitting: false,
};

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
    entry: ['src/core/*', 'src/web/*'],
    format: ['cjs', 'esm'],
  },
  // Full index ES5 bundle
  {
    ...config,
    format: ['iife'],
    globalName,
    outExtension() {
      return { js: `.es5.js` };
    },
    target: 'es5',
  },
  // Web ES5 files
  {
    ...config,
    entry: ['src/web/*'],
    format: ['iife'],
    globalName,
    outDir: 'dist/web',
    outExtension() {
      return { js: `.es5.js` };
    },
    target: 'es5',
  },
]);
