import { defineConfig, buildModules } from '@walkeros/config/tsup';

export default defineConfig([
  buildModules({
    terserOptions: {}, // Don't mangle here
  }),
]);
