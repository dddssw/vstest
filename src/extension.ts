import * as vscode from "vscode";

import { TestViewDragAndDrop } from "./testViewDragAndDrop";
const highlightDecoration = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(173, 216, 230, 0.3)' ,
  isWholeLine: true, // 如果需要整行高亮
});
export function activate(context: vscode.ExtensionContext) {
  vscode.commands.registerCommand(
    "vstest.importHook",
    async (key,value,path) => {
      console.log(value);
      const text =key==='default'?value.name:'{'+value.name+'}';
      const insert = `import ${text} from '@/hooks/${path}'`;
         
      const position = getFirstImportLineNumber();
      if (!position) {
        return;
      }
      await vscode.window.activeTextEditor?.edit(async(editBuilder) => {
       await editBuilder.insert(position, `${insert}\r\n`);
      });
      try {
        const constArea = getFirstConstPosition();
  
        const snippet = new vscode.SnippetString(
          `const {${value.returns}} = ${value.name}(${value.params??''})\r\n`
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
          range,range1
        ]);
        setTimeout(() => {
          vscode.window.activeTextEditor?.setDecorations(
            highlightDecoration,
            []
          ); // 取消装饰
        }, 3000); // 5秒后取消装饰
      } catch (error) {
        console.log(error, "sss");
      }
    }
  );
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
