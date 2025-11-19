import * as vscode from 'vscode';
import { IConfigService } from '../../../shared/types';

function normalizeUrl(url: string): string {
    return url.trim().replace(/\/+$/, '');
}

export class VSCodeConfigService implements IConfigService {
    private readonly configSection = 'i18nRemote';

    getLocale(): string {
        return vscode.workspace.getConfiguration(this.configSection).get<string>('locale') || 'ru';
    }

    getProjectKey(): string {
        return vscode.workspace.getConfiguration(this.configSection).get<string>('projectKey') || 'point-frontend';
    }

    getSearchPath(): string {
        return vscode.workspace.getConfiguration(this.configSection).get<string>('searchPath') || 'src';
    }

    async getApiBaseUrl(): Promise<string> {
        const config = vscode.workspace.getConfiguration(this.configSection);
        let url = config.get<string>('apiBaseUrl');
        if (!url) {
            const action = await vscode.window.showErrorMessage(
                'i18nRemote.apiBaseUrl не настроен. Укажите базовый URL для API в настройках расширения.',
                'Настроить'
            );
            if (action === 'Настроить') {
                await vscode.commands.executeCommand('i18nRemote.configApiBaseUrl');
                const newConfig = vscode.workspace.getConfiguration(this.configSection);
                url = newConfig.get<string>('apiBaseUrl');
                if (url) {
                    return normalizeUrl(url);
                }
            }
            throw new Error('i18nRemote.apiBaseUrl не настроен');
        }
        return normalizeUrl(url);
    }

    async getLocalizationApiBaseUrl(): Promise<string> {
        const config = vscode.workspace.getConfiguration(this.configSection);
        let url = config.get<string>('localizationApiBaseUrl');
        if (!url) {
            const action = await vscode.window.showErrorMessage(
                'i18nRemote.localizationApiBaseUrl не настроен. Укажите базовый URL для API локализации в настройках расширения.',
                'Настроить'
            );
            if (action === 'Настроить') {
                await vscode.commands.executeCommand('i18nRemote.configLocalizationApiBaseUrl');
                const newConfig = vscode.workspace.getConfiguration(this.configSection);
                url = newConfig.get<string>('localizationApiBaseUrl');
                if (url) {
                    return normalizeUrl(url);
                }
            }
            throw new Error('i18nRemote.localizationApiBaseUrl не настроен');
        }
        return normalizeUrl(url);
    }

    async updateLocale(locale: string): Promise<void> {
        await vscode.workspace.getConfiguration(this.configSection).update(
            'locale',
            locale,
            vscode.ConfigurationTarget.Global
        );
    }

    async updateProjectKey(projectKey: string): Promise<void> {
        await vscode.workspace.getConfiguration(this.configSection).update(
            'projectKey',
            projectKey,
            vscode.ConfigurationTarget.Global
        );
    }

    async updateSearchPath(searchPath: string): Promise<void> {
        await vscode.workspace.getConfiguration(this.configSection).update(
            'searchPath',
            searchPath,
            vscode.ConfigurationTarget.Global
        );
    }
}

