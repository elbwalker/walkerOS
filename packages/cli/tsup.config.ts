import { defineConfig, baseConfig } from '@walkeros/config/tsup';
import { cpSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { resolve } from 'path';

// Read version at build time
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
  onSuccess: async () => {
    // Copy templates and examples to dist/ for sibling resolution at runtime
    const distDir = resolve(process.cwd(), 'dist');
    const templatesSource = resolve(process.cwd(), 'templates');
    const examplesSource = resolve(process.cwd(), 'examples');

    if (!existsSync(distDir)) {
      mkdirSync(distDir, { recursive: true });
    }

    if (existsSync(templatesSource)) {
      cpSync(templatesSource, resolve(distDir, 'templates'), {
        recursive: true,
      });
    }

    if (existsSync(examplesSource)) {
      cpSync(examplesSource, resolve(distDir, 'examples'), { recursive: true });
    }

    // TODO: Add logging for copied folders
  },
});
