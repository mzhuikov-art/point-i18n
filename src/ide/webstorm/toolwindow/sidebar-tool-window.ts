import { ApiService, CacheService } from '../../../shared/services';
import { IStorageService, IConfigService, IWindowService } from '../../../shared/types';
import { getSidebarHtml } from '../../../shared/views/sidebar.html';

export class SidebarToolWindow {
    private htmlContent: string = '';

    constructor(
        private apiService: ApiService,
        private cacheService: CacheService,
        private storageService: IStorageService,
        private configService: IConfigService,
        private windowService: IWindowService
    ) {
        this.initializeHtml();
    }

    private initializeHtml(): void {
        // Для WebStorm используем JCEF Browser или упрощенную версию
        // Адаптируем shared HTML для WebStorm
        // В shared/views/sidebar.html.ts функция не принимает параметры,
        // поэтому используем базовую версию
        this.htmlContent = getSidebarHtml();
    }

    getHtml(): string {
        return this.htmlContent;
    }

    private async handleMessage(message: any): Promise<void> {
        switch (message.command) {
            case 'login':
                await this.handleLogin(message.login, message.password);
                break;
            case 'logout':
                await this.handleLogout();
                break;
            case 'fetchNow':
                await this.handleFetchNow();
                break;
        }
    }

    private async handleLogin(login: string, password: string): Promise<void> {
        try {
            const authResponse = await this.apiService.authenticate(login, password);
            await this.storageService.saveTokens(authResponse);
            this.windowService.showInformationMessage('Токены сохранены');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Ошибка авторизации';
            await this.windowService.showErrorMessage(message);
        }
    }

    private async handleLogout(): Promise<void> {
        await this.storageService.deleteTokens();
        this.windowService.showInformationMessage('Токены удалены');
    }

    private async handleFetchNow(): Promise<void> {
        const token = await this.storageService.getToken();
        if (!token) {
            await this.windowService.showErrorMessage('Токен не найден');
            return;
        }

        try {
            const projectKey = this.configService.getProjectKey();
            // Загружаем локализации
            this.windowService.showInformationMessage('Загрузка локализаций...');
            // Реализация загрузки
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Ошибка загрузки';
            await this.windowService.showErrorMessage(message);
        }
    }
}

