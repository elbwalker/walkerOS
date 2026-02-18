import { defineConfig, buildModules, buildDev } from '@walkeros/config/tsup';

export default defineConfig([
  buildModules({
    terserOptions: { mangle: false }, // Don't mangle identifiers
  }),
  buildDev(),
]);
