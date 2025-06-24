import { defineConfig, buildModules, buildExamples } from '@walkerOS/tsup';

export default defineConfig([
  buildModules({
    terserOptions: {}, // Don't mangle here
  }),
]);
