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
const ts = require("typescript");
import checkState from "./checkState";

export class TestViewDragAndDrop implements vscode.TreeDataProvider<vscode.TreeItem> {
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
    view.onDidChangeCheckboxState(
      (event: vscode.TreeCheckboxChangeEvent<MyTreeItem>) => {
        try {
          console.log("Checkbox state changed:", event);
          
          const data = checkState.get(event.items[0][0].parent);
          let index = data.findIndex(
            (item) => item.returnName === event.items[0][0].label
          );
          console.log(index, "index");
          data[index].checkboxState = event.items[0][0].checkboxState;
        } catch (error) {
          console.log(error, "kkk");
        }
      }
    );
    vscode.commands.registerCommand("vstest.refreshHooks", () =>
      this.refresh()
    );
    context.subscriptions.push(view);
    this.context = context;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<
    Dependency | undefined | void
  > = new vscode.EventEmitter<Dependency | undefined | void>(); //注册一个订阅
  readonly onDidChangeTreeData: vscode.Event<Dependency | undefined | void> =
    this._onDidChangeTreeData.event; //通知树形视图的数据已经发生了变化，需要更新显示
  refresh(): void {
    this._onDidChangeTreeData.fire(); //通知订阅更新
  }

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
      files = fs.readdirSync(hooksPath);
      const hookList = await this.getImportData(files, hooksPath);
      return hookList;
    } else if ("returnData" in element) {
      console.log(element, "sss1");
      const childrenList: Hooks[] = [];

      for (const value of element.returnData) {
        const comments = value.comment;
        const returnName = value.returnName;
        const returnData = value.returnData;
        childrenList.push(
          new ReturnChildHooks(returnName, 0, comments, 1, element.value.name)
        );
      }

      return childrenList;
    }else if (element.label === "vueRouter") {
      const route = new vscode.TreeItem("useRoute", 0);
      route.checkboxState = 1;
      route.parent = 'vueRouter';
      const router = new vscode.TreeItem("useRouter", 0);
      router.checkboxState = 1;
      router.parent = "vueRouter";
      const routerList = [route, router];
      checkState.set("vueRouter", [
        { returnName: "useRoute", checkboxState: 1 },
        { returnName: "useRouter", checkboxState: 1 },
      ]);
      return routerList;
    } else {
      console.log(element, "sss");
      const childrenList: Hooks[] = [];
      for (const [key, value] of element.hook) {
        const comments = value.comment;
        const returnData = value.returnData;
        const initialCheckedState = value.returnData.map((item) => ({
          ...item,
          checkboxState: 1,
        }));
        checkState.set(value.name, initialCheckedState);
        const secData = new ChildHooks(
          key,
          value.returnType === "ObjectExpression" ? 1 : 0,
          {
            command: "vstest.importHook",
            title: "import hook",
            arguments: [value],
          },
          comments,
          returnData,
          key,
          value,
          element.label
        );
        secData.contextValue =
          value.returnType === "ObjectExpression" ? "export" : null;
        secData.params = value.params;
        childrenList.push(secData);
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

  async getImportData(files: string[], hooksPath: string) {
    let hookList: Hooks[] = [];
    const vueRouter = new vscode.TreeItem("vueRouter", 1);
    vueRouter.contextValue = "vueRouterExport";
    const value=['useRoute','useRouter'];
    vueRouter.command = {
      command: "vstest.importToolHook",
      title: "import toolHook",
      arguments: [value],
    };
      hookList.push(vueRouter);
    for (const pathItem of files) {
      try {
        const pathfile = path.join(hooksPath, pathItem);
        const fileURL = pathToFileURL(pathfile).toString();
        const jsPath = fileURL.slice(0, -2) + "js";
        const filePathJs = path.join(hooksPath, pathItem).slice(0, -2) + "js";
        console.log(filePathJs, "filePathJs");

        let tsCode = fs.readFileSync(pathfile, "utf8");
        // const result = await esbuild.transform(tsCode, {
        //   loader: "ts",
        //   target: "esnext", // 指定输出的 JavaScript 版本
        //   sourcemap: false, // 是否生成源映射文件
        //   legalComments: "inline",
        // });
        const result = ts.transpileModule(tsCode, {
          compilerOptions: {
            target: ts.ScriptTarget.ESNext,
          },
        });

        tsCode = result.outputText;
        const ast = parser.parse(tsCode, {
          sourceType: "module",
        });

        let isExport = false;
        const hooks = new Map();

        traverse(ast, {
          ExportNamedDeclaration({ node }) {
            // 检查是否存在声明，如变量声明、函数声明等
            if (node.declaration) {
              console.log(node, "node.declaration");
              isExport = true;
              const name = node.declaration.id.name;
              hooks.set(name, {
                ...dealExport(node, pathItem.slice(0, -3)),
                isDefault: false,
              });
            }
          },
          ExportDefaultDeclaration({ node }) {
            let label = pathItem.slice(0, -3);
            if (node.declaration) {
              console.log(node, "node.declaration.default");
              isExport = true;
              const name = node.declaration.id?.name;
              hooks.set("default", {
                ...dealExport(node, pathItem.slice(0, -3)),
                isDefault: true,
              });
            }
          },
        });

        hookList.push(new Hooks(pathItem.slice(0, -3), isExport, hooks));
      } catch (error) {
        console.log(error, "444");
        vscode.window.showErrorMessage("语法错误");
      }
    }

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
    public readonly tooltip: string,
    public readonly returnData: string,
    public readonly key: string,
    public readonly value: any,
    public readonly filePath: string,
    public readonly params: any,
  ) {
    super(label, collapsibleState);
  }
}
export class ReturnChildHooks extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState, // public readonly command?: vscode.Command
    public readonly tooltip: string,
    public readonly checkboxState: 0 | 1,
    public readonly parent: any
  ) {
    super(label, collapsibleState);
  }
}
function dealComment(node) {
  let comments = "";
  if (node.leadingComments) {
    comments = node.leadingComments.map((item) => item.value.trim()).join("\n");
  }
  return comments;
}
function dealExport(node, fileName) {
  const comment = dealComment(node);
  const { declaration } = node;
  const { declaration:{params = ""} } = node;
  let name = declaration.id ? declaration.id.name : fileName;
  const isFunction = declaration.type.includes("Function");
  let returnData = [];
  let returnType = "";
  //导出的函数
  if (isFunction) {
    const {
      body: { body },
    } = declaration;
    const index = body.findIndex((item) => item.type === "ReturnStatement");
    if (!~index) {
      //   vscode.window.showErrorMessage(
      //     `在 ${fileName}中${name ?? "默认导出"}没有return任何内容`
      //   );
      throw new Error(
        `在 ${fileName}中${name ?? "默认导出"}没有return任何内容`
      );
    }
    const returnNode = body[index];
    const { argument } = returnNode;
    //return返回的是对象
    if (argument.type === "ObjectExpression") {
      returnType = "ObjectExpression";
      const { properties } = argument;
      properties.forEach((item) => {
        const key = item.key.name;
        const value = item.value.name;

        const index = body.findIndex((returnBody) => {
          if (returnBody.declarations) {
            return returnBody.declarations[0].id.name === value;
          }else if (returnBody.id) {
            return returnBody.id.name === value;
          }
        });

        const comment = ~index?dealComment(body[index]):'';
        returnData.push({ returnName: key, comment });
      });
    } else {
      returnType = "NormalExpression";
      const index = body.findIndex((returnBody) => {
        if (returnBody.declarations) {
          return returnBody.declarations[0].id.name === argument.name;
        }
      });
      if (!~index) {
        //   vscode.window.showErrorMessage(`在 ${fileName}中出现语法错误`);
        throw new Error(`在 ${fileName}中出现语法错误`);
      }
      const comment = dealComment(body[index]);
      returnData.push({ returnName: argument.name, comment });
    }
  } else {
    if (declaration) {
      name = declaration.declarations[0].id.name;
    }
  }
  return {
    name,
    comment,
    params,
    isFunction,
    returnData,
    returnType,
    fileName,
  };
}
