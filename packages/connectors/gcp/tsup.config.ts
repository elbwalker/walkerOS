import { config, defineConfig } from '@elbwalker/tsup';

export default defineConfig([
  // Modules
  {
    ...config,
    dts: true,
    format: ['cjs', 'esm'],
    sourcemap: true,
  },
]);
