import { defineConfig, buildModules, baseConfig } from '@walkeros/tsup';

export default defineConfig([
  // Library modules (API)
  buildModules(),

  // CLI executable
  {
    ...baseConfig,
    entry: ['src/index.ts'],
    format: ['cjs'],
    outExtension() {
      return { js: '.cjs' };
    },
    clean: false, // Don't clean since we have multiple builds
    dts: false, // No types needed for CLI
    sourcemap: false,
  },
]);
