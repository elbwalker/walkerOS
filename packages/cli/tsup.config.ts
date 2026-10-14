import { defineConfig, baseConfig } from '@walkeros/config/tsup';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { cp } from 'fs/promises';
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
    entry: ['src/cli.ts'],
    format: ['esm'],
    dts: false,
    sourcemap: false,
    minify: false,
    noExternal: [/@walkeros\//],
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

      // Async cp: the sync recursive copy fails with EACCES on virtiofs
      // mounts (Docker Desktop dev containers) for nested folders.
      if (existsSync(examplesSource)) {
        await cp(examplesSource, resolve(distDir, 'examples'), {
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

  // CLI-free validate entry: validation without the bundler or the package
  // manager, for a process that must not load them (the app server).
  {
    ...baseConfig,
    entry: { validate: 'src/validate.ts' },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    minify: false,
    // settings.ts builds its X-Walkeros-Client header from __VERSION__.
    define: { __VERSION__: JSON.stringify(version) },
  },

  // Examples barrel (typed re-export of bundled flow.json examples).
  // Emits dist/examples/index.{js,d.ts} so consumers can import
  // `@walkeros/cli/examples` and receive Flow.Json without casting.
  {
    ...baseConfig,
    entry: { 'examples/index': 'src/examples/index.ts' },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    minify: false,
  },
]);
