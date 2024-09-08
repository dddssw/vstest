import * as vscode from "vscode";
import checkState from "./checkState";
import { TestViewDragAndDrop } from "./testViewDragAndDrop";
const highlightDecoration = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(173, 216, 230, 0.3)' ,
  isWholeLine: true, // 如果需要整行高亮
});
export function activate(context: vscode.ExtensionContext) {
  vscode.commands.registerCommand(
    "vstest.importHook",
    async (value) => {
      console.log(checkState);
      console.log(value);
      const text = value.isDefault ? value.name : "{" + value.name + "}";
      const insert = `import ${text} from '@/hooks/${value.fileName}'`;
         
      const position = getFirstImportLineNumber();
      if (!position) {
        return;
      }
      await vscode.window.activeTextEditor?.edit(async(editBuilder) => {
       await editBuilder.insert(position, `${insert}\r\n`);
      });
      try {
        const constArea = getFirstConstPosition();
        const params = value.params.length>0?value.params.join(','):'';
        const checkInfo = checkState.get(value.label);
//         const returnDataFilter = value.returnData.filter(item=>{
// const find = checkInfo.find(i=>i.returnName === item.returnName);
// if(find.checkboxState===1){
//   return true
// }
//         });
        
        const returns =
          value.returnType === "ObjectExpression"
            ? "{" +
              value.returnData.map((item) => item.returnName).join(",") +
              "}"
            : value.returnData.map((item) => item.returnName).join(","); ;
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
          range,range1
        ]);
        setTimeout(() => {
          vscode.window.activeTextEditor?.setDecorations(
            highlightDecoration,
            []
          ); // 取消装饰
        }, 3000); // 5秒后取消装饰
      } catch (error) {
        console.log(error, "exten");
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
