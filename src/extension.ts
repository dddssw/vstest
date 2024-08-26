import * as vscode from 'vscode';
import { TestViewDragAndDrop } from "./testViewDragAndDrop";
export function activate(context: vscode.ExtensionContext) {
// vscode.commands.registerCommand('vstest.helloWorld', () => {
// 	});

	new TestViewDragAndDrop(context);
}

export function deactivate() {}
