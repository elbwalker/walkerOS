import { defineConfig, buildModules } from '@walkeros/config/tsup';

export default defineConfig([
  buildModules({
    terserOptions: {},
  }),
  buildModules({
    entry: ['src/dev.ts'],
    outDir: 'dist',
  }),
]);
