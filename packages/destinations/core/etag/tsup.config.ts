import {
  defineConfig,
  buildModules,
  buildBrowser,
  buildES5,
} from '@elbwalker/tsup';

const globalName = 'Destination';

export default defineConfig([
  buildModules(),
  buildBrowser({ globalName }),
  buildES5({ globalName }),
]);
