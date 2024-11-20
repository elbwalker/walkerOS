import { config, defineConfig } from '@elbwalker/tsup';

export default defineConfig([
  {
    ...config,
    dts: true,
    format: ['cjs', 'esm'],
    sourcemap: true,
  },
]);
