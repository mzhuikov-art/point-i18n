import { ApiService } from '../../../shared/services';
import { IStorageService, IConfigService, IWindowService } from '../../../shared/types';

export class OpenLoginAction {
    constructor(
        private apiService: ApiService,
        private storageService: IStorageService,
        private configService: IConfigService,
        private windowService: IWindowService
    ) {}

    async execute(): Promise<void> {
        // Открываем диалог логина
        const username = await this.windowService.showInputBox({
            prompt: 'Username',
            placeHolder: 'Enter your username'
        });

        if (!username) {
            return;
        }

        const password = await this.windowService.showInputBox({
            prompt: 'Password',
            placeHolder: 'Enter your password'
        });

        if (!password) {
            return;
        }

        try {
            const authResponse = await this.apiService.authenticate(username, password);
            await this.storageService.saveTokens(authResponse);
            this.windowService.showInformationMessage('Токены сохранены');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Ошибка авторизации';
            await this.windowService.showErrorMessage(message);
        }
    }
}

