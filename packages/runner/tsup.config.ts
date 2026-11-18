import { defineConfig, baseConfig } from '@walkeros/config/tsup';

export default defineConfig([
  // runneros binary (with shebang), and the flow child `runneros remote`
  // forks (dist/remote-child.js, no package entry). @walkeros/* is inlined
  // so each file is self-contained and its whole closure is greppable in one
  // file.
  {
    ...baseConfig,
    entry: { bin: 'src/bin.ts', 'remote-child': 'src/remote/child-entry.ts' },
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
