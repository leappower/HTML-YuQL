const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (_, argv = {}) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    entry: './src/index.js',
    output: {
      filename: 'bundle.js',
      path: path.resolve(__dirname, 'dist'),
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
            'postcss-loader',
          ],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/index.html',
      }),
      ...(isProduction
        ? [
          new MiniCssExtractPlugin({
            filename: 'styles.[contenthash:8].css',
          }),
          // Copy language files for static deployment
          new CopyWebpackPlugin({
            patterns: [
              {
                from: 'src/assets/lang',
                to: 'assets/lang',
                noErrorOnMissing: true,
              },
              {
                from: 'src/sw.js',
                to: 'sw.js',
                noErrorOnMissing: true,
              },
            ],
          }),
        ]
        : []),
    ],
    devServer: {
      static: [
        {
          directory: path.join(__dirname, 'dist'),
        },
        // Try dist/assets/lang first (new format with split files), fallback to src/assets/lang
        {
          directory: path.join(__dirname, 'dist/assets/lang'),
          publicPath: '/assets/lang',
        },
        {
          directory: path.join(__dirname, 'src/assets/lang'),
          publicPath: '/assets/lang',
        },
        {
          directory: path.join(__dirname, 'src/sw.js'),
          publicPath: '/sw.js',
        },
      ],
      compress: true,
      port: 3000,
      headers: {
        'Service-Worker-Allowed': '/',
      },
    },
  };
};
