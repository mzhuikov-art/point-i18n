import * as vscode from 'vscode';
import { CacheService } from '../services/cache.service';
import { StorageService } from '../services/storage.service';
import { ApiService } from '../services/api.service';

export class TranslatedContentProvider implements vscode.TextDocumentContentProvider {
    private onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    readonly onDidChange = this.onDidChangeEmitter.event;

    constructor(
        private apiService: ApiService,
        private cacheService: CacheService,
        private storageService: StorageService
    ) {}

    async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
        // Парсим URI: i18n-translated://file/path/to/file
        const originalUri = vscode.Uri.parse(uri.query);
        
        try {
            const document = await vscode.workspace.openTextDocument(originalUri);
            const text = document.getText();
            
            const locale = this.getLocaleFromConfig();
            const token = await this.storageService.getToken();
            
            if (!token) {
                return text; // Возвращаем оригинальный текст если нет токена
            }

            // Загружаем локали если их еще нет
            if (!this.cacheService.has(locale)) {
                try {
                    const projectKey = this.getProjectKey();
                    const locales = await this.apiService.fetchLocales(token, locale, projectKey);
                    this.cacheService.set(locale, locales);
                } catch (err) {
                    console.error('Failed to fetch locales:', err);
                    return text;
                }
            }

            // Заменяем ключи i18n на переводы
            const translatedText = this.replaceI18nKeys(text, locale);
            
            return translatedText;
        } catch (error) {
            console.error('Error providing translated content:', error);
            return '';
        }
    }

    private replaceI18nKeys(text: string, locale: string): string {
        // Паттерн для поиска: $t('key'), t('key'), i18n.t('key')
        const pattern = /\b(?:\$?t|i18n\.t)\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g;
        
        return text.replace(pattern, (match, quote, key) => {
            const translation = this.cacheService.getTranslation(locale, key);
            if (translation) {
                // Заменяем весь вызов функции на перевод в кавычках
                return `${quote}${translation}${quote}`;
            }
            // Если перевода нет, оставляем оригинал
            return match;
        });
    }

    private getLocaleFromConfig(): string {
        return vscode.workspace.getConfiguration('i18nRemote').get<string>('locale') || 'ru';
    }

    private getProjectKey(): string {
        return vscode.workspace.getConfiguration('i18nRemote').get<string>('projectKey') || 'point-frontend';
    }

    update(uri: vscode.Uri): void {
        this.onDidChangeEmitter.fire(uri);
    }
}

