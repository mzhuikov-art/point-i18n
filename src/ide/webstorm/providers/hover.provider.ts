import { ApiService, CacheService } from '../../../shared/services';
import { IStorageService, IConfigService, Position, TextDocument } from '../../../shared/types';
import { getI18nKeyInfoAtPosition } from '../../../shared/utils';
import { SUPPORTED_LOCALES } from '../../../shared/constants';

export class WebStormHoverProvider {
    constructor(
        private apiService: ApiService,
        private cacheService: CacheService,
        private storageService: IStorageService,
        private configService: IConfigService
    ) {}

    async provideHover(
        document: TextDocument,
        position: Position
    ): Promise<string | undefined> {
        const keyInfo = getI18nKeyInfoAtPosition(document, position);
        
        if (!keyInfo) {
            return undefined;
        }

        const { key } = keyInfo;
        const token = await this.storageService.getToken();
        
        if (!token) {
            return undefined;
        }

        await this.ensureAllLocalesLoaded();

        const markdown = this.createTranslationTable(key);
        
        return markdown;
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

    private createTranslationTable(key: string): string | undefined {
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

        let markdown = `\`${key}\`\n\n`;
        markdown += `| | |\n`;
        markdown += `|---|---|\n`;
        
        for (const lang of languages) {
            const flag = this.getFlag(lang);
            const translation = translations[lang];
            markdown += `| ${flag} **${lang.toUpperCase()}** | ${translation} |\n`;
        }
        
        markdown += `\n💡 *Кликните для редактирования*`;

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

