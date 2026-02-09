import { defineConfig, baseConfig } from '@walkeros/config/tsup';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'),
);
const version = packageJson.version || '0.0.0';

export default defineConfig({
  ...baseConfig,
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  minify: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
  define: {
    __VERSION__: JSON.stringify(version),
  },
  external: ['zod'],
});
