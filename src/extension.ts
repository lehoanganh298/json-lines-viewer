// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {createReadStream} from 'fs';
import {createInterface} from 'readline';
import { url } from 'inspector';


const jsonlScheme = 'jsonl';
let lineIndexDict = Object();	// Store current line index of previewed json files
let lineIdxStatusBarItem: vscode.StatusBarItem;


// A custom content provider for jsonl file
class JsonlContentProvider implements vscode.TextDocumentContentProvider {

	onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
	onDidChange = this.onDidChangeEmitter.event;

	async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
		let lineIdx = lineIndexDict[uri.path];
		if (lineIdx === undefined) {
			lineIdx=1;
			lineIndexDict[uri.path]=lineIdx;
		}
		const res = await readFileAtLine(uri,lineIdx);
		lineIndexDict[uri.path] = res[1]; // handle when line index invalid
		updateLineIdxStatusBarItem();
		
		const lineFormated = JSON.stringify(JSON.parse(res[0]), null, 2);
		return lineFormated;
	}
};


const jsonlProvider = new JsonlContentProvider();


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(jsonlScheme, jsonlProvider));

	context.subscriptions.push(vscode.commands.registerCommand('json-lines-viewer.preview', openPreviewHandler));
	context.subscriptions.push(vscode.commands.registerCommand('json-lines-viewer.next-line', nextLineHandler));
	context.subscriptions.push(vscode.commands.registerCommand('json-lines-viewer.previous-line', previousLineHandler));
	context.subscriptions.push(vscode.commands.registerCommand('json-lines-viewer.go-to-line',goToLine));

	lineIdxStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100000);
	context.subscriptions.push(lineIdxStatusBarItem);
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateLineIdxStatusBarItem));
	updateLineIdxStatusBarItem();
}

// Read a file content at specified line index
// If line index <=0, return first line
// If line index exceed file's line count, return last line
// Input: 	- file's uri
// 			- line index
// Output: 	- line's content
// 			- returned line index
async function readFileAtLine(uri: vscode.Uri, lineIdx: number): Promise<[string,number]> {
	if (lineIdx<=0) {
		lineIdx = 1;
	}

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


const openPreviewHandler = async (arg: any) => {
	let uri = arg;
	if (!(uri instanceof vscode.Uri)) {
		const activeEditor = vscode.window.activeTextEditor;
		if (activeEditor && activeEditor.document.languageId === 'jsonl') {
			uri = activeEditor.document.uri;
		} else {
			vscode.window.showInformationMessage("Open a JSON Lines file (.jsonl) first to show a preview.");
			return;
		}
	}
	
	// Change uri-scheme to "jsonl"
	let uriPath = "";
	if (uri._fsPath !== undefined && uri._fsPath !== null) {
		uriPath = uri._fsPath;
	}
	else {
		uriPath = uri.path;
	}
	const jsonlUri = vscode.Uri.parse('jsonl:' + uriPath + ' (preview)');
	
	const document = await vscode.workspace.openTextDocument(jsonlUri);
	await vscode.window.showTextDocument(document);
	
	await vscode.languages.setTextDocumentLanguage(document, "json");
};


const nextLineHandler = async () => {
	if (!vscode.window.activeTextEditor) {
		return; // no editor
	}
	const { document } = vscode.window.activeTextEditor;
	if (document.uri.scheme !== jsonlScheme) {
		return; // not my scheme
	}
	lineIndexDict[document.uri.path]+=1;
	jsonlProvider.onDidChangeEmitter.fire(document.uri);
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

	jsonlProvider.onDidChangeEmitter.fire(document.uri);
};


const goToLine = async () => {
	if (!vscode.window.activeTextEditor) {
		return; // no editor
	}
	const { document } = vscode.window.activeTextEditor;
	if (document.uri.scheme !== jsonlScheme) {
		return; // not my scheme
	}

	let lineIdx = null;
	while (lineIdx === null || isNaN(lineIdx)){
		let lineIdxStr = await vscode.window.showInputBox(
			{ prompt: 'Type a line number to preview Json object at that line.' });
		if (lineIdxStr === undefined) {
			break;
		}

		lineIdx = parseInt(lineIdxStr);
	}
	if (lineIdx !== null){
		lineIndexDict[document.uri.path] = lineIdx;
		jsonlProvider.onDidChangeEmitter.fire(document.uri);
	}
};


function updateLineIdxStatusBarItem(): void {
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


// this method is called when your extension is deactivated
export function deactivate() {}
