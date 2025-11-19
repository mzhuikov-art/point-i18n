export interface IConfigService {
    getLocale(): string;
    getProjectKey(): string;
    getSearchPath(): string;
    getApiBaseUrl(): Promise<string>;
    getLocalizationApiBaseUrl(): Promise<string>;
    updateLocale(locale: string): Promise<void>;
    updateProjectKey(projectKey: string): Promise<void>;
    updateSearchPath(searchPath: string): Promise<void>;
}

