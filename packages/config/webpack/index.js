const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
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
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          ecma: 5,
          warnings: false,
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log'],
          },
          mangle: {
            properties: {
              regex: /^[A-Z]/, // Only mangle capitalized properties
              reserved: [
                'Elbwalker', // Prevent mangling of Elbwalker
              ],
            },
          },
          module: true,
          output: {
            comments: false,
            beautify: false,
          },
          toplevel: true,
          nameCache: null,
          ie8: false,
          keep_classnames: undefined,
          keep_fnames: false,
          safari10: false,
        },
      }),
    ],
  },
  devtool: 'source-map',
};
