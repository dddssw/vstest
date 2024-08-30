//@ts-check

"use strict";

const path = require("path");
const webpack = require("webpack");

/**@type {import('webpack').Configuration}*/
const config = {
  target: "webworker", // vscode extensions run in webworker context for VS Code web 📖 -> https://webpack.js.org/configuration/target/#target

  entry: "./src/extension.ts", // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, "dist"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]",
  },
  devtool: "source-map",
  externals: {
    vscode: "commonjs vscode", // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    fs: "fs",
    url: "url",
    path: "path",
    child_process: "commonjs child_process",
    buffer: "commonjs buffer",
    "node:util": "commonjs node:util",
    "node:stream": "commonjs node:stream",
    "node:v8": "commonjs node:v8",
    "node:url": "commonjs node:url",
    "node:tty": "commonjs node:tty",
    "node:timers/promises": "commonjs node:timers/promises",
    "node:string_decoder": "commonjs node:string_decoder",
    "node:stream/promises": "commonjs node:stream/promises",
    "node:process": "commonjs node:process",
    "node:path": "commonjs node:path",
    "node:os": "commonjs node:os",
    "node:fs": "commonjs node:fs",
    "node:events": "commonjs node:events",
    "node:buffer": "commonjs node:buffer",
    "node:child_process": "commonjs node:child_process",
    "node:fs/promises": "commonjs node:fs/promises",
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    mainFields: ["browser", "module", "main"], // look for `browser` entry point in imported node modules
    extensions: [".ts", ".js"],
    alias: {
      // provides alternate implementation for node module and source files
    },
    fallback: {
      // Webpack 5 no longer polyfills Node.js core modules automatically.
      // see https://webpack.js.org/configuration/resolve/#resolvefallback
      // for the list of Node.js core module polyfills.
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
          },
        ],
      },
    ],
  },
};
module.exports = config;
