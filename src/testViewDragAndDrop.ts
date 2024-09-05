//@ts-nocheck
import * as vscode from "vscode";
import * as fs from "fs";
import { readdir } from "node:fs/promises";
const path = require("path");
import { pathToFileURL } from "url";
import Module from "module";
const { execa } = require("execa");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
import findReturn from "./tools/findReturn";
import findParams from "./tools/findParams";

export class TestViewDragAndDrop
  implements vscode.TreeDataProvider<vscode.TreeItem>
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
    });
    context.subscriptions.push(view);
    this.context = context;
  }

  onDidChangeTreeData?: vscode.Event<any> | undefined;

  getTreeItem(element: Hooks): Hooks {
    return element;
  }

  async getChildren(element?: ChildHooks): Promise<Hooks[]> {
    if (!this.rootPath) {
      vscode.window.showInformationMessage("please open project");
      return Promise.resolve([]);
    }
    if (!element) {
      const hooksPath = path.join(this.rootPath, "src", "hooks");
      let files = fs.readdirSync(hooksPath);
      //this.addTsIgnore(files);
      this.modifyTsConfig();
      await this.generateJs();
      files = fs.readdirSync(hooksPath);
      const hookList = await this.getImportData(files, hooksPath);
      vscode.window.showInformationMessage(hookList.toString(), "hooklist");
      console.log(hookList, "hooklist2");
      // 在所有文件处理完成后删除 JS 文件
      this.deleteJs(hooksPath);
      return hookList as Hooks[];
    } else {
       console.log(element.hook, "element");
      const childrenList: Hooks[] = [];
      for (const [key, value] of element.hook) {
        console.log(element.hook, key, "key");
        childrenList.push(
          new ChildHooks(
            key,
            0,
            {
              command: "vstest.importHook",
              title: "import hook",
              arguments: [key, value, element.label],
            },
            value.commentLine
          )
        );
      }
      return childrenList;
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
      await waitForFile(path.join(this.rootPath, "src", "hooks"));
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
    let hookList: Hooks[] = [];
    files.forEach(async (pathItem) => {
      if (pathItem.slice(-2) === "ts") {
        return;
      }
      try {
        const pathfile = path.join(hooksPath, pathItem);
        const fileURL = pathToFileURL(pathfile).toString();
        const jsPath = fileURL.slice(0, -2) + "js";
        const filePathJs = path.join(hooksPath, pathItem).slice(0, -2) + "js";
        console.log(filePathJs, "filePathJs");
        const data = fs.readFileSync(filePathJs, "utf8");
        const updatedData = data.replace(/^import.*;$/gm, "");
        // 同步写入修改后的内容
        fs.writeFileSync(filePathJs, updatedData, "utf8");
        // 使用 @babel/parser 来解析代码
        const ast = parser.parse(updatedData, {
          sourceType: "module", // 指定为模块，支持 import 和 export
        });
          const lines = updatedData.split("\n");
        let isExport = false;
        const hooks = new Map();
        const returnsObj = new Map();
        const paramsObj = new Map();
        // 使用 @babel/traverse 来遍历 AST
        traverse(ast, {
          ExportNamedDeclaration({ node }) {
            // 检查是否存在声明，如变量声明、函数声明等
            if (node.declaration) {
              console.log(node.declaration, "node.declaration");
            

              isExport = true;
              const { params, body, type,loc } = node.declaration;
               const commentLine = lines[loc.start.line-2];
              //  console.log(loc.start.line, updatedData, thirdLine, "thirdLine");
              const name = node.declaration.id.name;
              if (type === "Identifier") {
                const returns = findReturn(filePathJs, name);
                const params = findParams(filePathJs, name);
                hooks.set(name, {
                  name,
                  params,
                  type,
                  returns,
                  commentLine,
                });
              } else {
                console.log(body, "bpdy1");
                const find = body.body.find(
                  (item) => item.type === "ReturnStatement"
                );
                const returnsData = find.argument.properties
                  ? find.argument.properties
                      .map((item) => item.key.name)
                      .join(",")
                  : find.argument.name;
                const paramsData = params.map((item) => item.name).join(",");
                hooks.set(name, {
                  name,
                  params: paramsData,
                  type,
                  returns: returnsData,
                  commentLine,
                });
              }
            }
            // else if (node.specifiers) {
            //   // 对于 export { namedSpecifier } from '...' 的情况
            //   node.specifiers.forEach((specifier) => {
            //     console.log("Named Export:", specifier.exported.name);
            //   });
            // }
          },
          ExportDefaultDeclaration({ node }) {
            let label = pathItem.slice(0, -3);
            if (node.declaration) {
             
              console.log(node.declaration, "node.declaration.default");
              isExport = true;
              const { name, params, body, type,loc } = node.declaration;
                const commentLine = lines[loc.start.line - 2];
              if (type === "Identifier") {
                const returns = findReturn(filePathJs, name);
                const params = findParams(filePathJs, name);
                hooks.set("default", {
                  name,
                  params,
                  type,
                  returns,
                  commentLine,
                });
              } else {
                console.log(body, "bpdy2");
                const find = body.body.find(
                  (item) => item.type === "ReturnStatement"
                );
                const returnsData = find.argument.properties
                  ? find.argument.properties
                      .map((item) => item.key.name)
                      .join(",")
                  : find.argument.name;
                const paramsData = params.map((item) => item.name).join(",");
                hooks.set(name, {
                  name,
                  params: paramsData,
                  type,
                  returns: returnsData,
                  commentLine,
                });
              }
            }
          },
        });
        if (pathItem.slice(0, -3) === "useCascaderFitContnet") {
          console.log(hooks);
        }
        hookList.push(new Hooks(pathItem.slice(0, -3), isExport, hooks));
      } catch (error) {
        console.log(error,'123');
      }
    });
    return hookList;
  }
}
interface module {
  default?: Module;
}
type Node = { key: string };
export class Hooks extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState, // public readonly command?: vscode.Command
    public readonly hook: module
  ) {
    super(label, collapsibleState);
  }
}
export class ChildHooks extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState, // public readonly command?: vscode.Command
    public readonly command: any,
    public readonly tooltip: string
  ) {
    super(label, collapsibleState);
  }
}

async function waitForFile(fileDirPath: string) {
  const p = new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
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
      console.log(jsCount, tsCount, "count");
      if (tsCount === jsCount) {
        clearInterval(interval);
        //@ts-ignore
        resolve();
      }
    }, 500);
  });
  await p;
}
