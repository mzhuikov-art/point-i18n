import { IEditorService, Position, Range, TextDocument, TextEditor } from '../../../shared/types';

export class WebStormEditorService implements IEditorService {
    private getProject(): any {
        // @ts-ignore
        return com.intellij.openapi.project.ProjectManager.getInstance().getOpenProjects()[0];
    }

    private getFileManager(): any {
        const project = this.getProject();
        if (!project) return null;
        // @ts-ignore
        return com.intellij.openapi.vfs.VfsUtil.findFileByIoFile(
            new java.io.File(project.getBasePath()),
            project
        );
    }

    getActiveTextEditor(): TextEditor | undefined {
        try {
            // @ts-ignore
            const editor = com.intellij.openapi.fileEditor.FileEditorManager.getInstance(this.getProject())
                .getSelectedTextEditor();
            if (!editor) {
                return undefined;
            }
            return this.convertEditor(editor);
        } catch (error) {
            console.error('Error getting active editor:', error);
            return undefined;
        }
    }

    onDidChangeActiveTextEditor(callback: (editor: TextEditor | undefined) => void): { dispose(): void } {
        // @ts-ignore
        const project = this.getProject();
        if (!project) {
            return { dispose: () => {} };
        }

        // @ts-ignore
        const connection = project.getMessageBus().connect();
        // @ts-ignore
        const topic = com.intellij.openapi.fileEditor.FileEditorManagerListener.FILE_EDITOR_MANAGER;
        
        connection.subscribe(topic, {
            selectionChanged: (event: any) => {
                const editor = this.getActiveTextEditor();
                callback(editor);
            }
        });

        return {
            dispose: () => {
                connection.disconnect();
            }
        };
    }

    onDidChangeTextDocument(callback: (event: { document: TextDocument }) => void): { dispose(): void } {
        const project = this.getProject();
        if (!project) {
            return { dispose: () => {} };
        }

        // @ts-ignore
        const connection = project.getMessageBus().connect();
        // @ts-ignore
        const topic = com.intellij.openapi.editor.event.DocumentEvent;
        
        connection.subscribe(topic, {
            documentChanged: (event: any) => {
                const document = this.convertDocument(event.getDocument());
                callback({ document });
            }
        });

        return {
            dispose: () => {
                connection.disconnect();
            }
        };
    }

    onDidSaveTextDocument(callback: (document: TextDocument) => void): { dispose(): void } {
        const project = this.getProject();
        if (!project) {
            return { dispose: () => {} };
        }

        // @ts-ignore
        const connection = project.getMessageBus().connect();
        // @ts-ignore
        const topic = com.intellij.openapi.fileEditor.FileDocumentManagerListener;
        
        connection.subscribe(topic, {
            beforeDocumentSaving: (document: any) => {
                // Не вызываем здесь, так как это before
            },
            beforeAllDocumentsSaving: () => {},
            beforeFileContentReload: () => {},
            fileWithNoDocumentChanged: () => {},
            unsavedDocumentsDropped: () => {}
        });

        // Используем FileDocumentManager для отслеживания сохранения
        // @ts-ignore
        const fileDocumentManager = com.intellij.openapi.fileEditor.FileDocumentManager.getInstance();
        
        // Подписываемся на события через FileEditorManager
        // @ts-ignore
        const fileEditorManager = com.intellij.openapi.fileEditor.FileEditorManager.getInstance(project);
        
        const listener = {
            fileClosed: (source: any, file: any) => {
                const document = fileDocumentManager.getDocument(file);
                if (document) {
                    callback(this.convertDocument(document));
                }
            }
        };

        fileEditorManager.addFileEditorManagerListener(listener);

        return {
            dispose: () => {
                fileEditorManager.removeFileEditorManagerListener(listener);
            }
        };
    }

    onDidChangeTextEditorSelection(callback: (event: { textEditor: TextEditor; selections: Array<{ active: Position; isEmpty: boolean }> }) => void): { dispose(): void } {
        const project = this.getProject();
        if (!project) {
            return { dispose: () => {} };
        }

        // @ts-ignore
        const connection = project.getMessageBus().connect();
        // @ts-ignore
        const topic = com.intellij.openapi.editor.event.EditorFactoryListener;
        
        connection.subscribe(topic, {
            editorCreated: (event: any) => {
                const editor = event.getEditor();
                // @ts-ignore
                const selectionModel = editor.getSelectionModel();
                
                selectionModel.addSelectionListener({
                    selectionChanged: () => {
                        const textEditor = this.convertEditor(editor);
                        const selections = [{
                            active: this.convertPosition(editor.getCaretModel().getCurrentCaret().getOffset()),
                            isEmpty: selectionModel.hasSelection()
                        }];
                        callback({ textEditor, selections });
                    }
                });
            },
            editorReleased: () => {}
        });

        return {
            dispose: () => {
                connection.disconnect();
            }
        };
    }

    async openTextDocument(uri: string): Promise<TextDocument> {
        try {
            const project = this.getProject();
            // @ts-ignore
            const virtualFile = com.intellij.openapi.vfs.VfsUtil.findFileByIoFile(
                new java.io.File(uri.replace('file://', '')),
                project
            );
            if (!virtualFile) {
                throw new Error(`File not found: ${uri}`);
            }
            // @ts-ignore
            const document = com.intellij.openapi.fileEditor.FileDocumentManager.getInstance().getDocument(virtualFile);
            if (!document) {
                throw new Error(`Cannot get document for: ${uri}`);
            }
            return this.convertDocument(document);
        } catch (error) {
            console.error('Error opening document:', error);
            throw error;
        }
    }

    async showTextDocument(document: TextDocument, viewColumn?: any): Promise<TextEditor> {
        try {
            const project = this.getProject();
            // @ts-ignore
            const file = com.intellij.openapi.vfs.VfsUtil.findFileByIoFile(
                new java.io.File(document.uri.fsPath),
                project
            );
            if (!file) {
                throw new Error(`File not found: ${document.uri.fsPath}`);
            }
            // @ts-ignore
            const fileEditorManager = com.intellij.openapi.fileEditor.FileEditorManager.getInstance(project);
            fileEditorManager.openTextEditor(
                new com.intellij.openapi.fileEditor.OpenFileDescriptor(project, file),
                true
            );
            const editor = this.getActiveTextEditor();
            if (!editor) {
                throw new Error('Failed to open editor');
            }
            return editor;
        } catch (error) {
            console.error('Error showing document:', error);
            throw error;
        }
    }

    async findFiles(pattern: string, excludePattern: string, maxResults?: number): Promise<Array<{ fsPath: string; toString(): string }>> {
        try {
            const project = this.getProject();
            // @ts-ignore
            const searchScope = com.intellij.psi.search.GlobalSearchScope.projectScope(project);
            // @ts-ignore
            const fileType = com.intellij.openapi.fileTypes.FileTypeManager.getInstance().getFileTypeByExtension('ts');
            
            // Упрощенная реализация поиска файлов
            // @ts-ignore
            const virtualFiles = com.intellij.openapi.vfs.VfsUtil.collectChildrenRecursively(
                project.getBaseDir()
            ).filter((file: any) => {
                const path = file.getPath();
                return path.includes(pattern.replace('**/', '').replace('/*', '')) &&
                       !path.includes('node_modules') &&
                       !path.includes('.git');
            });

            return virtualFiles.slice(0, maxResults || 5000).map((file: any) => ({
                fsPath: file.getPath(),
                toString: () => file.getUrl()
            }));
        } catch (error) {
            console.error('Error finding files:', error);
            return [];
        }
    }

    async readFile(uri: string): Promise<Buffer> {
        try {
            const project = this.getProject();
            // @ts-ignore
            const virtualFile = com.intellij.openapi.vfs.VfsUtil.findFileByIoFile(
                new java.io.File(uri.replace('file://', '')),
                project
            );
            if (!virtualFile) {
                throw new Error(`File not found: ${uri}`);
            }
            const bytes = virtualFile.contentsToByteArray();
            return Buffer.from(bytes);
        } catch (error) {
            console.error('Error reading file:', error);
            throw error;
        }
    }

    async stat(uri: string): Promise<void> {
        try {
            const project = this.getProject();
            // @ts-ignore
            const virtualFile = com.intellij.openapi.vfs.VfsUtil.findFileByIoFile(
                new java.io.File(uri.replace('file://', '')),
                project
            );
            if (!virtualFile || !virtualFile.exists()) {
                throw new Error(`File not found: ${uri}`);
            }
        } catch (error) {
            console.error('Error stat file:', error);
            throw error;
        }
    }

    joinPath(base: string, ...paths: string[]): string {
        // @ts-ignore
        return new java.io.File(base, ...paths).getPath();
    }

    asRelativePath(uri: string, includeWorkspaceFolder?: boolean): string {
        try {
            const project = this.getProject();
            const basePath = project.getBasePath();
            const filePath = uri.replace('file://', '');
            if (filePath.startsWith(basePath)) {
                return filePath.substring(basePath.length + 1);
            }
            return filePath;
        } catch (error) {
            console.error('Error getting relative path:', error);
            return uri;
        }
    }

    getWorkspaceFolders(): Array<{ uri: { fsPath: string }; name: string }> | undefined {
        try {
            const project = this.getProject();
            if (!project) {
                return undefined;
            }
            return [{
                uri: { fsPath: project.getBasePath() },
                name: project.getName()
            }];
        } catch (error) {
            console.error('Error getting workspace folders:', error);
            return undefined;
        }
    }

    private convertDocument(document: any): TextDocument {
        return {
            getText: () => document.getText(),
            uri: {
                toString: () => document.getVirtualFile()?.getUrl() || '',
                fsPath: document.getVirtualFile()?.getPath() || ''
            }
        };
    }

    private convertEditor(editor: any): TextEditor {
        const document = editor.getDocument();
        return {
            document: this.convertDocument(document),
            selection: {
                active: this.convertPosition(editor.getCaretModel().getOffset())
            },
            revealRange: (range: Range, revealType?: any) => {
                // @ts-ignore
                const startOffset = document.getLineStartOffset(range.start.line) + range.start.character;
                // @ts-ignore
                const endOffset = document.getLineStartOffset(range.end.line) + range.end.character;
                editor.getScrollingModel().scrollToCaret(com.intellij.openapi.editor.ScrollType.CENTER);
            }
        };
    }

    private convertPosition(offset: number): Position {
        // Нужен документ для конвертации offset в line/character
        // Упрощенная реализация
        return {
            line: 0,
            character: offset
        };
    }
}
