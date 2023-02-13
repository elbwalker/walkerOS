const path = require('path');

const nodeConfig = {
  mode: 'production',
  entry: './src/modules/node.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    library: { type: 'commonjs2' },
  },
  plugins: [],
};

const browserConfig = {
  mode: 'production',
  entry: './src/modules/browser.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'walker.js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [],
};

const moduleConfig = {
  mode: 'production',
  entry: './src/modules/node.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
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
  plugins: [],
};

const utilsConfig = {
  mode: 'production',
  entry: './src/lib/utils.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  experiments: {
    outputModule: true,
  },
  output: {
    library: {
      type: 'module',
    },
    filename: 'utils.js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [],
};

module.exports = [browserConfig, nodeConfig, moduleConfig, utilsConfig];
