import { defineConfig, buildModules } from '@walkeros/tsup';

export default defineConfig([
  buildModules({
    entry: ['src/walker/index.ts'],
    format: ['esm'],
    clean: true,
    dts: true,
    external: ['react', 'react-dom', 'react-router-dom'],
  }),
]);
