const { defineConfig } = require('tsup');

const config = {
  // clean: true, // Not yet supported for multiple entry points
  entry: ['src/index.ts'],
  minify: 'terser',
  splitting: false,
};

module.exports = { config, defineConfig };
