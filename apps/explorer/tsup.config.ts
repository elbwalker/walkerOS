import { defineConfig, buildModules } from '@walkeros/config/tsup';
import * as sass from 'sass';
import * as path from 'path';
import * as fs from 'fs';
import { createRequire } from 'module';
import { writeDesign } from './src/design/generate';

// The design generator runs before any block below. It parses design/tokens.json
// (a malformed token throws with its JSON path and fails the build), refreshes
// the generated src/design/index.ts and writes dist/design/{tokens,tailwind,base}.css.
writeDesign(process.cwd());

export default defineConfig([
  // JS/TS build using shared config base
  buildModules({
    platform: 'browser',
    external: [
      'react',
      'react-dom',
      '@monaco-editor/react',
      'monaco-editor',
      '@walkeros/core',
      '@rjsf/core',
      '@rjsf/utils',
      '@rjsf/validator-ajv8',
      '@walkeros/collector',
      '@walkeros/web-source-browser',
    ],
    noExternal: ['clsx', 'tailwind-merge', '@iconify/react'],
    // Explorer ships React client components, so the bundle is marked with a
    // top-of-file "use client" directive (see esbuildOptions banner below).
    // Terser's compress pass drops any directive prologue it doesn't recognise
    // (it keeps only "use strict"), which would strip our banner. Disabling
    // `directives` preserves it so Next.js treats the package as a client boundary.
    terserOptions: { compress: { directives: false } },
    esbuildPlugins: [
      {
        name: 'virtual-walkeros-types',
        setup(build) {
          const require = createRequire(import.meta.url);

          build.onResolve({ filter: /^virtual:walkeros-core-types$/ }, () => ({
            path: 'virtual:walkeros-core-types',
            namespace: 'walkeros-types',
          }));

          build.onLoad(
            { filter: /.*/, namespace: 'walkeros-types' },
            async () => {
              const mainModulePath = require.resolve('@walkeros/core');
              const packageRoot = path.dirname(path.dirname(mainModulePath));
              const typesPath = path.join(packageRoot, 'dist', 'index.d.ts');
              const content = await fs.promises.readFile(typesPath, 'utf-8');
              return {
                contents: `export default ${JSON.stringify(content)}`,
                loader: 'js',
              };
            },
          );
        },
      },
    ],
    esbuildOptions(options) {
      options.banner = { js: '"use client"' };
      options.define = {
        ...options.define,
        'process.versions.node': 'undefined',
      };
    },
  }),

  // SCSS build (explorer-specific)
  {
    entry: { styles: 'src/styles/index.scss' },
    outDir: 'dist',
    clean: false,
    esbuildPlugins: [
      {
        name: 'sass',
        setup(build) {
          build.onLoad({ filter: /\.scss$/ }, async (args) => {
            const result = sass.compile(args.path, {
              loadPaths: [path.dirname(args.path)],
            });
            return {
              contents: result.css,
              loader: 'css',
            };
          });
        },
      },
    ],
  },

  // Design constants (@walkeros/explorer/design): an own block, so no "use client"
  // banner; server code such as an email builder imports these values. The
  // package is "type": "module", so the CommonJS build needs the .cjs extension
  // for require() to load it.
  buildModules({
    entry: { 'design/index': 'src/design/index.ts' },
    platform: 'neutral',
    minify: false,
    outExtension: ({ format }) => ({ js: format === 'esm' ? '.mjs' : '.cjs' }),
  }),

  // walkeros-design-check: plain Node ESM with a shebang and no runtime dependency.
  {
    entry: { 'design/check': 'src/design/check/bin.ts' },
    outDir: 'dist',
    format: ['esm'],
    platform: 'node',
    target: 'node20',
    outExtension: () => ({ js: '.mjs' }),
    banner: { js: '#!/usr/bin/env node' },
    clean: false,
    dts: false,
    minify: false,
    sourcemap: false,
    // Keep `node:` on the built-in imports, so the bin visibly reads Node only.
    removeNodeProtocol: false,
  },
]);
