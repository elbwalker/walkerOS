import {
  defineConfig,
  buildModules,
  buildBrowser,
  buildES5,
} from '@elbwalker/tsup';

const globalName = 'Utils';
const webFiles = [
  'src/core.ts',
  'src/core/index.ts',
  'src/web.ts',
  'src/web/index.ts',
];

export default defineConfig([
  buildModules(), // Modules
  buildModules({
    entry: webFiles,
    clean: false,
    dts: true,
    treeshake: true,
    // platform: 'browser',
  }), // Core and Web files
  // Browser
  buildBrowser({
    globalName,
    entry: webFiles.concat('src/core/**/*.ts', 'src/web/**/*.ts'),
  }),
  // Web ES5 files
  buildES5({ globalName, entry: webFiles }),
]);
