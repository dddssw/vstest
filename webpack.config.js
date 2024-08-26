const path = require("path");

module.exports = {
  entry: "./src/extension.ts", // 入口文件
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js", // 输出文件名称
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"], // 解析这些文件扩展名
  },
  devServer: {
    contentBase: path.join(__dirname, "dist"),
    compress: true,
    port: 9000,
  },
   target: 'node',
  externals: {
    vscode: "commonjs vscode", // 排除 vscode 模块
    // fs: "fs",
    // path: "path",
    // url: "url",
  },
};
