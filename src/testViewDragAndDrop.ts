import * as vscode from "vscode";
import * as fs from "fs";
const path = require("path");
import { pathToFileURL } from "url";
const { execa } = require("execa");

export class TestViewDragAndDrop
  implements
    vscode.TreeDataProvider<vscode.TreeItem>,
    vscode.TreeDragAndDropController<vscode.TreeItem>
{
  rootPath =
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined;
  private context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    const view = vscode.window.createTreeView("hooks", {
      treeDataProvider: this,
      showCollapseAll: true,
      canSelectMany: true,
      dragAndDropController: this,
    });
    context.subscriptions.push(view);
    this.context = context;
  }

  onDidChangeTreeData?: vscode.Event<any> | undefined;

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    if (!this.rootPath) {
      vscode.window.showInformationMessage("please open project");
      return Promise.resolve([]);
    }
    console.log(this.rootPath, "this.rootPath");
    if (!element) {
      const hooksPath = path.join(this.rootPath, "src", "hooks");

      fs.readdir(hooksPath, (err, files) => {
        if (err) {
          console.error("Error reading directory:", err);
          return;
        }
        console.log(this.context.extensionPath, "_dirname");

        // 定义 tsconfig.json 的路径
        const tsconfigPath = path.join(
          this.context.extensionPath,
          "tsconfig-temp.json"
        );

        // 读取 tsconfig.json 文件
        const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
console.log(tsconfig, "tsconfig");
        // 修改 include 部分
        const additionalIncludes = [this.rootPath+'/src/hooks/**/*.ts']; // 你要添加的路径
        tsconfig.include = additionalIncludes;

        // 写回 tsconfig.json 文件
        fs.writeFileSync(
          tsconfigPath,
          JSON.stringify(tsconfig, null, 2),
          "utf8"
        );

  console.log(JSON.parse(fs.readFileSync(tsconfigPath, "utf8")),'after');
        files.forEach(async (pathItem) => {
          const pathfile = path.join(hooksPath, pathItem);
          const fileURL = pathToFileURL(pathfile).toString();
          try {
            await execa(
              "npx",
              ["tsc", "-p", this.context.extensionPath + "/tsconfig-temp.json"],
              {
                cwd: this.rootPath,
                stdio: "inherit",
              }
            );
          } catch (error) {
            console.error(error, "error");
          }

          const jsPath = fileURL.slice(0, -2) + "js";
          const hook = await import(/* webpackIgnore: true */ jsPath);
          console.log(hook, "import");
        });
      });
    }
    return Promise.resolve([{ label: "123" }]);
  }

  //   getParent?(element: vscode.TreeItem) {
  //     throw new Error("Method not implemented.");
  //   }
  resolveTreeItem?(
    item: vscode.TreeItem,
    element: vscode.TreeItem,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.TreeItem> {
    throw new Error("Method not implemented.");
  }
  dropMimeTypes = ["application/vnd.code.tree.testViewDragAndDrop"];
  dragMimeTypes = ["text/uri-list"];
  handleDrag?(
    source: readonly vscode.TreeItem[],
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Thenable<void> | void {
    throw new Error("Method not implemented.");
  }
  handleDrop?(
    target: any,
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Thenable<void> | void {
    throw new Error("Method not implemented.");
  }
}
