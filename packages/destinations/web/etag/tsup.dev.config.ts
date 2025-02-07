import { defineConfig, buildModules, buildBrowser } from '@elbwalker/tsup';

const globalName = 'Destination';

export default defineConfig([
  buildModules({
    minify: false,
    sourcemap: false,
  }),
  buildBrowser({
    globalName,
  }),
]);
