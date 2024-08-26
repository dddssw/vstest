import * as vscode from "vscode";
import * as fs from "fs";
const path =require('path');
import { pathToFileURL } from "url";

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

  constructor(context: vscode.ExtensionContext) {
    const view = vscode.window.createTreeView("hooks", {
      treeDataProvider: this,
      showCollapseAll: true,
      canSelectMany: true,
      dragAndDropController: this,
    });
    context.subscriptions.push(view);
  }

  onDidChangeTreeData?: vscode.Event<any> | undefined;

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    console.log("start");
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
        files.forEach(async(pathItem)=>{
            const totalPath = path.join(hooksPath, pathItem);
            const fileURL = pathToFileURL(totalPath).toString();
           const hook = await import(fileURL);
           console.log(hook,'hooks1');
        });
      });
    }
    return Promise.resolve([{label:'123'}]);
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
