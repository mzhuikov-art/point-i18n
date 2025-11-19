"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
class CacheService {
    constructor() {
        this.cache = new Map();
    }
    get(locale) {
        return this.cache.get(locale);
    }
    set(locale, data) {
        this.cache.set(locale, data);
    }
    has(locale) {
        return this.cache.has(locale);
    }
    clear() {
        this.cache.clear();
    }
    getTranslation(locale, key) {
        const localeData = this.cache.get(locale);
        return localeData?.[key];
    }
    addKey(key, translations) {
        for (const [locale, translation] of Object.entries(translations)) {
            const localeData = this.cache.get(locale) || {};
            localeData[key] = translation;
            this.cache.set(locale, localeData);
        }
    }
    updateKey(key, translations) {
        this.addKey(key, translations);
    }
    searchKeys(query) {
        const results = [];
        const queryLower = query.toLowerCase();
        if (!query || query.trim().length === 0) {
            return results;
        }
        const firstLocale = Array.from(this.cache.keys())[0];
        if (!firstLocale) {
            return results;
        }
        const firstLocaleData = this.cache.get(firstLocale);
        if (!firstLocaleData) {
            return results;
        }
        for (const key of Object.keys(firstLocaleData)) {
            if (key.toLowerCase().includes(queryLower)) {
                const translations = {};
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
exports.CacheService = CacheService;
//# sourceMappingURL=cache.service.js.map