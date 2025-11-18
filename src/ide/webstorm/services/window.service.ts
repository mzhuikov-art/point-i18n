import { IWindowService, IWebviewPanel } from '../../../shared/types';

export class WebStormWindowService implements IWindowService {
    showInformationMessage(message: string): void {
        try {
            // @ts-ignore
            com.intellij.openapi.ui.Messages.showInfoMessage(message, 'Point I18n');
        } catch (error) {
            console.log(`INFO: ${message}`);
        }
    }

    async showErrorMessage(message: string, ...actions: string[]): Promise<string | undefined> {
        try {
            // @ts-ignore
            const result = com.intellij.openapi.ui.Messages.showErrorDialog(
                message,
                'Point I18n',
                actions.length > 0 ? actions : ['OK']
            );
            return result === 0 && actions.length > 0 ? actions[0] : undefined;
        } catch (error) {
            console.error(`ERROR: ${message}`);
            return undefined;
        }
    }

    showWarningMessage(message: string): void {
        try {
            // @ts-ignore
            com.intellij.openapi.ui.Messages.showWarningDialog(message, 'Point I18n');
        } catch (error) {
            console.warn(`WARN: ${message}`);
        }
    }

    async showInputBox(options: {
        prompt: string;
        value?: string;
        placeHolder?: string;
        validateInput?: (value: string) => string | null;
    }): Promise<string | undefined> {
        try {
            // @ts-ignore
            const dialog = new com.intellij.openapi.ui.InputDialog(
                null, // parentComponent
                options.prompt,
                'Point I18n',
                null, // icon
                options.value || '',
                null, // validator
                options.placeHolder ? [options.placeHolder] : []
            );
            
            if (dialog.showAndGet()) {
                const result = dialog.getInputString();
                if (options.validateInput) {
                    const validation = options.validateInput(result);
                    if (validation) {
                        this.showErrorMessage(validation);
                        return undefined;
                    }
                }
                return result;
            }
            return undefined;
        } catch (error) {
            console.error('Error showing input box:', error);
            return undefined;
        }
    }

    createWebviewPanel(viewType: string, title: string, viewColumn: any, options: { enableScripts: boolean }): IWebviewPanel {
        // Для WebStorm используем JCEF Browser или ToolWindow
        // Упрощенная реализация через ToolWindow
        return {
            webview: {
                html: '',
                postMessage: () => {
                    // Реализация через ToolWindow
                },
                onDidReceiveMessage: () => ({ dispose: () => {} })
            },
            dispose: () => {}
        };
    }
}
