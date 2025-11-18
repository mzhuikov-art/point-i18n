export interface Position {
    line: number;
    character: number;
}

export interface Range {
    start: Position;
    end: Position;
}

export interface TextDocument {
    getText(): string;
    uri: { toString(): string; fsPath: string };
}

export interface TextEditor {
    document: TextDocument;
    selection: { active: Position };
    revealRange(range: Range, revealType?: any): void;
}

export interface IEditorService {
    getActiveTextEditor(): TextEditor | undefined;
    onDidChangeActiveTextEditor(callback: (editor: TextEditor | undefined) => void): { dispose(): void };
    onDidChangeTextDocument(callback: (event: { document: TextDocument }) => void): { dispose(): void };
    onDidSaveTextDocument(callback: (document: TextDocument) => void): { dispose(): void };
    onDidChangeTextEditorSelection(callback: (event: { textEditor: TextEditor; selections: Array<{ active: Position; isEmpty: boolean }> }) => void): { dispose(): void };
    openTextDocument(uri: string): Promise<TextDocument>;
    showTextDocument(document: TextDocument, viewColumn?: any): Promise<TextEditor>;
    findFiles(pattern: string, excludePattern: string, maxResults?: number): Promise<Array<{ fsPath: string; toString(): string }>>;
    readFile(uri: string): Promise<Buffer>;
    stat(uri: string): Promise<void>;
    joinPath(base: string, ...paths: string[]): string;
    asRelativePath(uri: string, includeWorkspaceFolder?: boolean): string;
    getWorkspaceFolders(): Array<{ uri: { fsPath: string }; name: string }> | undefined;
}

