"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vite_1 = require("vite");
exports.default = (0, vite_1.defineConfig)({
    build: {
        outDir: "dist", // 输出目录
        rollupOptions: {
            output: {
                entryFileNames: "src/extension.ts", // 设置入口文件的输出名称
                chunkFileNames: "[name].js", // 设置代码拆分文件的输出名称
                assetFileNames: "[name].[ext]", // 设置静态资源文件的输出名称
            },
        },
    },
});
//# sourceMappingURL=vite.config.js.map