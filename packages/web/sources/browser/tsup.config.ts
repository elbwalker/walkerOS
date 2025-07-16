import {
  defineConfig,
  buildModules,
  buildBrowser,
  buildES5,
} from '@walkerOS/tsup';

const globalName = 'Source';

export default defineConfig([
  buildModules(),
  buildBrowser({ globalName }),
  buildES5({ globalName }),
]);
