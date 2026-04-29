import { defineConfig, baseConfig } from '@walkeros/config/tsup';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'),
);
const version = packageJson.version || '0.0.0';

const common = {
  ...baseConfig,
  format: ['esm'] as const,
  dts: true,
  sourcemap: true,
  minify: false,
  external: [
    'zod',
    '@modelcontextprotocol/sdk',
    '@walkeros/cli',
    '@walkeros/core',
  ],
  define: {
    __VERSION__: JSON.stringify(version),
  },
};

export default defineConfig([
  {
    ...common,
    entry: { index: 'src/index.ts' },
  },
  {
    ...common,
    entry: { stdio: 'src/stdio.ts' },
    banner: { js: '#!/usr/bin/env node' },
  },
]);
