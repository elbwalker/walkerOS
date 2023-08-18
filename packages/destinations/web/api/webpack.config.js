const commonConfig = require('@elbwalker/webpack');

const nodeConfig = {
  target: 'node',
  entry: './src/index.ts',
  output: {
    filename: 'index.js',
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
  },
};

module.exports = [
  { ...commonConfig, ...nodeConfig },
  { ...commonConfig, ...moduleConfig },
];
