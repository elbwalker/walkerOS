import { defineConfig, buildModules } from '@walkeros/config/tsup';

export default defineConfig(
  buildModules({
    entry: ['src/index.ts'],
    format: ['esm'],
    target: 'node18',
    minify: false,
    external: ['express', 'cors', 'zod', 'path'],
  }),
);
