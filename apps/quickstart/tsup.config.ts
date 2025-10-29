import { defineConfig } from '@walkeros/config/tsup';

export default defineConfig({
  entry: ['src/**/*.ts', '!src/**/*.test.ts', '!src/__tests__/**'],
  format: ['cjs', 'esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  bundle: false,
});
