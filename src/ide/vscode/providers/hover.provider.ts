import * as vscode from 'vscode';
import { ApiService, CacheService } from '../../../shared/services';
import { IStorageService, IConfigService } from '../../../shared/types';
import { getI18nKeyInfoAtPosition } from '../../../shared/utils';
import { SUPPORTED_LOCALES } from '../../../shared/constants';

export class VSCodeHoverProvider implements vscode.HoverProvider {
    constructor(
        private apiService: ApiService,
        private cacheService: CacheService,
        private storageService: IStorageService,
        private configService: IConfigService
    ) {}

    async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.Hover | undefined> {
        const keyInfo = getI18nKeyInfoAtPosition(
            {
                getText: () => document.getText(),
                uri: {
                    toString: () => document.uri.toString(),
                    fsPath: document.uri.fsPath
                }
            },
            {
                line: position.line,
                character: position.character
            }
        );
        
        if (!keyInfo) {
            return undefined;
        }

        const { key, range } = keyInfo;
        const token = await this.storageService.getToken();
        
        if (!token) {
            return undefined;
        }

        const locale = this.configService.getLocale();
        
        await this.ensureAllLocalesLoaded();

        const markdown = this.createTranslationTable(key);
        
        if (!markdown) {
            return undefined;
        }

        const vscodeRange = new vscode.Range(
            new vscode.Position(range.start.line, range.start.character),
            new vscode.Position(range.end.line, range.end.character)
        );

        return new vscode.Hover(markdown, vscodeRange);
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

        markdown.appendMarkdown(`\`${key}\`\n\n`);
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
            'uz': '🇺🇿'
        };
        return flags[locale] || '🌐';
    }

    private async fetchAndCacheLocales(locale: string): Promise<void> {
        const projectKey = this.configService.getProjectKey();
        const locales = await this.apiService.fetchLocales(undefined, locale, projectKey);
        this.cacheService.set(locale, locales);
    }
}

