import { ApiService, CacheService } from '../../../shared/services';
import { IStorageService, IConfigService, Position, TextDocument } from '../../../shared/types';
import { getI18nKeyInfoAtPosition } from '../../../shared/utils';
import { SUPPORTED_LOCALES } from '../../../shared/constants';

export class WebStormLineMarkerProvider {
    constructor(
        private apiService: ApiService,
        private cacheService: CacheService,
        private storageService: IStorageService,
        private configService: IConfigService
    ) {}

    async getLineMarkerInfo(
        document: TextDocument,
        lineNumber: number
    ): Promise<{ text: string; range: { start: Position; end: Position } } | undefined> {
        // Получаем позицию в начале строки
        const position: Position = { line: lineNumber, character: 0 };
        const keyInfo = getI18nKeyInfoAtPosition(document, position);
        
        if (!keyInfo) {
            return undefined;
        }

        const { key, range } = keyInfo;
        const token = await this.storageService.getToken();
        
        if (!token) {
            return undefined;
        }

        const locale = this.configService.getLocale();
        
        await this.ensureLocaleLoaded(locale);

        const translation = this.cacheService.getTranslation(locale, key);
        
        if (!translation) {
            return undefined;
        }

        return {
            text: translation,
            range
        };
    }

    private async ensureLocaleLoaded(locale: string): Promise<void> {
        if (!this.cacheService.has(locale)) {
            try {
                await this.fetchAndCacheLocales(locale);
            } catch (error) {
                console.error(`Failed to load ${locale}:`, error);
            }
        }
    }

    private async fetchAndCacheLocales(locale: string): Promise<void> {
        const projectKey = this.configService.getProjectKey();
        const locales = await this.apiService.fetchLocales(undefined, locale, projectKey);
        this.cacheService.set(locale, locales);
    }
}

