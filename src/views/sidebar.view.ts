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
            case 'searchTranslatedText':
                await this.handleSearchTranslatedText(message.query, message.searchPath);
                // Сохраняем путь поиска
                if (message.searchPath) {
                    await vscode.workspace.getConfiguration('i18nRemote').update(
                        'searchPath',
                        message.searchPath,
                        vscode.ConfigurationTarget.Global
                    );
                }
                break;
            case 'openFileAtLine':
                await this.handleOpenFileAtLine(message.filePath, message.line);
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
            const errorMessage = error.message || 'Ошибка авторизации';
            this.sendMessage({ 
                command: 'showMessage', 
                text: `❌ ${errorMessage}`, 
                type: 'error' 
            });
            vscode.window.showErrorMessage(`Ошибка авторизации: ${errorMessage}`);
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

    private getLocaleFromConfig(): string {
        return vscode.workspace.getConfiguration('i18nRemote').get<string>('locale') || 'ru';
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
        const searchPath = vscode.workspace.getConfiguration('i18nRemote').get<string>('searchPath') || 'src';
        
        this.sendMessage({
            command: 'updateLocale',
            locale
        });
        
        this.sendMessage({
            command: 'updateSearchPath',
            searchPath
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

    private async handleSearchTranslatedText(query: string, searchPath?: string): Promise<void> {
        if (!query || !query.trim()) {
            this.sendMessage({
                command: 'translatedSearchResults',
                results: []
            });
            return;
        }

        const token = await this.storageService.getToken();
        if (!token) {
            this.sendMessage({
                command: 'translatedSearchResults',
                results: []
            });
            return;
        }

        const locale = this.getLocaleFromConfig();
        
        // Загружаем локали если их еще нет
        if (!this.cacheService.has(locale)) {
            try {
                const projectKey = this.getProjectKey();
                const locales = await this.apiService.fetchLocales(token, locale, projectKey);
                this.cacheService.set(locale, locales);
            } catch (err) {
                console.error('Failed to fetch locales:', err);
                this.sendMessage({
                    command: 'translatedSearchResults',
                    results: []
                });
                return;
            }
        }

        const queryLower = query.toLowerCase().trim();
        const results: Array<{
            filePath: string;
            line: number;
            key: string;
            translation: string;
            preview: string;
        }> = [];

        try {
            // Шаг 1: Находим все ключи в кеше, переводы которых содержат искомый текст
            const matchingKeys = new Set<string>();
            const localeData = this.cacheService.get(locale);
            
            if (localeData) {
                for (const [key, translation] of Object.entries(localeData)) {
                    if (translation && translation.toLowerCase().includes(queryLower)) {
                        matchingKeys.add(key);
                    }
                }
            }

            if (matchingKeys.size === 0) {
                this.sendMessage({
                    command: 'translatedSearchResults',
                    results: []
                });
                return;
            }

            // Шаг 2: Определяем путь для поиска (по умолчанию src)
            const searchPathNormalized = (searchPath || 'src').trim();
            const searchPattern = searchPathNormalized 
                ? `${searchPathNormalized}/**/*.{js,ts,jsx,tsx,vue,html}`
                : '**/*.{js,ts,jsx,tsx,vue,html}';
            
            // Ищем по файлам в указанной директории
            // Увеличиваем лимит и исключаем больше ненужных директорий
            const files = await vscode.workspace.findFiles(
                searchPattern,
                '**/{node_modules,dist,build,.git,.next,.nuxt,.output}/**',
                5000
            );

            // Шаг 3: Ищем все ключи i18n в файлах и проверяем, есть ли они в списке подходящих
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const batchSize = 20;
            
            // Используем тот же паттерн, что и в DecorationProvider для консистентности
            const i18nPattern = /\b(?:\$?t|i18n\.t)\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g;
            
            for (let i = 0; i < files.length; i += batchSize) {
                const batch = files.slice(i, i + batchSize);
                
                const batchResults = await Promise.all(
                    batch.map(async (fileUri) => {
                        try {
                            // Используем readFile вместо openTextDocument для ускорения
                            const fileData = await vscode.workspace.fs.readFile(fileUri);
                            const text = Buffer.from(fileData).toString('utf-8');
                            const lines = text.split('\n');
                            
                            const fileResults: Array<{
                                filePath: string;
                                line: number;
                                key: string;
                                translation: string;
                                preview: string;
                            }> = [];
                            
                            // Ищем все ключи i18n в файле
                            let match: RegExpExecArray | null;
                            while ((match = i18nPattern.exec(text)) !== null) {
                                const key = match[2];
                                
                                // Проверяем, есть ли этот ключ в списке подходящих
                                if (matchingKeys.has(key)) {
                                    const translation = this.cacheService.getTranslation(locale, key) || '';
                                    
                                    // Находим номер строки более эффективно
                                    const matchIndex = match.index;
                                    const lineNumber = text.substring(0, matchIndex).split('\n').length - 1;
                                    const lineText = lines[lineNumber] || '';
                                    
                                    // Получаем превью строки (обрезаем если слишком длинная)
                                    let preview = lineText.trim();
                                    if (preview.length > 80) {
                                        preview = preview.substring(0, 77) + '...';
                                    }
                                    
                                    // Получаем относительный путь
                                    const filePath = workspaceFolder 
                                        ? vscode.workspace.asRelativePath(fileUri)
                                        : fileUri.fsPath;
                                    
                                    fileResults.push({
                                        filePath,
                                        line: lineNumber,
                                        key,
                                        translation,
                                        preview
                                    });
                                }
                            }
                            
                            // Сбрасываем lastIndex для следующего файла
                            i18nPattern.lastIndex = 0;
                            
                            return fileResults;
                        } catch (error) {
                            // Пропускаем файлы, которые не удалось прочитать
                            console.error(`Error reading file ${fileUri.fsPath}:`, error);
                            return [];
                        }
                    })
                );
                
                // Добавляем результаты из батча
                for (const fileResults of batchResults) {
                    results.push(...fileResults);
                }
            }

            // Сортируем результаты по файлу и строке
            results.sort((a, b) => {
                if (a.filePath !== b.filePath) {
                    return a.filePath.localeCompare(b.filePath);
                }
                return a.line - b.line;
            });

            this.sendMessage({
                command: 'translatedSearchResults',
                results
            });
        } catch (error) {
            console.error('Search error:', error);
            this.sendMessage({
                command: 'translatedSearchResults',
                results: []
            });
        }
    }

    private async handleOpenFileAtLine(filePath: string, line: number): Promise<void> {
        try {
            // Находим файл по относительному пути
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('Не найден workspace');
                return;
            }

            const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
            const document = await vscode.workspace.openTextDocument(fileUri);
            const editor = await vscode.window.showTextDocument(document);
            
            // Переходим на нужную строку
            const position = new vscode.Position(line, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Ошибка при открытии файла: ${error.message}`);
        }
    }

    private sendMessage(message: any): void {
        this.view?.webview.postMessage(message);
    }
}

