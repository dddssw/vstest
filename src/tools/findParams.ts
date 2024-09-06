//@ts-nocheck
const fs = require("fs");
export default function findReturn(code, name) {
    
  try {

    // 正则表达式匹配 `useSlicePage` 函数参数
  const regex = new RegExp(`${name}\\s*\\(([^)]*)\\)`);
    console.log(regex,'regex')
    const match = code.match(regex);
    console.log(match, "regex");
    if (match && match[1]) {
      return match[1];
    }
  } catch (err) {
    console.error("Error reading file:", err);
  }
}
