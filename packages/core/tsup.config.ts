import { defineConfig, buildModules } from '@walkeros/config/tsup';

export default defineConfig([
  buildModules(),

  buildModules({
    entry: ['src/dev.ts'],
    outDir: 'dist',
  }),

  // Node-only helpers (temp paths, terminal logger config). Kept out of `.`
  // so browser consumers never evaluate a node builtin.
  buildModules({
    entry: ['src/node.ts'],
    outDir: 'dist',
  }),
]);
