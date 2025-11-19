import { IConfigService, IWindowService } from '../../../shared/types';

export class ConfigLocalizationApiBaseUrlAction {
    constructor(
        private configService: IConfigService,
        private windowService: IWindowService
    ) {}

    async execute(): Promise<void> {
        const currentUrl = await this.configService.getLocalizationApiBaseUrl().catch(() => '');
        
        const url = await this.windowService.showInputBox({
            prompt: 'Localization API Base URL',
            value: currentUrl,
            placeHolder: 'https://localization-api.example.com',
            validateInput: (value) => {
                if (!value.trim()) {
                    return 'URL не может быть пустым';
                }
                try {
                    new URL(value);
                    return null;
                } catch {
                    return 'Некорректный URL';
                }
            }
        });

        if (url) {
            await (this.configService as any).updateLocalizationApiBaseUrl(url);
            this.windowService.showInformationMessage('URL сохранен');
        }
    }
}

