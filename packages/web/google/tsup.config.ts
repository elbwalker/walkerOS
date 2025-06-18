import {
  defineConfig,
  buildModules,
  buildExamples,
  buildBrowser,
  buildES5,
} from '@walkerOS/tsup';

const globalName = 'Destination';

export default defineConfig([
  buildModules(),
  // buildExamples({
  // @TODO list all examples
  // entry: { 'examples/index': 'src/*/examples/index.ts' },
  // }),
  buildBrowser({ globalName }),
  buildES5({ globalName }),
]);
