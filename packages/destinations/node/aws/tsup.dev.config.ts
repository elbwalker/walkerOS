import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    minify: false,
    dts: true,
    format: ['cjs', 'esm'],
    sourcemap: false,
  },
]);
