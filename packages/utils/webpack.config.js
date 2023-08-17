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
  entry: './src/es5.ts',
  output: {
    filename: 'index.es5.js',
    library: {
      type: 'umd',
      name: 'Elbutils',
      export: 'default',
    },
  },
};

module.exports = [
  { ...commonConfig, ...nodeConfig },
  { ...commonConfig, ...moduleConfig },
  { ...commonConfig, ...es5Config, ...es5WalkerConfig },
];
