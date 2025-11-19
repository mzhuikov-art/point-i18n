import * as vscode from 'vscode';
import { IEditorService, Position, Range, TextDocument, TextEditor } from '../../../shared/types';

export class VSCodeEditorService implements IEditorService {
    getActiveTextEditor(): TextEditor | undefined {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return undefined;
        }
        return this.convertEditor(editor);
    }

    onDidChangeActiveTextEditor(callback: (editor: TextEditor | undefined) => void): { dispose(): void } {
        return vscode.window.onDidChangeActiveTextEditor((editor) => {
            callback(editor ? this.convertEditor(editor) : undefined);
        });
    }

    onDidChangeTextDocument(callback: (event: { document: TextDocument }) => void): { dispose(): void } {
        return vscode.workspace.onDidChangeTextDocument((event) => {
            callback({ document: this.convertDocument(event.document) });
        });
    }

    onDidSaveTextDocument(callback: (document: TextDocument) => void): { dispose(): void } {
        return vscode.workspace.onDidSaveTextDocument((document) => {
            callback(this.convertDocument(document));
        });
    }

    onDidChangeTextEditorSelection(callback: (event: { textEditor: TextEditor; selections: Array<{ active: Position; isEmpty: boolean }> }) => void): { dispose(): void } {
        return vscode.window.onDidChangeTextEditorSelection((event) => {
            callback({
                textEditor: this.convertEditor(event.textEditor),
                selections: event.selections.map(s => ({
                    active: this.convertPosition(s.active),
                    isEmpty: s.isEmpty
                }))
            });
        });
    }

    async openTextDocument(uri: string): Promise<TextDocument> {
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(uri));
        return this.convertDocument(doc);
    }

    async showTextDocument(document: TextDocument, viewColumn?: any): Promise<TextEditor> {
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(document.uri.toString()));
        const editor = await vscode.window.showTextDocument(doc, viewColumn);
        return this.convertEditor(editor);
    }

    async findFiles(pattern: string, excludePattern: string, maxResults?: number): Promise<Array<{ fsPath: string; toString(): string }>> {
        const files = await vscode.workspace.findFiles(pattern, excludePattern, maxResults);
        return files.map(uri => ({
            fsPath: uri.fsPath,
            toString: () => uri.toString()
        }));
    }

    async readFile(uri: string): Promise<Buffer> {
        const fileData = await vscode.workspace.fs.readFile(vscode.Uri.parse(uri));
        return Buffer.from(fileData);
    }

    async stat(uri: string): Promise<void> {
        await vscode.workspace.fs.stat(vscode.Uri.parse(uri));
    }

    joinPath(base: string, ...paths: string[]): string {
        return vscode.Uri.joinPath(vscode.Uri.file(base), ...paths).fsPath;
    }

    asRelativePath(uri: string, includeWorkspaceFolder?: boolean): string {
        return vscode.workspace.asRelativePath(vscode.Uri.parse(uri), includeWorkspaceFolder);
    }

    getWorkspaceFolders(): Array<{ uri: { fsPath: string }; name: string }> | undefined {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders) {
            return undefined;
        }
        return folders.map(folder => ({
            uri: { fsPath: folder.uri.fsPath },
            name: folder.name
        }));
    }

    private convertDocument(doc: vscode.TextDocument): TextDocument {
        return {
            getText: () => doc.getText(),
            uri: {
                toString: () => doc.uri.toString(),
                fsPath: doc.uri.fsPath
            }
        };
    }

    private convertEditor(editor: vscode.TextEditor): TextEditor {
        return {
            document: this.convertDocument(editor.document),
            selection: {
                active: this.convertPosition(editor.selection.active)
            },
            revealRange: (range: Range, revealType?: any) => {
                editor.revealRange(
                    new vscode.Range(
                        new vscode.Position(range.start.line, range.start.character),
                        new vscode.Position(range.end.line, range.end.character)
                    ),
                    revealType
                );
            }
        };
    }

    private convertPosition(pos: vscode.Position): Position {
        return {
            line: pos.line,
            character: pos.character
        };
    }
}

