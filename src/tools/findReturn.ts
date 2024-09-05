//@ts-nocheck
const fs = require("fs");

export default function findReturn(path,name) {
  try {
    // 使用同步 API 读取文件
    const data = fs.readFileSync(path, "utf8");

    // 清理代码
    const cleanedCode = data.replace(/\s+/g, " ").trim();

    // 查找最后的 return 语句
    const findLastReturn = (code, start, end) => {
      const re = /return\s*\{([^}]*)\}/g;
      let match;
      let lastReturn = "";

      while ((match = re.exec(code.slice(start, end))) !== null) {
        lastReturn = match[1];
      }

      return lastReturn;
    };

    // 查找匹配的右大括号
    const findBraces = (code, start) => {
      let openBraces = 1;
      for (let i = start; i < code.length; i++) {
        if (code[i] === "{") openBraces++;
        if (code[i] === "}") openBraces--;
        if (openBraces === 0) return i;
      }
      return -1; // 如果没有找到匹配的右大括号
    };

    // 假设 useSlicePage 函数在文件的起始位置
    const funcStart = cleanedCode.indexOf(name);
    if (funcStart === -1) {
      console.log("Function not found");
      return;
    }

    const braceStart = cleanedCode.indexOf("{", funcStart);
    if (braceStart === -1) {
      console.log("Left brace not found");
      return;
    }

    const braceEnd = findBraces(cleanedCode, braceStart + 1);
    if (braceEnd === -1) {
      console.log("Right brace not found");
      return;
    }

    const lastReturnPos = findLastReturn(cleanedCode, braceStart, braceEnd);
    return lastReturnPos;
  } catch (err) {
    console.error(err);
  }
}
