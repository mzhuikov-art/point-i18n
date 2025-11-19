import * as vscode from 'vscode';
import { ApiService, CacheService } from '../../../shared/services';
import { IStorageService, IConfigService, IWindowService, TextEditor, Position } from '../../../shared/types';

interface I18nMatch {
    key: string;
    range: vscode.Range;
}

export class VSCodeDecorationProvider {
    private decorationType: vscode.TextEditorDecorationType;
    private originalKeyDecorationType: vscode.TextEditorDecorationType;
    private showOriginal = false;
    private enabled = true;
    private disabledRanges: Set<string> = new Set();
    private editors: Map<string, vscode.TextEditor> = new Map();

    constructor(
        private apiService: ApiService,
        private cacheService: CacheService,
        private storageService: IStorageService,
        private configService: IConfigService,
        private windowService: IWindowService,
        private editorService: any
    ) {
        this.decorationType = vscode.window.createTextEditorDecorationType({
            textDecoration: 'none; display: none;'
        });

        this.originalKeyDecorationType = vscode.window.createTextEditorDecorationType({
            textDecoration: 'none; opacity: 1;',
            after: {
                margin: '0',
                contentText: '',
            }
        });
    }

    toggle(): void {
        this.enabled = !this.enabled;
        const status = this.enabled ? 'включены' : 'выключены';
        this.windowService.showInformationMessage(`I18n decorations ${status}`);
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    async updateDecorations(editor: TextEditor): Promise<void> {
        const vscodeEditor = this.getVSCodeEditor(editor);
        if (!vscodeEditor) {
            return;
        }

        if (!this.enabled) {
            vscodeEditor.setDecorations(this.decorationType, []);
            return;
        }

        const locale = this.configService.getLocale();
        const token = await this.storageService.getToken();

        if (!token) {
            return;
        }

        if (!this.cacheService.has(locale)) {
            try {
                const projectKey = this.configService.getProjectKey();
                const locales = await this.apiService.fetchLocales(undefined, locale, projectKey);
                this.cacheService.set(locale, locales);
            } catch (err) {
                console.error('Failed to fetch locales:', err);
                return;
            }
        }

        const document = vscodeEditor.document;
        const matches = this.findI18nKeys(document);
        const decorations: vscode.DecorationOptions[] = [];

        for (const match of matches) {
            const translation = this.cacheService.getTranslation(locale, match.key);
            
            if (translation) {
                const rangeKey = this.getRangeKey(match.range, document.uri);
                if (!this.disabledRanges.has(rangeKey)) {
                    const decoration: vscode.DecorationOptions = {
                        range: match.range,
                        renderOptions: {
                            before: {
                                contentText: `${translation}`,
                                color: new vscode.ThemeColor('editor.foreground'),
                                backgroundColor: 'rgba(237, 232, 100, 0.2)',
                                border: '1px solid rgba(237, 168, 100, 0.3)',
                                margin: '0 2px 0 0'
                            }
                        }
                    };
                    decorations.push(decoration);
                }
            }
        }

        vscodeEditor.setDecorations(this.decorationType, decorations);
    }

    private findI18nKeys(document: vscode.TextDocument): I18nMatch[] {
        const matches: I18nMatch[] = [];
        const text = document.getText();
        
        const pattern = /\b(?:\$?t|i18n\.t)\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g;
        
        let match: RegExpExecArray | null;
        
        while ((match = pattern.exec(text)) !== null) {
            const key = match[2];
            const quote = match[1];
            
            const quoteIndex = match[0].indexOf(quote);
            
            const quoteStartPos = document.positionAt(match.index + quoteIndex);
            const quoteEndPos = document.positionAt(match.index + match[0].length - 1);
            
            const range = new vscode.Range(quoteStartPos, quoteEndPos);
            
            matches.push({ key, range });
        }

        return matches;
    }

    private getRangeKey(range: vscode.Range, uri: vscode.Uri): string {
        return `${uri.toString()}:${range.start.line}:${range.start.character}:${range.end.line}:${range.end.character}`;
    }

    handleClick(position: Position, editor: TextEditor): void {
        const vscodeEditor = this.getVSCodeEditor(editor);
        if (!vscodeEditor) {
            return;
        }

        const vscodePosition = new vscode.Position(position.line, position.character);
        const matches = this.findI18nKeys(vscodeEditor.document);
        let clickedOnI18nKey = false;
        
        for (const match of matches) {
            if (match.range.contains(vscodePosition)) {
                clickedOnI18nKey = true;
                const rangeKey = this.getRangeKey(match.range, vscodeEditor.document.uri);
                
                if (this.disabledRanges.has(rangeKey)) {
                    this.disabledRanges.delete(rangeKey);
                } else {
                    this.disabledRanges.add(rangeKey);
                }
                
                this.updateDecorations(editor);
                break;
            }
        }
        
        if (!clickedOnI18nKey && this.disabledRanges.size > 0) {
            this.disabledRanges.clear();
            this.updateDecorations(editor);
        }
    }

    private getVSCodeEditor(editor: TextEditor): vscode.TextEditor | null {
        const uri = editor.document.uri.toString();
        let vscodeEditor = this.editors.get(uri);
        
        if (!vscodeEditor) {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document.uri.toString() === uri) {
                vscodeEditor = activeEditor;
                this.editors.set(uri, vscodeEditor);
            } else {
                return null;
            }
        }
        
        return vscodeEditor;
    }

    dispose(): void {
        this.decorationType.dispose();
        this.originalKeyDecorationType.dispose();
    }
}

