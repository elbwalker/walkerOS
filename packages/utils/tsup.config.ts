import {
  defineConfig,
  buildModules,
  buildBrowser,
  buildES5,
} from '@walkerOS/tsup';

const globalName = 'Utils';
const webFiles = ['src/web.ts'];
const nodeFiles = ['src/node.ts'];

export default defineConfig([
  buildModules(),
  buildModules({
    clean: false,
    entry: webFiles,
    platform: 'browser',
  }),
  buildModules({
    clean: false,
    entry: nodeFiles,
    platform: 'node',
  }),
  // Browser
  buildBrowser({
    globalName,
    entry: webFiles,
  }),
  // Web ES5 files
  buildES5({ globalName, entry: webFiles }),
]);
