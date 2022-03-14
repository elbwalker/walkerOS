const Dotenv = require('dotenv-webpack');
const path = require('path');

module.exports = {
  entry: './src/index.ts',
  mode: 'production',
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
  },
  plugins: [
    new Dotenv({
      path: `./.env.${process.env.ENV}`,
      safe: true, // load '.env.example' to verify the '.env' variables are all set
      defaults: true, // load '.env.defaults' as the default values if empty
    }),
  ],
};
