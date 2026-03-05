import { defineConfig, buildModules } from '@walkeros/config/tsup';
import * as sass from 'sass';
import * as path from 'path';
import * as fs from 'fs';
import { createRequire } from 'module';

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
]);
