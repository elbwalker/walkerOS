import {
  defineConfig,
  buildModules,
  buildExamples,
  buildDev,
} from '@walkeros/config/tsup';

export default defineConfig([buildModules(), buildExamples(), buildDev()]);
