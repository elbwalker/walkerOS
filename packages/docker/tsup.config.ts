import { defineConfig, buildModules } from '@walkeros/config/tsup';

export default defineConfig([
  buildModules({
    target: 'node18',
    external: [
      '@walkeros/cli',
      '@walkeros/collector',
      '@walkeros/core',
      'express',
      'cors',
      'zod',
      'esbuild',
    ],
    noExternal: [/@walkeros\/cli\/src/],
  }),
]);
