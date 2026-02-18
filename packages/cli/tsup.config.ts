import { defineConfig, baseConfig } from '@walkeros/config/tsup';
import { cpSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { resolve } from 'path';

// Read version at build time
const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'),
);
const version = packageJson.version || '0.0.0';

export default defineConfig([
  // CLI binary (with shebang)
  {
    ...baseConfig,
    entry: ['src/cli.ts', 'src/runtime/main.ts'],
    format: ['esm'],
    dts: false,
    sourcemap: false,
    minify: false,
    banner: {
      js: '#!/usr/bin/env node',
    },
    define: {
      __VERSION__: JSON.stringify(version),
    },
    onSuccess: async () => {
      // Copy examples to dist/ for sibling resolution at runtime
      const distDir = resolve(process.cwd(), 'dist');
      const examplesSource = resolve(process.cwd(), 'examples');

      if (!existsSync(distDir)) {
        mkdirSync(distDir, { recursive: true });
      }

      if (existsSync(examplesSource)) {
        cpSync(examplesSource, resolve(distDir, 'examples'), {
          recursive: true,
        });
      }
    },
  },

  // Library entry (no shebang)
  {
    ...baseConfig,
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    minify: false,
    define: {
      __VERSION__: JSON.stringify(version),
    },
  },

  // Dev entry point (schemas, no shebang)
  {
    ...baseConfig,
    entry: ['src/dev.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    minify: false,
  },
]);
