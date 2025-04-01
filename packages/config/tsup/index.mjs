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
  outExtension({ format }) {
    return { js: format === 'esm' ? '.mjs' : '.js' };
  },
  dts: true,
  sourcemap: true,
  declaration: true,
  declarationMap: true,
  ...customConfig,
});

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
