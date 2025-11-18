export interface IWindowService {
    showInformationMessage(message: string): void;
    showErrorMessage(message: string, ...actions: string[]): Promise<string | undefined>;
    showWarningMessage(message: string): void;
    showInputBox(options: {
        prompt: string;
        value?: string;
        placeHolder?: string;
        validateInput?: (value: string) => string | null;
    }): Promise<string | undefined>;
    createWebviewPanel(viewType: string, title: string, viewColumn: any, options: { enableScripts: boolean }): IWebviewPanel;
}

export interface IWebviewPanel {
    webview: {
        html: string;
        postMessage(message: any): void;
        onDidReceiveMessage(callback: (message: any) => void): { dispose(): void };
    };
    dispose(): void;
}

