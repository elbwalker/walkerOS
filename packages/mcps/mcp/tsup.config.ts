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
  // tsup auto-externalizes every dependency (including `@walkeros/cli`) and,
  // with it, all of the package's subpaths. We want the OPPOSITE for the
  // bundled OpenAPI spec: inline its JSON at build time so the resource and
  // diagnostics serve a build-pinned in-memory copy with no runtime module
  // resolution. `noExternal` forces just that one subpath to be bundled while
  // the rest of `@walkeros/cli` stays external.
  noExternal: [/^@walkeros\/cli\/openapi\/spec\.json$/],
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
