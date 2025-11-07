import * as vscode from 'vscode';

export const SUPPORTED_LOCALES = ['ru', 'en', 'uz'];

function normalizeUrl(url: string): string {
    return url.trim().replace(/\/+$/, '');
}

async function getApiBaseUrl(): Promise<string> {
    let config = vscode.workspace.getConfiguration('i18nRemote');
    let url = config.get<string>('apiBaseUrl');
    if (!url) {
        const action = await vscode.window.showErrorMessage(
            'i18nRemote.apiBaseUrl не настроен. Укажите базовый URL для API в настройках расширения.',
            'Настроить'
        );
        if (action === 'Настроить') {
            await vscode.commands.executeCommand('i18nRemote.configApiBaseUrl');
            config = vscode.workspace.getConfiguration('i18nRemote');
            url = config.get<string>('apiBaseUrl');
            if (url) {
                return normalizeUrl(url);
            }
        }
        throw new Error('i18nRemote.apiBaseUrl не настроен');
    }
    return normalizeUrl(url);
}

async function getLocalizationApiBaseUrl(): Promise<string> {
    let config = vscode.workspace.getConfiguration('i18nRemote');
    let url = config.get<string>('localizationApiBaseUrl');
    if (!url) {
        const action = await vscode.window.showErrorMessage(
            'i18nRemote.localizationApiBaseUrl не настроен. Укажите базовый URL для API локализации в настройках расширения.',
            'Настроить'
        );
        if (action === 'Настроить') {
            await vscode.commands.executeCommand('i18nRemote.configLocalizationApiBaseUrl');
            config = vscode.workspace.getConfiguration('i18nRemote');
            url = config.get<string>('localizationApiBaseUrl');
            if (url) {
                return normalizeUrl(url);
            }
        }
        throw new Error('i18nRemote.localizationApiBaseUrl не настроен');
    }
    return normalizeUrl(url);
}

export async function getAuthUrl(): Promise<string> {
    const baseUrl = await getApiBaseUrl();
    return `${baseUrl}/api/v1/proxy/realms/auth/protocol/openid-connect/token`;
}

export async function getProjectsUrl(): Promise<string> {
    const baseUrl = await getApiBaseUrl();
    return `${baseUrl}/api/v1/proxy/localization/api/localization-project?pageSize=100`;
}

export async function getFetchLocalesUrl(locale: string, projectKey: string): Promise<string> {
    const baseUrl = await getLocalizationApiBaseUrl();
    return `${baseUrl}/api/v1/localization/${projectKey}/language/${locale}`;
}

export async function getCreateKeyUrl(projectKey: string): Promise<string> {
    const baseUrl = await getApiBaseUrl();
    return `${baseUrl}/api/v1/proxy/localization/api/localization/${projectKey}/new`;
}

export async function getUpdateKeyUrl(projectKey: string): Promise<string> {
    const baseUrl = await getApiBaseUrl();
    return `${baseUrl}/api/v1/proxy/localization/api/localization/${projectKey}`;
}

export async function getSearchKeysUrl(projectKey: string): Promise<string> {
    const baseUrl = await getApiBaseUrl();
    return `${baseUrl}/api/v1/proxy/localization/api/localization/${projectKey}`;
}

export const supportedLanguages: vscode.DocumentFilter[] = [
    { scheme: 'file', language: 'javascript' },
    { scheme: 'file', language: 'typescript' },
    { scheme: 'file', language: 'javascriptreact' },
    { scheme: 'file', language: 'typescriptreact' },
    { scheme: 'file', language: 'vue' },        // Volar
    { scheme: 'file', language: 'vue-html' },   // template
    { scheme: 'file', language: 'html' }
  ];