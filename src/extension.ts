//@ts-nocheck
import * as vscode from "vscode";
import * as fs from "fs";
const path = require("path");
import checkState from "./checkState";
import { TestViewDragAndDrop } from "./testViewDragAndDrop";
const highlightDecoration = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(173, 216, 230, 0.3)",
  isWholeLine: true, // 如果需要整行高亮
});
export function activate(context: vscode.ExtensionContext) {
  const rootPath =
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined;
  if (!rootPath) {
    return;
  }
  const hooksPath = path.join(rootPath, "src", "hooks");
  const res = fs.existsSync(hooksPath);
  if (!res) {
    return;
  }
  vscode.commands.registerCommand("vstest.importHook", async (value) => {
    let from = "command";
    //从命令/ui来
    if ("value" in value) {
      from = "ui";
      value = value.value;
    }
    console.log(checkState);
    const text = value.isDefault ? value.name : "{" + value.name + "}";
    const insert = `import ${text} from '@/hooks/${value.fileName}'`;

    const position = getFirstImportLineNumber();
    if (!position) {
      return;
    }
    await vscode.window.activeTextEditor?.edit(async (editBuilder) => {
      await editBuilder.insert(position, `${insert}\r\n`);
    });
    try {
      const constArea = getFirstConstPosition();
      const params =
        value.params.length > 0
          ? value.params.map((item) => item.name).join(",")
          : "";
      const checkInfo = checkState.get(value.name);
      const returnDataFilter =
        from === "ui"
          ? value.returnData.filter((item) => {
              const find = checkInfo.find(
                (i) => i.returnName === item.returnName
              );
              if (find.checkboxState === 1) {
                return true;
              }
            })
          : value.returnData;

      const returns =
        value.returnType === "ObjectExpression"
          ? "{" +
            returnDataFilter.map((item) => item.returnName).join(",") +
            "}"
          : returnDataFilter.map((item) => item.returnName).join(",");
      const snippet = new vscode.SnippetString(
        `const ${returns} = ${value.name}(${params})\r\n`
      );
      await vscode.window.activeTextEditor?.insertSnippet(snippet, constArea);
      // 获取插入位置的范围
      const range = new vscode.Range(
        constArea as vscode.Position,
        constArea as vscode.Position
      );
      const range1 = new vscode.Range(
        position as vscode.Position,
        position as vscode.Position
      );

      // 应用装饰
      vscode.window.activeTextEditor?.setDecorations(highlightDecoration, [
        range,
        range1,
      ]);
      setTimeout(() => {
        vscode.window.activeTextEditor?.setDecorations(highlightDecoration, []); // 取消装饰
      }, 3000); // 5秒后取消装饰
    } catch (error) {
      console.log(error, "exten");
    }
  });
  vscode.commands.registerCommand("vstest.importToolHook", async (value) => {
    const position = getFirstImportLineNumber();
    if (!position) {
      return;
    }
    if (!Array.isArray(value)) {
      const data = checkState.get("vueRouter");
      value = data
        .filter((item) => item.checkboxState === 1)
        .map((item) => item.returnName);
    }
    const insert = `import {${value.join(",")}} from 'vue-router'`;
    await vscode.window.activeTextEditor?.edit(async (editBuilder) => {
      await editBuilder.insert(position, `${insert}\r\n`);
    });
    for (const item of value) {
      const constArea = getFirstConstPosition();
      const snippet = new vscode.SnippetString(
        `const ${item.slice(3).toLowerCase()} = ${item}()\r\n`
      );
      await vscode.window.activeTextEditor?.insertSnippet(snippet, constArea);
    }
    const range = new vscode.Range(
      position as vscode.Position,
      position as vscode.Position
    );
    const constArea = getFirstConstPosition();
    const range1 = new vscode.Range(
      constArea as vscode.Position,
      constArea.with({
        line: value.length > 1 ? constArea.line + 1 : constArea.line,
        character: 0,
      }) as vscode.Position
    );
    // 应用装饰
    vscode.window.activeTextEditor?.setDecorations(highlightDecoration, [
      range,
      range1,
    ]);
    setTimeout(() => {
      vscode.window.activeTextEditor?.setDecorations(highlightDecoration, []); // 取消装饰
    }, 3000); // 3秒后取消装饰
  });
  new TestViewDragAndDrop(context);
}
function getFirstImportLineNumber(): vscode.Position | undefined {
  const text = vscode.window.activeTextEditor?.document.getText();
  if (!text) {
    return;
  }
  const importRegex = /^import\s+/m;
  const match = importRegex.exec(text);
  if (match) {
    const position = vscode.window.activeTextEditor?.document.positionAt(
      match.index!
    );
    return position;
  }
  return undefined;
}
function getFirstConstPosition(): vscode.Position | undefined {
  const text = vscode.window.activeTextEditor?.document.getText();
  if (!text) {
    return undefined;
  }

  // 匹配以 'const' 开头的行
  const constRegex = /^const\s+/m;
  const match = constRegex.exec(text);

  if (match) {
    const position = vscode.window.activeTextEditor?.document.positionAt(
      match.index!
    );
    return position;
  }

  return undefined;
}
export function deactivate() {}
