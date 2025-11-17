import { defineConfig, baseConfig } from '@walkeros/config/tsup';

export default defineConfig({
  ...baseConfig,
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  dts: true,
  sourcemap: true,
  minify: false,
  external: ['express', 'cors', 'zod', 'path'],
});
