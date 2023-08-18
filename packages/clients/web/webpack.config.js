const commonConfig = require('@elbwalker/webpack');

const es5Config = {
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env', // For ES5 conversion
              '@babel/preset-typescript', // For TypeScript
            ],
          },
        },
      },
    ],
  },
};

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

const es5WalkerConfig = {
  entry: './src/index.ts',
  output: {
    filename: 'walker.es5.js',
    library: {
      type: 'umd',
      name: 'Elbwalker',
      export: 'default',
    },
  },
};

const browserConfig = {
  entry: './src/browser.ts',
  output: {
    filename: 'walker.js',
  },
};

module.exports = [
  { ...commonConfig, ...nodeConfig },
  { ...commonConfig, ...moduleConfig },
  { ...commonConfig, ...es5Config, ...es5WalkerConfig },
  { ...commonConfig, ...browserConfig },
];
