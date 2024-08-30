import * as vscode from "vscode";
import * as fs from "fs";
import { readdir } from "node:fs/promises";
const path = require("path");
import { pathToFileURL } from "url";
import { resolve } from "path";
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
      let files = fs.readdirSync(hooksPath);
      this.addTsIgnore(files);
      this.modifyTsConfig();
      await this.generateJs();
      files = fs.readdirSync(hooksPath);
      const hookList = await this.getImportData(files, hooksPath);
      console.log(hookList, "hooklist2");
      // 在所有文件处理完成后删除 JS 文件
      this.deleteJs(hooksPath);
      return Promise.resolve(hookList);
    } else {
      console.log(element, "element");
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
      await waitForFile(path.join(this.rootPath, "src", "hooks"))
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
        //  console.log(files, "files");
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
  async getImportData(files: string[], hooksPath: string) {
    console.log(files, "kkk");
     const hookPromises = files.map(async (pathItem) => {
       const pathfile = path.join(hooksPath, pathItem);
       const fileURL = pathToFileURL(pathfile).toString();
       const jsPath = fileURL.slice(0, -2) + "js";

       try {
         // 动态导入模块
         const hook = await import(/* webpackIgnore: true */ jsPath);
         let isExport = 1;
         if (!hook) {
           isExport = 0;
         }
         return new Hooks(pathItem.slice(0, -3), hook, isExport);
       } catch (error) {
         console.error(`Failed to import ${jsPath}:`, error);
       }
     });

     // 等待所有异步操作完成
     const hookList = await Promise.all(hookPromises);

     console.log(hookList, "hooklist1");
     return hookList;
  }
  async addTsIgnore(files: string[]) {
    for (const filePath of files) {
      // 构建完整的文件路径
      const fullPath = path.join(this.rootPath, "src", "hooks", filePath);

      // 读取现有文件内容
      const fileContent = fs.readFileSync(fullPath, "utf8");
      const newContent = "// @ts-nocheck\n" + fileContent;

      fs.writeFileSync(fullPath, newContent, "utf8");

      console.log(`Added //@ts-nocheck to the top of ${fullPath}`);
    }
  }
}

export class Hooks extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly hook: boolean,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState // public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
  }
}



async function waitForFile(fileDirPath: string){

  const p =new Promise((resolve,reject)=>{
    setInterval(async()=>{
        const files = await readdir(fileDirPath);
        let tsCount = 0;
        let jsCount = 0;

        for (const file of files) {
          const extname = path.extname(file).toLowerCase();
          if (extname === ".ts") {
            tsCount++;
          } else if (extname === ".js") {
            jsCount++;
          }
        }
console.log(jsCount,tsCount,'count')
        if (tsCount === jsCount) {
           resolve();
        }
      },500)
  })
  await p
}; 