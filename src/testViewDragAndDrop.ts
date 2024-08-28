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

  async getChildren(element?: vscode.TreeItem): Promise<Hooks[]> {
    if (!this.rootPath) {
      vscode.window.showInformationMessage("please open project");
      return Promise.resolve([]);
    }
    if (!element) {
      const hooksPath = path.join(this.rootPath, "src", "hooks");
      const files = fs.readdirSync(hooksPath);
      this.modifyTsConfig();
      await this.generateJs();
      const hookList: Hooks[] = [];
      files.forEach(async(pathItem) => {
      const pathfile = path.join(hooksPath, pathItem);
      const fileURL = pathToFileURL(pathfile).toString();
      const jsPath = fileURL.slice(0, -2) + "js";

      // 等待每个 import 完成
      const hook = await import(/* webpackIgnore: true */ jsPath);
      let isExport = 1;
      if (!hook) {
        isExport = 0;
      }
      hookList.push(new Hooks(pathItem.slice(0, -3), hook, isExport));
      });

    // 在所有文件处理完成后删除 JS 文件
    this.deleteJs(hooksPath);
      return Promise.resolve(hookList);
    } else {
     
      console.log(element,'element')
    }
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
  async generateJs() {
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
  }
  deleteJs(hooksPath: string) {
    try {
      // 读取目录内容（同步）
      const files = fs.readdirSync(hooksPath);

      // 遍历文件
      files.forEach((file) => {
        const filePath = path.join(hooksPath, file);
        console.log(files, "files");
        // 检查文件是否是 .js 文件
        if (path.extname(file) === ".js") {
          try {
            // 删除文件（同步）
            fs.unlinkSync(filePath);
            console.log("Deleted file:", filePath);
          } catch (err) {
            console.error("Error deleting file:", err);
          }
        }
      });
    } catch (err) {
      console.error("Unable to scan directory:", err);
    }
  }
  modifyTsConfig() {
    const tsconfigPath = path.join(
      this.context.extensionPath,
      "tsconfig-temp.json"
    );

    // 读取 tsconfig.json 文件
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));

    // 修改 include 部分
    const additionalIncludes = [this.rootPath + "/src/hooks/**/*.ts"]; // 你要添加的路径
    tsconfig.include = additionalIncludes;

    // 写回 tsconfig.json 文件
    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2), "utf8");
  }
}


export class Hooks extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly hook: boolean,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    // public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
  }
}
