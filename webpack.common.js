const path = require("path");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const SpritezeroWebpackPlugin = require("spritezero-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./src/index.js",
  output: {
    filename: "[name].[contenthash].js",
    path: path.resolve(__dirname, "dist")
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      }
    ],
    noParse: /(mapbox-gl)\.js$/
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "src/index.html"
    }),
    new SpritezeroWebpackPlugin({
      source: "sprites/*.svg"
    }),
    new CopyPlugin({
      patterns: [{ from: "sprites", to: "style/sprites" }]
    })
  ]
};
