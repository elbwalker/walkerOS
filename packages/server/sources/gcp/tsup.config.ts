import { defineConfig, buildModules } from '@walkeros/tsup';

export default defineConfig([
  buildModules({
    terserOptions: {}, // Don't mangle here
  }),
]);
