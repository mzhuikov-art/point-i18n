import { IConfigService } from '../../../shared/types';

function normalizeUrl(url: string): string {
    return url.trim().replace(/\/+$/, '');
}

export class WebStormConfigService implements IConfigService {
    private readonly CONFIG_NAMESPACE = 'point.i18n';
    private readonly LOCALE_KEY = 'locale';
    private readonly PROJECT_KEY_KEY = 'projectKey';
    private readonly SEARCH_PATH_KEY = 'searchPath';
    private readonly API_BASE_URL_KEY = 'apiBaseUrl';
    private readonly LOCALIZATION_API_BASE_URL_KEY = 'localizationApiBaseUrl';

    private getProperties(): any {
        // @ts-ignore
        return com.intellij.ide.util.PropertiesComponent.getInstance();
    }

    getLocale(): string {
        try {
            const props = this.getProperties();
            return props.getValue(`${this.CONFIG_NAMESPACE}.${this.LOCALE_KEY}`) || 'ru';
        } catch (error) {
            console.error('Error getting locale:', error);
            return 'ru';
        }
    }

    getProjectKey(): string {
        try {
            const props = this.getProperties();
            return props.getValue(`${this.CONFIG_NAMESPACE}.${this.PROJECT_KEY_KEY}`) || 'point-frontend';
        } catch (error) {
            console.error('Error getting project key:', error);
            return 'point-frontend';
        }
    }

    getSearchPath(): string {
        try {
            const props = this.getProperties();
            return props.getValue(`${this.CONFIG_NAMESPACE}.${this.SEARCH_PATH_KEY}`) || 'src';
        } catch (error) {
            console.error('Error getting search path:', error);
            return 'src';
        }
    }

    async getApiBaseUrl(): Promise<string> {
        try {
            const props = this.getProperties();
            const url = props.getValue(`${this.CONFIG_NAMESPACE}.${this.API_BASE_URL_KEY}`);
            if (!url) {
                throw new Error('i18nRemote.apiBaseUrl не настроен');
            }
            return normalizeUrl(url);
        } catch (error) {
            console.error('Error getting API base URL:', error);
            throw error;
        }
    }

    async getLocalizationApiBaseUrl(): Promise<string> {
        try {
            const props = this.getProperties();
            const url = props.getValue(`${this.CONFIG_NAMESPACE}.${this.LOCALIZATION_API_BASE_URL_KEY}`);
            if (!url) {
                throw new Error('i18nRemote.localizationApiBaseUrl не настроен');
            }
            return normalizeUrl(url);
        } catch (error) {
            console.error('Error getting localization API base URL:', error);
            throw error;
        }
    }

    async updateLocale(locale: string): Promise<void> {
        try {
            const props = this.getProperties();
            props.setValue(`${this.CONFIG_NAMESPACE}.${this.LOCALE_KEY}`, locale);
        } catch (error) {
            console.error('Error updating locale:', error);
            throw error;
        }
    }

    async updateProjectKey(projectKey: string): Promise<void> {
        try {
            const props = this.getProperties();
            props.setValue(`${this.CONFIG_NAMESPACE}.${this.PROJECT_KEY_KEY}`, projectKey);
        } catch (error) {
            console.error('Error updating project key:', error);
            throw error;
        }
    }

    async updateSearchPath(searchPath: string): Promise<void> {
        try {
            const props = this.getProperties();
            props.setValue(`${this.CONFIG_NAMESPACE}.${this.SEARCH_PATH_KEY}`, searchPath);
        } catch (error) {
            console.error('Error updating search path:', error);
            throw error;
        }
    }

    async updateApiBaseUrl(url: string): Promise<void> {
        try {
            const props = this.getProperties();
            props.setValue(`${this.CONFIG_NAMESPACE}.${this.API_BASE_URL_KEY}`, normalizeUrl(url));
        } catch (error) {
            console.error('Error updating API base URL:', error);
            throw error;
        }
    }

    async updateLocalizationApiBaseUrl(url: string): Promise<void> {
        try {
            const props = this.getProperties();
            props.setValue(`${this.CONFIG_NAMESPACE}.${this.LOCALIZATION_API_BASE_URL_KEY}`, normalizeUrl(url));
        } catch (error) {
            console.error('Error updating localization API base URL:', error);
            throw error;
        }
    }
}
