import { defineConfig, buildModules, buildDev } from '@walkeros/config/tsup';

export default defineConfig([
  buildModules({
    entry: ['src/index.ts', 'src/sqs/index.ts'],
    terserOptions: { mangle: false }, // Don't mangle identifiers
  }),
  buildDev(),
]);
