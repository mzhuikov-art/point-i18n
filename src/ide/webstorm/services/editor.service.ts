import { IEditorService, Position, Range, TextDocument, TextEditor } from '../../shared/types';

export class WebStormEditorService implements IEditorService {
    getActiveTextEditor(): TextEditor | undefined {
        // TODO: Implement WebStorm editor API
        return undefined;
    }

    onDidChangeActiveTextEditor(callback: (editor: TextEditor | undefined) => void): { dispose(): void } {
        // TODO: Implement WebStorm editor API
        return { dispose: () => {} };
    }

    onDidChangeTextDocument(callback: (event: { document: TextDocument }) => void): { dispose(): void } {
        // TODO: Implement WebStorm editor API
        return { dispose: () => {} };
    }

    onDidSaveTextDocument(callback: (document: TextDocument) => void): { dispose(): void } {
        // TODO: Implement WebStorm editor API
        return { dispose: () => {} };
    }

    onDidChangeTextEditorSelection(callback: (event: { textEditor: TextEditor; selections: Array<{ active: Position; isEmpty: boolean }> }) => void): { dispose(): void } {
        // TODO: Implement WebStorm editor API
        return { dispose: () => {} };
    }

    async openTextDocument(uri: string): Promise<TextDocument> {
        // TODO: Implement WebStorm editor API
        throw new Error('Not implemented');
    }

    async showTextDocument(document: TextDocument, viewColumn?: any): Promise<TextEditor> {
        // TODO: Implement WebStorm editor API
        throw new Error('Not implemented');
    }

    async findFiles(pattern: string, excludePattern: string, maxResults?: number): Promise<Array<{ fsPath: string; toString(): string }>> {
        // TODO: Implement WebStorm editor API
        return [];
    }

    async readFile(uri: string): Promise<Buffer> {
        // TODO: Implement WebStorm editor API
        throw new Error('Not implemented');
    }

    async stat(uri: string): Promise<void> {
        // TODO: Implement WebStorm editor API
        throw new Error('Not implemented');
    }

    joinPath(base: string, ...paths: string[]): string {
        // TODO: Implement WebStorm editor API
        return '';
    }

    asRelativePath(uri: string, includeWorkspaceFolder?: boolean): string {
        // TODO: Implement WebStorm editor API
        return '';
    }

    getWorkspaceFolders(): Array<{ uri: { fsPath: string }; name: string }> | undefined {
        // TODO: Implement WebStorm editor API
        return undefined;
    }
}

