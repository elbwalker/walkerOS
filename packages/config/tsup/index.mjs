import { defineConfig } from 'tsup';

const baseConfig = {
  entry: ['src/index.ts'],
  minify: 'terser',
  splitting: false,
};

// Modules
const buildModules = (customConfig = {}) => ({
  ...baseConfig,
  clean: true,
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  ...customConfig,
});

// Examples
const buildExamples = (customConfig = {}) => ({
  ...baseConfig,
  entry: { 'examples/index': 'examples/index.ts' },
  dts: true,
  sourcemap: false,
  format: ['cjs', 'esm'],
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
