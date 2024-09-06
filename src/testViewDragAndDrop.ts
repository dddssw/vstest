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
const esbuild = require(/* webpackIgnore: true */ "./esbuild.js");

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
      files = fs.readdirSync(hooksPath);
      const hookList = await this.getImportData(files, hooksPath);
      return hookList as Hooks[];
    } else {
      const childrenList: Hooks[] = [];
      for (const [key, value] of element.hook) {
        const commentList = value.comment;
        let comments = "";
        if (commentList) {
          comments = commentList.map((item) => item.value.trim()).join("\n");
        }
        childrenList.push(
          new ChildHooks(
            key,
            0,
            {
              command: "vstest.importHook",
              title: "import hook",
              arguments: [key, value, element.label],
            },
            comments
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

  async getImportData(files: string[], hooksPath: string) {
    let hookList: Hooks[] = [];

    for (const pathItem of files) {
      try {
        const pathfile = path.join(hooksPath, pathItem);
        const fileURL = pathToFileURL(pathfile).toString();
        const jsPath = fileURL.slice(0, -2) + "js";
        const filePathJs = path.join(hooksPath, pathItem).slice(0, -2) + "js";
        console.log(filePathJs, "filePathJs");

        let tsCode = fs.readFileSync(pathfile, "utf8");
        const result = await esbuild.transform(tsCode, {
          loader: "ts",
          target: "esnext", // 指定输出的 JavaScript 版本
          sourcemap: false, // 是否生成源映射文件
          legalComments: "inline",
        });

        tsCode = result.code;
        const ast = parser.parse(tsCode, {
          sourceType: "module",
        });

        let isExport = false;
        const hooks = new Map();
        const returnsObj = new Map();
        const paramsObj = new Map();

        traverse(ast, {
          ExportNamedDeclaration({ node }) {
            // 检查是否存在声明，如变量声明、函数声明等
            if (node.declaration) {
              console.log(node, "node.declaration");

              isExport = true;
              const { params, body, type } = node.declaration;
              const comment = node.leadingComments;
              const name = node.declaration.id.name;
              if (type === "Identifier") {
                const returns = findReturn(tsCode, name);
                const params = findParams(tsCode, name);
                hooks.set(name, {
                  name,
                  params,
                  type,
                  returns,
                  comment,
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
                  comment,
                });
              }
            }
          },
          ExportDefaultDeclaration({ node }) {
            let label = pathItem.slice(0, -3);
            if (node.declaration) {
              console.log(node, "node.declaration.default");
              isExport = true;
              const { params, body, type, loc } = node.declaration;
               const name = node.declaration.id.name;
              const comment = node.leadingComments;
              if (type === "Identifier") {
                const returns = findReturn(tsCode, name);
                const params = findParams(tsCode, name);
                console.log(tsCode, name, "all");
                hooks.set("default", {
                  name,
                  params,
                  type,
                  returns,
                  comment,
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
                hooks.set("default", {
                  name,
                  params: paramsData,
                  type,
                  returns: returnsData,
                  comment,
                });
              }
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
    public readonly tooltip: string
  ) {
    super(label, collapsibleState);
  }
}
