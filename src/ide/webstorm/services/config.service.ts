import { IConfigService } from '../../shared/types';

function normalizeUrl(url: string): string {
    return url.trim().replace(/\/+$/, '');
}

export class WebStormConfigService implements IConfigService {
    getLocale(): string {
        // TODO: Implement WebStorm config API
        return 'ru';
    }

    getProjectKey(): string {
        // TODO: Implement WebStorm config API
        return 'point-frontend';
    }

    getSearchPath(): string {
        // TODO: Implement WebStorm config API
        return 'src';
    }

    async getApiBaseUrl(): Promise<string> {
        // TODO: Implement WebStorm config API
        throw new Error('i18nRemote.apiBaseUrl не настроен');
    }

    async getLocalizationApiBaseUrl(): Promise<string> {
        // TODO: Implement WebStorm config API
        throw new Error('i18nRemote.localizationApiBaseUrl не настроен');
    }

    async updateLocale(locale: string): Promise<void> {
        // TODO: Implement WebStorm config API
    }

    async updateProjectKey(projectKey: string): Promise<void> {
        // TODO: Implement WebStorm config API
    }

    async updateSearchPath(searchPath: string): Promise<void> {
        // TODO: Implement WebStorm config API
    }
}

