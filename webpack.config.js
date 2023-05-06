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

const es5WalkerConfig = {
  mode: 'production',
  entry: './src/modules/walker.es5.ts',
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
    filename: 'walker.es5.js',
    library: {
      type: 'umd',
      name: 'Elbwalker',
      export: 'default',
    },
  },
  plugins: [],
};

const es5UtilsConfig = {
  mode: 'production',
  entry: './src/modules/utils.es5.ts',
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
    filename: 'utils.es5.js',
    library: {
      type: 'umd',
      name: 'Elbutils',
      export: 'default',
    },
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

module.exports = [
  browserConfig,
  es5WalkerConfig,
  es5UtilsConfig,
  nodeConfig,
  moduleConfig,
  utilsConfig,
];
