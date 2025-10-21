import { defineConfig } from '@walkeros/tsup';
import * as sass from 'sass';
import * as path from 'path';

export default defineConfig([
  // Build main module
  {
    entry: { index: 'src/index.ts' },
    clean: true,
    format: ['cjs', 'esm'],
    outExtension({ format }) {
      return { js: format === 'esm' ? '.mjs' : '.js' };
    },
    dts: true,
    sourcemap: true,
    external: ['react', 'react-dom', '@monaco-editor/react', 'monaco-editor'],
    esbuildOptions(options) {
      options.banner = { js: '"use client"' }; // Next.js client component compat
    },
  },

  // Build SCSS separately
  {
    entry: { styles: 'src/styles/index.scss' },
    outDir: 'dist',
    clean: false, // Don't clean between builds
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
