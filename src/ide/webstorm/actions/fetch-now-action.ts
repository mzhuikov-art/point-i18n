import { ApiService, CacheService } from '../../../shared/services';
import { IStorageService, IConfigService, IWindowService } from '../../../shared/types';
import { getLocalesForProject, OPTIONAL_LOCALES } from '../../../shared/constants';

export class FetchNowAction {
    constructor(
        private apiService: ApiService,
        private cacheService: CacheService,
        private storageService: IStorageService,
        private configService: IConfigService,
        private windowService: IWindowService
    ) {}

    async execute(): Promise<void> {
        const token = await this.storageService.getToken();
        if (!token) {
            await this.windowService.showErrorMessage('Токен не найден. Сначала выполните вход.');
            return;
        }

        try {
            const projectKey = this.configService.getProjectKey();
            this.windowService.showInformationMessage('Загрузка локализаций...');

            for (const locale of getLocalesForProject(projectKey)) {
                try {
                    const locales = await this.apiService.fetchLocales(undefined, locale, projectKey);
                    this.cacheService.set(locale, locales);
                } catch (error) {
                    console.error(`Failed to fetch ${locale}:`, error);
                    if (OPTIONAL_LOCALES.includes(locale)) {
                        this.cacheService.set(locale, {});
                    }
                }
            }

            this.windowService.showInformationMessage('Локализации загружены');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Ошибка загрузки локализаций';
            await this.windowService.showErrorMessage(message);
        }
    }
}

