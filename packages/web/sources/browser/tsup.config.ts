import {
  defineConfig,
  buildModules,
  buildBrowser,
  buildES5,
} from '@walkeros/config/tsup';

const globalName = 'Source';

export default defineConfig([
  buildModules(),
  buildBrowser({ globalName }),
  buildES5({ globalName }),
]);
