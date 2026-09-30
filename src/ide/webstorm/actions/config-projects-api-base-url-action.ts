import { IConfigService, IWindowService } from '../../../shared/types';

export class ConfigProjectsApiBaseUrlAction {
    constructor(
        private configService: IConfigService,
        private windowService: IWindowService
    ) {}

    async execute(): Promise<void> {
        const currentUrl = await this.configService.getProjectsApiBaseUrl().catch(() => '');

        const url = await this.windowService.showInputBox({
            prompt: 'Projects API Base URL',
            value: currentUrl,
            placeHolder: 'https://example.com',
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
            await (this.configService as any).updateProjectsApiBaseUrl(url);
            this.windowService.showInformationMessage('URL сохранен');
        }
    }
}
