import { defineConfig, buildModules, buildExamples } from '@elbwalker/tsup';

export default defineConfig([
  buildModules({
    terserOptions: {}, // Don't mangle here
  }),
  buildExamples(),
]);
