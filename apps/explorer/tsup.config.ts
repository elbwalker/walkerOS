import type { Options } from 'tsup';
import { defineConfig } from 'tsup';

// Library build - for React ecosystem (ESM/CJS)
const libraryConfig: Options = {
  name: 'library',
  target: 'es2015',
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  platform: 'browser',
  outExtension({ format }) {
    if (format === 'esm') return { js: '.mjs' };
    if (format === 'cjs') return { js: '.cjs' };
    return { js: '.js' };
  },
  outDir: 'dist',
};

// Standalone build - for direct browser usage (IIFE)
const standaloneConfig: Options = {
  name: 'standalone',
  target: 'es2015',
  dts: false,
  clean: false,
  splitting: false,
  sourcemap: true,
  minify: false,
  entry: ['src/index.ts'],
  format: ['iife'],
  globalName: 'WalkerExplorer',
  platform: 'browser',
  outExtension: () => ({ js: '.js' }),
  outDir: 'dist',
  esbuildOptions(options) {
    options.bundle = true;
  },
  external: [], // Bundle everything for standalone
  onSuccess: async () => {
    const fs = await import('fs');
    const path = await import('path');

    // Rename standalone build to explorer.js
    const standalonePath = path.join('dist', 'index.js');
    const explorerPath = path.join('dist', 'explorer.js');

    if (fs.existsSync(standalonePath)) {
      fs.copyFileSync(standalonePath, explorerPath);
      fs.unlinkSync(standalonePath);

      // Also handle sourcemap
      const standaloneMapPath = path.join('dist', 'index.js.map');
      const explorerMapPath = path.join('dist', 'explorer.js.map');
      if (fs.existsSync(standaloneMapPath)) {
        fs.copyFileSync(standaloneMapPath, explorerMapPath);
        fs.unlinkSync(standaloneMapPath);
      }
    }

    // Copy examples folder to dist
    const examplesSourcePath = 'examples';
    const examplesDestPath = path.join('dist', 'examples');

    if (fs.existsSync(examplesSourcePath)) {
      // Remove existing examples in dist if any
      if (fs.existsSync(examplesDestPath)) {
        fs.rmSync(examplesDestPath, { recursive: true, force: true });
      }

      // Copy examples folder recursively
      fs.cpSync(examplesSourcePath, examplesDestPath, { recursive: true });
      console.log('✅ Examples copied to dist/examples');
    }
  },
};

export default defineConfig([libraryConfig, standaloneConfig]);
