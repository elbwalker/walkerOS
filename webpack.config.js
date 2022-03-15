const path = require('path');
const Dotenv = require('dotenv-webpack');
const env = process.env.ENV || 'defaults';

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
    filename: 'walker.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  plugins: [
    new Dotenv({
      path: `./.env.${env}`,
      safe: true, // load '.env.example' to verify the '.env' variables are all set
      defaults: true, // load '.env.defaults' as the default values if empty
    }),
  ],
};
