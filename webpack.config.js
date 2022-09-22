const path = require('path');
const Dotenv = require('dotenv-webpack');
const env = process.env.ENV || 'defaults';

const nodeConfig = {
  mode: 'production',
  entry: './src/node.ts',
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
    libraryTarget : 'commonjs2'
  },
  plugins: [
    new Dotenv({
      path: `./.env.${env}`,
    }),
  ],
};

const browserConfig = {
  mode: 'production',
  entry: './src/browser.ts',
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
  plugins: [
    new Dotenv({
      path: `./.env.${env}`,
    }),
  ],
};

module.exports = [browserConfig, nodeConfig];
