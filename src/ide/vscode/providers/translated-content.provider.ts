import * as vscode from 'vscode';
import { ApiService, CacheService } from '../../../shared/services';
import { IStorageService, IConfigService, IEditorService } from '../../../shared/types';

export class VSCodeTranslatedContentProvider implements vscode.TextDocumentContentProvider {
    private onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    readonly onDidChange = this.onDidChangeEmitter.event;

    constructor(
        private apiService: ApiService,
        private cacheService: CacheService,
        private storageService: IStorageService,
        private configService: IConfigService,
        private editorService: IEditorService
    ) {}

    async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
        const originalUri = vscode.Uri.parse(uri.query);
        
        try {
            const document = await vscode.workspace.openTextDocument(originalUri);
            const text = document.getText();
            
            const locale = this.configService.getLocale();
            const token = await this.storageService.getToken();
            
            if (!token) {
                return text;
            }

            if (!this.cacheService.has(locale)) {
                try {
                    const projectKey = this.configService.getProjectKey();
                    const locales = await this.apiService.fetchLocales(undefined, locale, projectKey);
                    this.cacheService.set(locale, locales);
                } catch (err) {
                    console.error('Failed to fetch locales:', err);
                    return text;
                }
            }

            const translatedText = this.replaceI18nKeys(text, locale);
            
            return translatedText;
        } catch (error) {
            console.error('Error providing translated content:', error);
            return '';
        }
    }

    private replaceI18nKeys(text: string, locale: string): string {
        const pattern = /\b(?:\$?t|i18n\.t)\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g;
        
        return text.replace(pattern, (match, quote, key) => {
            const translation = this.cacheService.getTranslation(locale, key);
            if (translation) {
                return `${quote}${translation}${quote}`;
            }
            return match;
        });
    }

    update(uri: vscode.Uri): void {
        this.onDidChangeEmitter.fire(uri);
    }
}

