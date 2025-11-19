import { getLoginHtml } from '../../../shared/views/login.html';

export function getVSCodeLoginHtml(): string {
    return getLoginHtml(() => {
        // @ts-ignore - acquireVsCodeApi доступен в контексте webview
        const vscode = acquireVsCodeApi();
        return {
            postMessage: (message: any) => vscode.postMessage(message)
        };
    });
}
