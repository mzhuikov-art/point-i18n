import * as vscode from 'vscode';
import { ApiService } from '../services/api.service';
import { CacheService } from '../services/cache.service';
import { StorageService } from '../services/storage.service';
import { getI18nKeyInfoAtPosition } from '../utils/key-parser';
import { SUPPORTED_LOCALES } from '../constants';

export class HoverProvider implements vscode.HoverProvider {
    constructor(
        private apiService: ApiService,
        private cacheService: CacheService,
        private storageService: StorageService
    ) {}

    async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.Hover | undefined> {
        const keyInfo = getI18nKeyInfoAtPosition(document, position);
        if (!keyInfo) {
            return undefined;
        }

        const { key, range } = keyInfo;
        const token = await this.storageService.getToken();
        
        if (!token) {
            return undefined;
        }

        const locale = this.getLocaleFromConfig();
        
        // Загружаем все локали если нужно
        await this.ensureAllLocalesLoaded();

        // Создаем таблицу с переводами
        const markdown = this.createTranslationTable(key);
        
        if (!markdown) {
            return undefined;
        }

        return new vscode.Hover(markdown, range);
    }

    private async ensureAllLocalesLoaded(): Promise<void> {
        for (const locale of SUPPORTED_LOCALES) {
            if (!this.cacheService.has(locale)) {
                try {
                    await this.fetchAndCacheLocales(locale);
                } catch (error) {
                    console.error(`Failed to load ${locale}:`, error);
                }
            }
        }
    }

    private createTranslationTable(key: string): vscode.MarkdownString | undefined {
        const languages = SUPPORTED_LOCALES;
        const translations: Record<string, string> = {};
        let hasAnyTranslation = false;

        // Получаем переводы для всех языков
        for (const lang of languages) {
            const translation = this.cacheService.getTranslation(lang, key);
            if (translation) {
                translations[lang] = translation;
                hasAnyTranslation = true;
            } else {
                translations[lang] = '';
            }
        }

        if (!hasAnyTranslation) {
            return undefined;
        }

        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true;

        // Ключ в code block
        markdown.appendMarkdown(`\`${key}\`\n\n`);
        
        // Таблица переводов
        markdown.appendMarkdown(`| | |\n`);
        markdown.appendMarkdown(`|---|---|\n`);
        
        for (const lang of languages) {
            const flag = this.getFlag(lang);
            const translation = translations[lang];
            markdown.appendMarkdown(`| ${flag} **${lang.toUpperCase()}** | ${translation} |\n`);
        }
        
        markdown.appendMarkdown(`\n💡 *Кликните для редактирования*`);

        return markdown;
    }

    private getFlag(locale: string): string {
        const flags: Record<string, string> = {
            'ru': '🇷🇺',
            'en': '🇬🇧',
            'uz': '🇺🇿',
            'cn': '🇨🇳'
        };
        return flags[locale] || '🌐';
    }

    private getLocaleFromConfig(): string {
        return vscode.workspace.getConfiguration('i18nRemote').get<string>('locale') || 'ru';
    }

    private getProjectKey(): string {
        return vscode.workspace.getConfiguration('i18nRemote').get<string>('projectKey') || 'point-frontend';
    }

    private async fetchAndCacheLocales(locale: string): Promise<void> {
        const projectKey = this.getProjectKey();
        const locales = await this.apiService.fetchLocales(undefined, locale, projectKey);
        this.cacheService.set(locale, locales);
    }
}

