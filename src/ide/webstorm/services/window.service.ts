import { IWindowService, IWebviewPanel } from '../../shared/types';

export class WebStormWindowService implements IWindowService {
    showInformationMessage(message: string): void {
        // TODO: Implement WebStorm notification API
        console.log(`INFO: ${message}`);
    }

    async showErrorMessage(message: string, ...actions: string[]): Promise<string | undefined> {
        // TODO: Implement WebStorm notification API
        console.error(`ERROR: ${message}`);
        return undefined;
    }

    showWarningMessage(message: string): void {
        // TODO: Implement WebStorm notification API
        console.warn(`WARN: ${message}`);
    }

    async showInputBox(options: {
        prompt: string;
        value?: string;
        placeHolder?: string;
        validateInput?: (value: string) => string | null;
    }): Promise<string | undefined> {
        // TODO: Implement WebStorm input dialog API
        return undefined;
    }

    createWebviewPanel(viewType: string, title: string, viewColumn: any, options: { enableScripts: boolean }): IWebviewPanel {
        // TODO: Implement WebStorm webview API
        return {
            webview: {
                html: '',
                postMessage: () => {},
                onDidReceiveMessage: () => ({ dispose: () => {} })
            },
            dispose: () => {}
        };
    }
}

