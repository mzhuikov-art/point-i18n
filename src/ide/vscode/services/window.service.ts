import * as vscode from 'vscode';
import { IWindowService, IWebviewPanel } from '../../../shared/types';

export class VSCodeWindowService implements IWindowService {
    showInformationMessage(message: string): void {
        vscode.window.showInformationMessage(message);
    }

    async showErrorMessage(message: string, ...actions: string[]): Promise<string | undefined> {
        return await vscode.window.showErrorMessage(message, ...actions);
    }

    showWarningMessage(message: string): void {
        vscode.window.showWarningMessage(message);
    }

    async showInputBox(options: {
        prompt: string;
        value?: string;
        placeHolder?: string;
        validateInput?: (value: string) => string | null;
    }): Promise<string | undefined> {
        return await vscode.window.showInputBox(options);
    }

    createWebviewPanel(viewType: string, title: string, viewColumn: any, options: { enableScripts: boolean }): IWebviewPanel {
        const panel = vscode.window.createWebviewPanel(viewType, title, viewColumn, options);
        return {
            webview: {
                html: panel.webview.html,
                postMessage: (message: any) => panel.webview.postMessage(message),
                onDidReceiveMessage: (callback: (message: any) => void) => panel.webview.onDidReceiveMessage(callback)
            },
            dispose: () => panel.dispose()
        };
    }
}

