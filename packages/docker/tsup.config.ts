import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node18',
  treeshake: true,
  // Don't bundle these - they're external dependencies
  external: [
    '@walkeros/cli',
    '@walkeros/collector',
    '@walkeros/core',
    'express',
    'cors',
    'zod',
    'esbuild', // Cannot bundle esbuild - has native binaries
  ],
  // CLI src imports need to be bundled or resolved
  noExternal: [/@walkeros\/cli\/src/],
});
