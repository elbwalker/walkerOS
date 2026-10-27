import {
  defineConfig,
  buildModules,
  buildExamples,
  buildBrowser,
  buildES5,
  buildDev,
} from '@walkeros/config/tsup';

const globalName = 'SourceCookiebot';

export default defineConfig([
  buildModules(),
  buildExamples(),
  buildBrowser({ globalName }),
  buildES5({ globalName }),
  buildDev(),
]);
