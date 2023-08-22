import { Options, defineConfig } from 'tsup';

const config: Options = {
  // clean: true, // Not yet supported for multiple entry points
  entry: ['src/index.ts'],
  minify: true, // Don't use terser to minify to preserve Const
  splitting: false,
};

export default defineConfig([
  {
    ...config,
    dts: true,
    format: ['cjs', 'esm'],
    sourcemap: true,
  },
  {
    ...config,
    format: ['iife'],
    globalName: 'Elbutils',
    outExtension() {
      return { js: `.es5.js` };
    },
    target: 'es5',
  },
]);
