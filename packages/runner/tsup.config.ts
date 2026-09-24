import { defineConfig, baseConfig } from '@walkeros/config/tsup';

export default defineConfig([
  // runneros binary (with shebang). @walkeros/* is inlined so the binary is
  // self-contained and its whole closure is greppable in one file.
  {
    ...baseConfig,
    entry: ['src/bin.ts'],
    format: ['esm'],
    dts: false,
    sourcemap: false,
    minify: false,
    noExternal: [/@walkeros\//],
    banner: {
      js: '#!/usr/bin/env node',
    },
  },

  // Library entry (no shebang)
  {
    ...baseConfig,
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    minify: false,
  },
]);
