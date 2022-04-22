// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {createReadStream} from 'fs';
import {createInterface} from 'readline';

let lineIdxStatusBarItem: vscode.StatusBarItem;

async function processLineByLine(uri: vscode.Uri, lineIdx: number): Promise<[string,number]> {
	const fileStream = createReadStream(uri.path.replace('(preview)','').trimEnd());
  
	const rl = createInterface({
	  input: fileStream,
	  crlfDelay: Infinity
	});
	// Note: we use the crlfDelay option to recognize all instances of CR LF
	// ('\r\n') in input.txt as a single line break.
  
	// TODO: not having to iterate from the begining of file every time
	let idx = 0;
	let line='';
	for await (line of rl) {
		idx+=1;
		if (idx === lineIdx) {
			return [line, idx];
		}
  	}
	return [line, idx];
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  
	const jsonlScheme = 'jsonl';
	let lineIndexDict = Object();

	const myProvider = new class implements vscode.TextDocumentContentProvider {

		// emitter and its event
		onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
		onDidChange = this.onDidChangeEmitter.event;

		async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
			let lineIdx = lineIndexDict[uri.path];
			if (lineIdx === undefined) {
				lineIdx=1;
				lineIndexDict[uri.path]=lineIdx;
			}
			const res = await processLineByLine(uri,lineIdx);
			lineIndexDict[uri.path] = res[1]; // handle when line index exceed file line count
			updateStatusBarItem();
			
			const lineFormated = JSON.stringify(JSON.parse(res[0]), null, 2);
			return lineFormated;
		}
	};

	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(jsonlScheme, myProvider));


	const openPreviewHandler = async (arg: any) => {
		let uri = arg;
        if (!(uri instanceof vscode.Uri)) {
			if (vscode.window.activeTextEditor) {
                uri = vscode.window.activeTextEditor.document.uri;
            } else {
                vscode.window.showInformationMessage("Open a JSON Line file first to show a preview.");
                return;
            }
        }
		
		// Change uri-scheme to "jsonl"
		// TODO: Add line index to title
		const jsonlUri = vscode.Uri.parse('jsonl:' + uri.path + ' (preview)');

		const document = await vscode.workspace.openTextDocument(jsonlUri);
		await vscode.window.showTextDocument(document);
		
		await vscode.languages.setTextDocumentLanguage(document, "json");
		// await vscode.commands.executeCommand('editor.action.formatDocument');
	};

	const nextLineHandler = async () => {
		if (!vscode.window.activeTextEditor) {
			return; // no editor
		}
		const { document } = vscode.window.activeTextEditor;
		if (document.uri.scheme !== jsonlScheme) {
			return; // not my scheme
		}
		const lineIdx = document.uri.path.split('-');
		lineIndexDict[document.uri.path]+=1;
		myProvider.onDidChangeEmitter.fire(document.uri);
	};
	
	const previousLineHandler = async () => {
		if (!vscode.window.activeTextEditor) {
			return; // no editor
		}
		const { document } = vscode.window.activeTextEditor;
		if (document.uri.scheme !== jsonlScheme) {
			return; // not my scheme
		}
		lineIndexDict[document.uri.path]-=1;

		if (lineIndexDict[document.uri.path]<=0) {
			lineIndexDict[document.uri.path]=1;
		}
		else {
			myProvider.onDidChangeEmitter.fire(document.uri);
		}
	};

	context.subscriptions.push(vscode.commands.registerCommand('json-line-viewer.preview', openPreviewHandler));
	context.subscriptions.push(vscode.commands.registerCommand('json-line-viewer.next-line', nextLineHandler));
	context.subscriptions.push(vscode.commands.registerCommand('json-line-viewer.previous-line', previousLineHandler));

	lineIdxStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100000);
	context.subscriptions.push(lineIdxStatusBarItem);
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem));
	updateStatusBarItem();

	function updateStatusBarItem(): void {
		if (!vscode.window.activeTextEditor) {
			lineIdxStatusBarItem.hide(); // no editor
			return;
		}
		const { document } = vscode.window.activeTextEditor;
		if (document.uri.scheme !== jsonlScheme) {
			lineIdxStatusBarItem.hide();
			return; 
		}
		lineIdxStatusBarItem.text = `JSONL at line: ${lineIndexDict[document.uri.path]}`;
		lineIdxStatusBarItem.show();
	}
}

// this method is called when your extension is deactivated
export function deactivate() {}
