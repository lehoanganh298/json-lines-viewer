// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {createReadStream} from 'fs';
import {createInterface} from 'readline';

async function processLineByLine(uri: vscode.Uri, lineIdx: number): Promise<string> {
	const fileStream = createReadStream(uri.path);
  
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
			return line;
		}
  	}
	return line;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  
	const jsonlScheme = 'jsonl';
	let lineIdx = 1;

	const myProvider = new class implements vscode.TextDocumentContentProvider {

		// emitter and its event
		onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
		onDidChange = this.onDidChangeEmitter.event;

		async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
			const line = await processLineByLine(uri,lineIdx);
			const lineFormated = JSON.stringify(JSON.parse(line), null, 2);
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
                vscode.window.showInformationMessage("Open a CSV file first to show a preview.");
                return;
            }
        }
		
		// Change uri-scheme to "jsonl"
		const jsonlUri = vscode.Uri.parse('jsonl:' + uri.path);

		const document = await vscode.workspace.openTextDocument(jsonlUri);
		await vscode.window.showTextDocument(document, { preview: false });
		
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
		lineIdx+=1;
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
		lineIdx-=1;
		myProvider.onDidChangeEmitter.fire(document.uri);
	};

	context.subscriptions.push(vscode.commands.registerCommand('json-line-viewer.preview', openPreviewHandler));
	context.subscriptions.push(vscode.commands.registerCommand('json-line-viewer.next-line', nextLineHandler));
	context.subscriptions.push(vscode.commands.registerCommand('json-line-viewer.previous-line', previousLineHandler));

}

// this method is called when your extension is deactivated
export function deactivate() {}
