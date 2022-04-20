// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';
import {createReadStream} from 'fs';
import {createInterface} from 'readline';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
async function processLineByLine(uri: vscode.Uri): Promise<string> {
	const fileStream = createReadStream(uri.path);
  
	const rl = createInterface({
	  input: fileStream,
	  crlfDelay: Infinity
	});
	// Note: we use the crlfDelay option to recognize all instances of CR LF
	// ('\r\n') in input.txt as a single line break.
  
	for await (const line of rl) {
		return line;
	  // Each line in input.txt will be successively available here as `line`.
	//   console.log(`Line from file: ${line}`);
	}
	return '';
  }

export function activate(context: vscode.ExtensionContext) {
	const command = 'json-line-viewer.preview';
  
	const commandHandler = async (arg: any) => {
		let uri = arg;
        if (!(uri instanceof vscode.Uri)) {
			if (vscode.window.activeTextEditor) {
                uri = vscode.window.activeTextEditor.document.uri;
            } else {
                vscode.window.showInformationMessage("Open a CSV file first to show a preview.");
                return;
            }
        }

	//   const languageId = 'json';
	//   const activeEditor = vscode.window.activeTextEditor;
  
	//   if (!activeEditor) {
	// 	return;
	//   }
  
	//   vscode.languages.setTextDocumentLanguage(activeEditor.document, languageId);
	const line = await processLineByLine(uri);
	const document = await vscode.workspace.openTextDocument({content: line});
	await vscode.window.showTextDocument(document);
		await vscode.languages.setTextDocumentLanguage(document, "json");
		await vscode.commands.executeCommand('editor.action.formatDocument');

	//   await vscode.commands.executeCommand('openEditors.newUntitledFile').then(async ()=>{
	// 	const editor = vscode.window.activeTextEditor;
	// 	const line = await processLineByLine(uri);
	// 	if (editor){
	// 		await editor.edit(editBuilder => {
	// 			editBuilder.insert(new vscode.Position(0,0),line);
	// 		});
	// 		// }).then(()=>{
	// 		// 	vscode.languages.setTextDocumentLanguage(editor.document, 'json');
	// 		// }).then(()=> {console.log('fdsfasdfsd');});

	// 		// processLineByLine(uri);
	// 	}
		
	// });
	// const languageId = 'json';
	//   const activeEditor = vscode.window.activeTextEditor;
  
	//   if (!activeEditor) {
	// 	return;
	//   }
	  
	// await  vscode.commands.executeCommand('workbench.action.editor.changeLanguageMode','json');
	// await vscode.languages.setTextDocumentLanguage(activeEditor.document, languageId);
	// await vscode.commands.executeCommand('editor.action.formatDocument');

	//   console.log(typeof(a)
	//   vscode.window.showInformationMessage('Hello World!');
	//   if (vscode.window.activeTextEditor){
	//   	console.log(vscode.window.activeTextEditor.document.uri);
	// 	  console.log(vscode.window.activeTextEditor.viewColumn);
	//   }
	};
  
	context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));
    // context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(document => {
	// 	console.log(Utils.basename(document.uri));
	// 	console.log(Utils.basename(document.uri).match("code-stdin-[^.]+.txt"));

	// }));

  }

// this method is called when your extension is deactivated
export function deactivate() {}
