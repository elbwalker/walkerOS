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
  // The examples reference ships inside the package: a host that bundles the
  // server has no @walkeros/cli on disk to read it from.
  noExternal: ['@walkeros/cli/examples/flow-complete.json'],
  define: {
    __VERSION__: JSON.stringify(version),
  },
};

export default defineConfig([
  // The main and the spec entry share chunks, so both carry one
  // RuntimeRefusal class and an instanceof check holds across them.
  {
    ...common,
    entry: { index: 'src/index.ts', specs: 'src/specs.ts' },
    splitting: true,
  },
  {
    ...common,
    entry: { stdio: 'src/stdio.ts' },
    banner: { js: '#!/usr/bin/env node' },
  },
]);
