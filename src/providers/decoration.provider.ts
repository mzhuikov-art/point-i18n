import * as vscode from 'vscode';
import { CacheService } from '../services/cache.service';
import { StorageService } from '../services/storage.service';
import { ApiService } from '../services/api.service';

interface I18nMatch {
    key: string;
    range: vscode.Range;
}

export class DecorationProvider {
    private decorationType: vscode.TextEditorDecorationType;
    private originalKeyDecorationType: vscode.TextEditorDecorationType;
    private showOriginal = false;
    private enabled = true;
    private disabledRanges: Set<string> = new Set(); // Храним отключенные ranges

    constructor(
        private apiService: ApiService,
        private cacheService: CacheService,
        private storageService: StorageService
    ) {
        // Decoration для отображения перевода - используем display: none как в i18n Ally
        this.decorationType = vscode.window.createTextEditorDecorationType({
            textDecoration: 'none; display: none;' // hack для скрытия оригинального текста
        });

        // Decoration для отображения оригинального ключа при наведении
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
        vscode.window.showInformationMessage(`I18n decorations ${status}`);
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    async updateDecorations(editor: vscode.TextEditor): Promise<void> {
        if (!editor) {
            return;
        }

        // Если decorations выключены, очищаем их
        if (!this.enabled) {
            editor.setDecorations(this.decorationType, []);
            return;
        }

        const locale = this.getLocaleFromConfig();
        const token = await this.storageService.getToken();

        if (!token) {
            return;
        }

        // Загружаем локали если их еще нет
        if (!this.cacheService.has(locale)) {
            try {
                const projectKey = this.getProjectKey();
                const locales = await this.apiService.fetchLocales(token, locale, projectKey);
                this.cacheService.set(locale, locales);
            } catch (err) {
                console.error('Failed to fetch locales:', err);
                return;
            }
        }

        const matches = this.findI18nKeys(editor.document);
        const decorations: vscode.DecorationOptions[] = [];

        for (const match of matches) {
            const translation = this.cacheService.getTranslation(locale, match.key);
            
            if (translation) {
                // Проверяем, не отключен ли этот range
                const rangeKey = this.getRangeKey(match.range, editor.document.uri);
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

        editor.setDecorations(this.decorationType, decorations);
    }

    private findI18nKeys(document: vscode.TextDocument): I18nMatch[] {
        const matches: I18nMatch[] = [];
        const text = document.getText();
        
        // Паттерны для поиска: $t('key'), t('key'), i18n.t('key')
        const pattern = /\b(?:\$?t|i18n\.t)\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g;
        
        let match: RegExpExecArray | null;
        
        while ((match = pattern.exec(text)) !== null) {
            const key = match[2];
            const quote = match[1];
            
            // Находим позицию начала кавычки в полном совпадении
            const quoteIndex = match[0].indexOf(quote);
            
            // Вычисляем абсолютные позиции
            const quoteStartPos = document.positionAt(match.index + quoteIndex);
            const quoteEndPos = document.positionAt(match.index + match[0].length - 1);
            
            // Range от открывающей кавычки до закрывающей скобки включительно
            // Это скроет весь 'key')
            const range = new vscode.Range(quoteStartPos, quoteEndPos);
            
            matches.push({ key, range });
        }

        return matches;
    }

    private getLocaleFromConfig(): string {
        return vscode.workspace.getConfiguration('i18nRemote').get<string>('locale') || 'ru';
    }

    private getProjectKey(): string {
        return vscode.workspace.getConfiguration('i18nRemote').get<string>('projectKey') || 'point-frontend';
    }

    private getRangeKey(range: vscode.Range, uri: vscode.Uri): string {
        return `${uri.toString()}:${range.start.line}:${range.start.character}:${range.end.line}:${range.end.character}`;
    }

    handleClick(position: vscode.Position, editor: vscode.TextEditor): void {
        const matches = this.findI18nKeys(editor.document);
        let clickedOnI18nKey = false;
        
        for (const match of matches) {
            if (match.range.contains(position)) {
                clickedOnI18nKey = true;
                const rangeKey = this.getRangeKey(match.range, editor.document.uri);
                
                if (this.disabledRanges.has(rangeKey)) {
                    // Включаем обратно
                    this.disabledRanges.delete(rangeKey);
                } else {
                    // Отключаем декорацию для этого элемента
                    this.disabledRanges.add(rangeKey);
                }
                
                // Обновляем decorations
                this.updateDecorations(editor);
                break;
            }
        }
        
        // Если клик был вне i18n ключей, возвращаем все переводы обратно
        if (!clickedOnI18nKey && this.disabledRanges.size > 0) {
            this.disabledRanges.clear();
            this.updateDecorations(editor);
        }
    }

    dispose(): void {
        this.decorationType.dispose();
        this.originalKeyDecorationType.dispose();
    }
}

