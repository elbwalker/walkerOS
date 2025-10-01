import { defineConfig } from 'tsup';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const baseConfig = {
  entry: ['src/index.ts'],
  minify: 'terser',
  splitting: false,
};

// Modules
const buildModules = (customConfig = {}) => {
  // Auto-inject package version
  let version = '0.0.0';
  try {
    const packagePath = resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
    version = pkg.version || '0.0.0';
  } catch (error) {
    console.warn('Could not read package.json for version injection:', error.message);
  }

  return {
    ...baseConfig,
    clean: true,
    format: ['cjs', 'esm'],
    outExtension({ format }) {
      return { js: format === 'esm' ? '.mjs' : '.js' };
    },
    dts: true,
    sourcemap: true,
    declaration: true,
    declarationMap: true,
    define: {
      __VERSION__: JSON.stringify(version),
      ...customConfig.define,
    },
    ...customConfig,
  };
};

// Examples
const buildExamples = (customConfig = {}) => ({
  ...baseConfig,
  entry: { 'examples/index': 'src/examples/index.ts' },
  dts: true,
  minify: false,
  format: ['cjs', 'esm'],
  outExtension({ format }) {
    return { js: format === 'esm' ? '.mjs' : '.js' };
  },
  ...customConfig,
});

// Browser
const buildBrowser = (customConfig = {}) => ({
  ...baseConfig,
  format: ['iife'],
  outExtension() {
    return { js: `.browser.js` };
  },
  ...customConfig,
});

// ES5
const buildES5 = (customConfig = {}) => ({
  ...baseConfig,
  format: ['iife'],
  target: 'es5',
  outExtension() {
    return { js: `.es5.js` };
  },
  ...customConfig,
});

export {
  baseConfig,
  buildModules,
  buildExamples,
  buildBrowser,
  buildES5,
  defineConfig,
};
