// This file has been automatically migrated to valid ESM format by Storybook.
import { createRequire } from 'node:module';
import type { StorybookConfig } from '@storybook/react-vite';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve monaco-editor path: check local node_modules first, then monorepo root
function resolveMonacoPath(): string {
  const localPath = path.resolve(
    __dirname,
    '../node_modules/monaco-editor/min/vs',
  );
  const monorepoPath = path.resolve(
    __dirname,
    '../../../node_modules/monaco-editor/min/vs',
  );

  if (existsSync(localPath)) {
    return localPath;
  } else if (existsSync(monorepoPath)) {
    return monorepoPath;
  }

  throw new Error('monaco-editor not found in node_modules. Run npm install.');
}

const config: StorybookConfig = {
  stories: [
    '../.storybook/Introduction.mdx',
    '../src/components/**/*.stories.@(ts|tsx)',
    '../src/**/*.mdx',
  ],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  staticDirs: [
    '../public',
    {
      from: resolveMonacoPath(),
      to: 'monaco-editor/min/vs',
    },
  ],
  async viteFinal(config) {
    const { mergeConfig } = await import('vite');
    const { readFile } = await import('fs/promises');
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);

    return mergeConfig(config, {
      server: {
        fs: {
          // Allow serving files from monorepo root node_modules (for Monaco Editor)
          allow: [
            path.resolve(__dirname, '..'),
            path.resolve(__dirname, '../../..'),
          ],
        },
      },
      optimizeDeps: {
        include: [
          '@monaco-editor/react',
          'monaco-editor',
          '@rjsf/core',
          '@rjsf/utils',
          '@rjsf/validator-ajv8',
          'prettier/standalone',
          'prettier/plugins/babel',
          'prettier/plugins/estree',
          'prettier/plugins/typescript',
          'prettier/plugins/html',
        ],
      },
      plugins: [
        {
          name: 'walkeros-types-virtual-module',
          resolveId(id) {
            if (id === 'virtual:walkeros-core-types') {
              return id;
            }
          },
          async load(id) {
            if (id === 'virtual:walkeros-core-types') {
              // Resolve main module, then construct path to types
              // require.resolve('@walkeros/core') returns /path/to/node_modules/@walkeros/core/dist/index.js
              const mainModulePath = require.resolve('@walkeros/core');
              // Go up from dist/index.js to package root, then to dist/index.d.ts
              const packageRoot = path.dirname(path.dirname(mainModulePath)); // Up two levels from dist/index.js
              const typesPath = path.join(packageRoot, 'dist', 'index.d.ts');
              const content = await readFile(typesPath, 'utf-8');
              return `export default ${JSON.stringify(content)}`;
            }
          },
        },
      ],
    });
  },
};

export default config;
