export class CacheService {
    private cache: Map<string, Record<string, string>>;

    constructor() {
        this.cache = new Map();
    }

    get(locale: string): Record<string, string> | undefined {
        return this.cache.get(locale);
    }

    set(locale: string, data: Record<string, string>): void {
        this.cache.set(locale, data);
    }

    has(locale: string): boolean {
        return this.cache.has(locale);
    }

    clear(): void {
        this.cache.clear();
    }

    getTranslation(locale: string, key: string): string | undefined {
        const localeData = this.cache.get(locale);
        return localeData?.[key];
    }

    addKey(key: string, translations: Record<string, string>): void {
        for (const [locale, translation] of Object.entries(translations)) {
            const localeData = this.cache.get(locale) || {};
            localeData[key] = translation;
            this.cache.set(locale, localeData);
        }
    }

    updateKey(key: string, translations: Record<string, string>): void {
        this.addKey(key, translations); // Тот же метод, так как логика идентична
    }

    searchKeys(query: string): Array<{ key: string; translations: Record<string, string> }> {
        const results: Array<{ key: string; translations: Record<string, string> }> = [];
        const queryLower = query.toLowerCase();
        
        if (!query || query.trim().length === 0) {
            return results;
        }

        // Получаем все ключи из первого доступного языка
        const firstLocale = Array.from(this.cache.keys())[0];
        if (!firstLocale) {
            return results;
        }

        const firstLocaleData = this.cache.get(firstLocale);
        if (!firstLocaleData) {
            return results;
        }

        // Ищем совпадения по ключам
        for (const key of Object.keys(firstLocaleData)) {
            if (key.toLowerCase().includes(queryLower)) {
                const translations: Record<string, string> = {};
                
                // Собираем переводы для всех языков
                for (const locale of this.cache.keys()) {
                    const localeData = this.cache.get(locale);
                    translations[locale] = localeData?.[key] || '';
                }
                
                results.push({ key, translations });
            }
        }

        return results;
    }
}

