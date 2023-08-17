const path = require('path');
const commonConfig = require('@elbwalker/webpack');

const nodeConfig = {
  target: 'node',
  entry: './src/index.ts',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    library: { type: 'commonjs2' },
  },
};

const moduleConfig = {
  entry: './src/index.ts',
  experiments: {
    outputModule: true,
  },
  output: {
    library: {
      type: 'module',
    },
    filename: 'index.mjs',
    path: path.resolve(__dirname, 'dist'),
  },
};

module.exports = [
  { ...commonConfig, ...nodeConfig },
  { ...commonConfig, ...moduleConfig },
];
