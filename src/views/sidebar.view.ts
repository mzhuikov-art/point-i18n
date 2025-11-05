import * as vscode from 'vscode';
import { ApiService } from '../services/api.service';
import { CacheService } from '../services/cache.service';
import { StorageService } from '../services/storage.service';
import { DecorationProvider } from '../providers/decoration.provider';
import { getSidebarHtml } from './sidebar.html';
import { SUPPORTED_LOCALES } from '../constants';
import { CreateKeyRequest } from '../services/api.service.types';

export class SidebarViewProvider implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private apiService: ApiService,
        private cacheService: CacheService,
        private storageService: StorageService,
        private decorationProvider: DecorationProvider
    ) {}

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ): void | Thenable<void> {
        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        webviewView.webview.html = getSidebarHtml();

        // Обработка сообщений
        webviewView.webview.onDidReceiveMessage(async (message) => {
            await this.handleMessage(message);
        });
    }

    private async handleMessage(message: any): Promise<void> {
        switch (message.command) {
            case 'init':
                await this.updateView();
                break;
            case 'login':
                await this.handleLogin(message.username, message.password);
                break;
            case 'logout':
                await this.handleLogout();
                break;
            case 'refresh':
                await this.handleRefresh();
                break;
            case 'toggleDecorations':
                this.handleToggleDecorations();
                break;
            case 'changeLocale':
                await this.handleChangeLocale(message.locale);
                break;
            case 'changeProject':
                await this.handleChangeProject(message.projectKey);
                break;
            case 'fetchProjects':
                await this.handleFetchProjects();
                break;
            case 'createKey':
                await this.handleCreateKey(message.key, message.translations);
                break;
            case 'searchKeys':
                await this.handleSearchKeys(message.query, message.pageNumber || 1);
                break;
            case 'updateKey':
                await this.handleUpdateKey(message.key, message.translations);
                break;
        }
    }

    private async handleLogin(username: string, password: string): Promise<void> {
        try {
            this.sendMessage({ command: 'showMessage', text: '⏳ Авторизация...', type: 'info' });

            const token = await this.apiService.authenticate(username, password);
            
            if (!token) {
                this.sendMessage({ command: 'showMessage', text: '❌ Ошибка авторизации', type: 'error' });
                return;
            }

            await this.storageService.saveToken(token);
            await this.loadAllLocales(token);
            
            this.sendMessage({ command: 'showMessage', text: '✅ Успешная авторизация', type: 'success' });
            await this.updateView();
            
            // Обновляем decorations в активном редакторе
            if (vscode.window.activeTextEditor) {
                await this.decorationProvider.updateDecorations(vscode.window.activeTextEditor);
            }
        } catch (error: any) {
            this.sendMessage({ 
                command: 'showMessage', 
                text: `❌ Ошибка: ${error.message}`, 
                type: 'error' 
            });
        }
    }

    private async handleLogout(): Promise<void> {
        await this.storageService.deleteToken();
        this.cacheService.clear();
        this.sendMessage({ command: 'showMessage', text: 'Выход выполнен', type: 'info' });
        await this.updateView();
    }

    private async handleRefresh(): Promise<void> {
        const token = await this.storageService.getToken();
        
        if (!token) {
            this.sendMessage({ command: 'showMessage', text: '❌ Нет токена', type: 'error' });
            return;
        }

        this.sendMessage({ command: 'showMessage', text: '⏳ Обновление...', type: 'info' });
        
        await this.loadAllLocales(token);
        
        this.sendMessage({ command: 'showMessage', text: '✅ Переводы обновлены', type: 'success' });
        await this.updateView();
        
        // Обновляем decorations
        if (vscode.window.activeTextEditor) {
            await this.decorationProvider.updateDecorations(vscode.window.activeTextEditor);
        }
        
        // Перезапускаем поиск
        this.sendMessage({ command: 'refreshSearch' });
    }

    private handleToggleDecorations(): void {
        this.decorationProvider.toggle();
        
        if (vscode.window.activeTextEditor) {
            this.decorationProvider.updateDecorations(vscode.window.activeTextEditor);
        }
    }

    private getProjectKey(): string {
        return vscode.workspace.getConfiguration('i18nRemote').get<string>('projectKey') || 'point-frontend';
    }

    private async handleChangeLocale(locale: string): Promise<void> {
        await vscode.workspace.getConfiguration('i18nRemote').update(
            'locale',
            locale,
            vscode.ConfigurationTarget.Global
        );
        
        this.sendMessage({ command: 'showMessage', text: `Язык изменен: ${locale}`, type: 'success' });
        
        if (vscode.window.activeTextEditor) {
            await this.decorationProvider.updateDecorations(vscode.window.activeTextEditor);
        }
    }

    private async handleChangeProject(projectKey: string): Promise<void> {
        await vscode.workspace.getConfiguration('i18nRemote').update(
            'projectKey',
            projectKey,
            vscode.ConfigurationTarget.Global
        );
        
        const token = await this.storageService.getToken();
        if (token) {
            this.sendMessage({ command: 'showMessage', text: '⏳ Загрузка переводов...', type: 'info' });
            await this.loadAllLocales(token);
            this.sendMessage({ command: 'showMessage', text: '✅ Переводы обновлены', type: 'success' });
        }
        
        await this.updateView();
        
        if (vscode.window.activeTextEditor) {
            await this.decorationProvider.updateDecorations(vscode.window.activeTextEditor);
        }
    }

    private async handleFetchProjects(): Promise<void> {
        const token = await this.storageService.getToken();
        if (!token) {
            this.sendMessage({ 
                command: 'projectsResponse', 
                projects: [],
                error: 'Нет токена'
            });
            return;
        }

        try {
            const response = await this.apiService.fetchProjects(token);
            this.sendMessage({
                command: 'projectsResponse',
                projects: response.data
            });
        } catch (error: any) {
            this.sendMessage({
                command: 'projectsResponse',
                projects: [],
                error: error.message
            });
        }
    }

    private async handleCreateKey(key: string, translations: { ru: string; en: string; uz: string }): Promise<void> {
        if (!key || !key.trim()) {
            this.sendMessage({ 
                command: 'createKeyResult', 
                text: '❌ Введите ключ', 
                type: 'error' 
            });
            return;
        }

        const token = await this.storageService.getToken();
        if (!token) {
            this.sendMessage({ 
                command: 'createKeyResult', 
                text: '❌ Нет токена', 
                type: 'error' 
            });
            return;
        }

        try {
            const projectKey = this.getProjectKey();
            const request: CreateKeyRequest = {
                key: key.trim(),
                translations: {
                    ru: translations.ru || '',
                    en: translations.en || '',
                    uz: translations.uz || ''
                }
            };

            const response = await this.apiService.createKey(token, request, projectKey);
            
            // Добавляем ключ в кеш
            this.cacheService.addKey(response.data.key, response.data.translations);
            
            // Добавляем ключ в существующие результаты поиска
            this.sendMessage({
                command: 'addKeyToResults',
                key: response.data.key,
                translations: {
                    ru: response.data.translations.ru || '',
                    en: response.data.translations.en || '',
                    uz: response.data.translations.uz || ''
                }
            });
            
            this.sendMessage({ 
                command: 'createKeyResult', 
                text: `✅ Ключ "${response.data.key}" создан`, 
                type: 'success' 
            });
            
            // Обновляем статистику
            await this.updateView();
            
            // Обновляем decorations в активном редакторе
            if (vscode.window.activeTextEditor) {
                await this.decorationProvider.updateDecorations(vscode.window.activeTextEditor);
            }
        } catch (error: any) {
            this.sendMessage({ 
                command: 'createKeyResult', 
                text: `❌ ${error.message}`, 
                type: 'error' 
            });
        }
    }

    private async loadAllLocales(token: string): Promise<void> {
        const projectKey = this.getProjectKey();
        const promises = SUPPORTED_LOCALES.map(async (locale) => {
            try {
                const locales = await this.apiService.fetchLocales(token, locale, projectKey);
                this.cacheService.set(locale, locales);
            } catch (error) {
                console.error(`Failed to fetch ${locale}:`, error);
            }
        });
        
        await Promise.all(promises);
    }

    private async updateView(): Promise<void> {
        const token = await this.storageService.getToken();
        const isAuthenticated = !!token;
        
        this.sendMessage({
            command: 'updateAuth',
            isAuthenticated
        });

        if (isAuthenticated && token) {
            // Проверяем, есть ли все локали в кеше
            const hasAllLocales = SUPPORTED_LOCALES.every(locale => this.cacheService.has(locale));
            
            // Если нет всех локалей, загружаем их
            if (!hasAllLocales) {
                await this.loadAllLocales(token);
            }
            
            const stats = this.getStats();
            this.sendMessage({
                command: 'updateStats',
                stats
            });
        }

        const locale = vscode.workspace.getConfiguration('i18nRemote').get<string>('locale') || 'ru';
        const projectKey = this.getProjectKey();
        this.sendMessage({
            command: 'updateLocale',
            locale
        });
        
        // Загружаем проекты и отправляем текущий проект
        if (token) {
            try {
                const projectsResponse = await this.apiService.fetchProjects(token);
                const currentProject = projectsResponse.data.find(p => p.key === projectKey);
                this.sendMessage({
                    command: 'updateProject',
                    projectKey,
                    projectName: currentProject?.name || projectKey
                });
                this.sendMessage({
                    command: 'projectsResponse',
                    projects: projectsResponse.data
                });
            } catch (error) {
                this.sendMessage({
                    command: 'updateProject',
                    projectKey,
                    projectName: projectKey
                });
            }
        } else {
            this.sendMessage({
                command: 'updateProject',
                projectKey,
                projectName: projectKey
            });
        }
    }

    private async handleSearchKeys(query: string, pageNumber: number = 1): Promise<void> {
        const token = await this.storageService.getToken();
        if (!token) {
            this.sendMessage({
                command: 'searchResults',
                results: [],
                totalCount: 0,
                totalPages: 0,
                currentPage: 1,
                query: query
            });
            return;
        }

        try {
            const projectKey = this.getProjectKey();
            const response = await this.apiService.searchKeys(token, query, projectKey, pageNumber, 10);
            
            this.sendMessage({
                command: 'searchResults',
                results: response.data.map(item => ({
                    key: item.key,
                    translations: {
                        ru: item.translations.ru || '',
                        en: item.translations.en || '',
                        uz: item.translations.uz || ''
                    }
                })),
                totalCount: response.totalCount,
                totalPages: response.totalPages,
                currentPage: pageNumber,
                query: query
            });
        } catch (error: any) {
            console.error('Search error:', error);
            this.sendMessage({
                command: 'searchResults',
                results: [],
                totalCount: 0,
                totalPages: 0,
                currentPage: 1,
                query: query
            });
        }
    }

    private async handleUpdateKey(key: string, translations: { ru: string; en: string; uz: string }): Promise<void> {
        const token = await this.storageService.getToken();
        if (!token) {
            this.sendMessage({ 
                command: 'updateKeyResult', 
                text: '❌ Нет токена', 
                type: 'error' 
            });
            return;
        }

        try {
            const projectKey = this.getProjectKey();
            const request: CreateKeyRequest = {
                key: key.trim(),
                translations: {
                    ru: translations.ru || '',
                    en: translations.en || '',
                    uz: translations.uz || ''
                }
            };

            const response = await this.apiService.updateKey(token, request, projectKey);
            
            // Обновляем ключ в кеше
            this.cacheService.updateKey(response.data.key, response.data.translations);
            
            this.sendMessage({ 
                command: 'updateKeyResult', 
                text: `✅ Ключ "${response.data.key}" обновлен`, 
                type: 'success' 
            });
            
            // Обновляем статистику
            await this.updateView();
            
            // Обновляем decorations в активном редакторе
            if (vscode.window.activeTextEditor) {
                await this.decorationProvider.updateDecorations(vscode.window.activeTextEditor);
            }
            
            // Перезапускаем поиск
            this.sendMessage({ command: 'refreshSearch' });
        } catch (error: any) {
            this.sendMessage({ 
                command: 'updateKeyResult', 
                text: `❌ ${error.message}`, 
                type: 'error' 
            });
        }
    }

    private getStats(): Record<string, number> {
        const stats: Record<string, number> = {};
        
        for (const locale of SUPPORTED_LOCALES) {
            const data = this.cacheService.get(locale);
            stats[locale] = data ? Object.keys(data).length : 0;
        }
        
        return stats;
    }

    private sendMessage(message: any): void {
        this.view?.webview.postMessage(message);
    }
}

