import {
  defineConfig,
  buildModules,
  buildExamples,
  buildDev,
} from '@walkeros/config/tsup';

export default defineConfig([
  buildModules({
    terserOptions: { mangle: false },
  }),
  buildExamples(),
  buildDev(),
]);
