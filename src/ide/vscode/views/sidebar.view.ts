import * as vscode from 'vscode';
import { ApiService, CacheService } from '../../../shared/services';
import { SUPPORTED_LOCALES } from '../../../shared/constants';
import { CreateKeyRequest } from '../../../shared/types';
import { TranslateService } from '../../../services/translate.service';
import { VSCodeStorageService } from '../services/storage.service';
import { VSCodeDecorationProvider } from '../providers/decoration.provider';
import { getVSCodeSidebarHtml as getSidebarHtml } from './sidebar.html';

export class SidebarViewProvider implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private apiService: ApiService,
        private cacheService: CacheService,
        private storageService: VSCodeStorageService,
        private decorationProvider: VSCodeDecorationProvider,
        private translateService: TranslateService
    ) {}

    private showInfoMessage(message: string): void {
        vscode.window.showInformationMessage(message);
    }

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
            case 'translate':
                await this.handleTranslate(message.text);
                break;
        }
    }

    private async handleLogin(username: string, password: string): Promise<void> {
        try {
            this.showInfoMessage('⏳ Авторизация...');

            const authResponse = await this.apiService.authenticate(username, password);
            
            if (!authResponse.access_token) {
                vscode.window.showErrorMessage('❌ Ошибка авторизации');
                return;
            }

            await this.storageService.saveTokens(authResponse);
            await this.loadAllLocales();
            
            this.showInfoMessage('✅ Успешная авторизация');
            await this.updateView();
            
            // Обновляем decorations в активном редакторе
            if (vscode.window.activeTextEditor) {
                await this.decorationProvider.updateDecorations(vscode.window.activeTextEditor);
            }
        } catch (error: any) {
            const errorMessage = error.message || 'Ошибка авторизации';
            vscode.window.showErrorMessage(`Ошибка авторизации: ${errorMessage}`);
        }
    }

    private async handleLogout(): Promise<void> {
        await this.storageService.deleteToken();
        this.cacheService.clear();
        this.showInfoMessage('Выход выполнен');
        await this.updateView();
    }

    private async handleRefresh(): Promise<void> {
        const token = await this.storageService.getToken();
        
        if (!token) {
            vscode.window.showErrorMessage('❌ Нет токена');
            return;
        }

        this.showInfoMessage('⏳ Обновление...');
        
        await this.loadAllLocales();
        
        this.showInfoMessage('✅ Переводы обновлены');
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
        
        this.showInfoMessage(`Язык изменен: ${locale}`);
        
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
            this.showInfoMessage('⏳ Загрузка переводов...');
            await this.loadAllLocales();
            this.showInfoMessage('✅ Переводы обновлены');
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
            const response = await this.apiService.fetchProjects();
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
            vscode.window.showErrorMessage('❌ Введите ключ');
            return;
        }

        const token = await this.storageService.getToken();
        if (!token) {
            vscode.window.showErrorMessage('❌ Нет токена. Выполняется выход...');
            await this.handleLogout();
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

            const response = await this.apiService.createKey(undefined, request, projectKey);
            
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
            
            this.showInfoMessage(`✅ Ключ "${response.data.key}" создан`);
            
            // Обновляем статистику
            await this.updateView();
            
            // Обновляем decorations в активном редакторе
            if (vscode.window.activeTextEditor) {
                await this.decorationProvider.updateDecorations(vscode.window.activeTextEditor);
            }
        } catch (error: any) {
            const errorMessage = error.message || 'Ошибка создания ключа';
            vscode.window.showErrorMessage(`❌ ${errorMessage}`);
            
            // Если ошибка связана с авторизацией (401 или токен невалиден), выполняем logout
            if (errorMessage.includes('401') || errorMessage.includes('токен') || errorMessage.includes('авторизац')) {
                await this.handleLogout();
            }
        }
    }

    private async loadAllLocales(): Promise<void> {
        const projectKey = this.getProjectKey();
        const promises = SUPPORTED_LOCALES.map(async (locale) => {
            try {
                const locales = await this.apiService.fetchLocales(undefined, locale, projectKey);
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
                await this.loadAllLocales();
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
                const projectsResponse = await this.apiService.fetchProjects();
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
        const pageSize = 10;

        // Если нет токена, ищем в локальном кеше
        if (!token) {
            const cacheResults = this.cacheService.searchKeys(query);
            const totalCount = cacheResults.length;
            const totalPages = Math.ceil(totalCount / pageSize);
            const startIndex = (pageNumber - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const paginatedResults = cacheResults.slice(startIndex, endIndex);

            this.sendMessage({
                command: 'searchResults',
                results: paginatedResults.map(item => ({
                    key: item.key,
                    translations: {
                        ru: item.translations.ru || '',
                        en: item.translations.en || '',
                        uz: item.translations.uz || ''
                    }
                })),
                totalCount: totalCount,
                totalPages: totalPages,
                currentPage: pageNumber,
                query: query
            });
            return;
        }

        // Если есть токен, используем API
        try {
            const projectKey = this.getProjectKey();
            const response = await this.apiService.searchKeys(undefined, query, projectKey, pageNumber, pageSize);
            
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
            // При ошибке API пробуем поискать в кеше
            const cacheResults = this.cacheService.searchKeys(query);
            const totalCount = cacheResults.length;
            const totalPages = Math.ceil(totalCount / pageSize);
            const startIndex = (pageNumber - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const paginatedResults = cacheResults.slice(startIndex, endIndex);

            this.sendMessage({
                command: 'searchResults',
                results: paginatedResults.map(item => ({
                    key: item.key,
                    translations: {
                        ru: item.translations.ru || '',
                        en: item.translations.en || '',
                        uz: item.translations.uz || ''
                    }
                })),
                totalCount: totalCount,
                totalPages: totalPages,
                currentPage: pageNumber,
                query: query
            });
        }
    }

    private async handleUpdateKey(key: string, translations: { ru: string; en: string; uz: string }): Promise<void> {
        const token = await this.storageService.getToken();
        if (!token) {
            vscode.window.showErrorMessage('❌ Нет токена. Выполняется выход...');
            await this.handleLogout();
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

            const response = await this.apiService.updateKey(undefined, request, projectKey);
            
            // Обновляем ключ в кеше
            this.cacheService.updateKey(response.data.key, response.data.translations);
            
            this.showInfoMessage(`✅ Ключ "${response.data.key}" обновлен`);
            
            // Закрываем модалку редактирования
            this.sendMessage({ command: 'closeEditModal' });
            
            // Обновляем статистику
            await this.updateView();
            
            // Обновляем decorations в активном редакторе
            if (vscode.window.activeTextEditor) {
                await this.decorationProvider.updateDecorations(vscode.window.activeTextEditor);
            }
            
            // Перезапускаем поиск
            this.sendMessage({ command: 'refreshSearch' });
        } catch (error: any) {
            const errorMessage = error.message || 'Ошибка обновления ключа';
            vscode.window.showErrorMessage(`❌ ${errorMessage}`);
            
            // Если ошибка связана с авторизацией (401 или токен невалиден), выполняем logout
            if (errorMessage.includes('401') || errorMessage.includes('токен') || errorMessage.includes('авторизац')) {
                await this.handleLogout();
            }
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
        const locale = this.getLocaleFromConfig();
        
        // Загружаем локали если их еще нет (только если есть токен)
        if (!this.cacheService.has(locale)) {
            if (token) {
                try {
                    const projectKey = this.getProjectKey();
                    const locales = await this.apiService.fetchLocales(undefined, locale, projectKey);
                    this.cacheService.set(locale, locales);
                } catch (err) {
                    console.error('Failed to fetch locales:', err);
                    // Продолжаем поиск в кеше, если он есть для других локалей
                }
            } else {
                // Если нет токена и нет локалей в кеше, возвращаем пустой результат
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
            const workspaceFolders = vscode.workspace.workspaceFolders || [];
            
            // Собираем файлы из всех подходящих workspace folders
            const allFiles: vscode.Uri[] = [];
            const excludePattern = '**/{node_modules,dist,build,.git,.next,.nuxt,.output}/**';
            
            if (workspaceFolders.length === 0) {
                // Если нет workspace folders, используем стандартный поиск
                const searchPattern = searchPathNormalized 
                    ? `${searchPathNormalized}/**/*.{js,ts,jsx,tsx,vue,html}`
                    : '**/*.{js,ts,jsx,tsx,vue,html}';
                const files = await vscode.workspace.findFiles(searchPattern, excludePattern, 5000);
                allFiles.push(...files);
            } else {
                // Для каждого workspace folder определяем правильный паттерн поиска
                for (const folder of workspaceFolders) {
                    const folderPath = folder.uri.fsPath.replace(/\\/g, '/').replace(/\/$/, '');
                    const searchPathNormalizedSlash = searchPathNormalized.replace(/\\/g, '/');
                    
                    // Проверяем, является ли указанный путь частью пути workspace folder
                    // Например, если workspace folder = /path/to/swift, а searchPath = src/projects/swift
                    // то нужно искать в родительском workspace folder
                    
                    // Также проверяем, не является ли сам workspace folder уже нужным путем
                    const folderName = folder.name;
                    const folderPathParts = folderPath.split('/');
                    const searchPathParts = searchPathNormalizedSlash.split('/');
                    
                    let searchPattern: string;
                    
                    // Если имя workspace folder совпадает с последней частью пути поиска
                    // и путь поиска содержит это имя, то ищем в корне этого workspace folder
                    if (searchPathParts.length > 0 && searchPathParts[searchPathParts.length - 1] === folderName) {
                        // Ищем в корне этого workspace folder
                        searchPattern = '**/*.{js,ts,jsx,tsx,vue,html}';
                    } else {
                        // Ищем относительно workspace folder
                        searchPattern = searchPathNormalized 
                            ? `${searchPathNormalized}/**/*.{js,ts,jsx,tsx,vue,html}`
                            : '**/*.{js,ts,jsx,tsx,vue,html}';
                    }
                    
                    // Ищем файлы в этом workspace folder
                    const files = await vscode.workspace.findFiles(
                        new vscode.RelativePattern(folder, searchPattern),
                        new vscode.RelativePattern(folder, excludePattern),
                        5000
                    );
                    
                    allFiles.push(...files);
                }
            }
            
            const files = allFiles;

            // Шаг 3: Ищем все ключи i18n в файлах и проверяем, есть ли они в списке подходящих
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
                                    
                                    // Получаем относительный путь относительно правильного workspace folder
                                    const filePath = this.getRelativePath(fileUri);
                                    
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
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage('Не найден workspace');
                return;
            }

            // Ищем файл во всех workspace folders
            let fileUri: vscode.Uri | null = null;
            
            // Сначала пробуем найти файл по относительному пути в каждом workspace folder
            for (const folder of workspaceFolders) {
                const candidateUri = vscode.Uri.joinPath(folder.uri, filePath);
                try {
                    await vscode.workspace.fs.stat(candidateUri);
                    fileUri = candidateUri;
                    break;
                } catch {
                    // Файл не найден в этом workspace folder, пробуем следующий
                }
            }

            // Если не нашли и путь начинается с имени workspace folder, пробуем удалить префикс
            if (!fileUri && workspaceFolders.length > 1) {
                for (const folder of workspaceFolders) {
                    const folderName = folder.name;
                    if (filePath.startsWith(folderName + '/')) {
                        const pathWithoutPrefix = filePath.substring(folderName.length + 1);
                        const candidateUri = vscode.Uri.joinPath(folder.uri, pathWithoutPrefix);
                        try {
                            await vscode.workspace.fs.stat(candidateUri);
                            fileUri = candidateUri;
                            break;
                        } catch {
                            // Продолжаем поиск
                        }
                    }
                }
            }

            if (!fileUri) {
                // Если не нашли по относительному пути, пробуем найти по абсолютному пути
                // (на случай если путь был сохранен как абсолютный)
                try {
                    fileUri = vscode.Uri.file(filePath);
                    await vscode.workspace.fs.stat(fileUri);
                } catch {
                    vscode.window.showErrorMessage(`Файл не найден: ${filePath}`);
                    return;
                }
            }

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

    private getRelativePath(fileUri: vscode.Uri): string {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return fileUri.fsPath;
        }

        // Находим workspace folder, которому принадлежит файл
        for (const folder of workspaceFolders) {
            const folderPath = folder.uri.fsPath;
            const filePath = fileUri.fsPath;
            
            // Нормализуем пути для корректного сравнения
            const normalizedFolderPath = folderPath.replace(/\\/g, '/').replace(/\/$/, '');
            const normalizedFilePath = filePath.replace(/\\/g, '/');
            
            if (normalizedFilePath.startsWith(normalizedFolderPath + '/') || normalizedFilePath === normalizedFolderPath) {
                // Вычисляем относительный путь вручную для корректной работы с workspace
                const relativePath = normalizedFilePath.substring(normalizedFolderPath.length + 1);
                return relativePath;
            }
        }

        // Если не нашли подходящий workspace folder, используем asRelativePath как fallback
        return vscode.workspace.asRelativePath(fileUri, false);
    }

    private async handleTranslate(text: string): Promise<void> {
        if (!text || !text.trim()) {
            this.sendMessage({
                command: 'translateResult',
                error: 'Текст для перевода не может быть пустым'
            });
            return;
        }

        try {
            const translations = await this.translateService.translateToEnAndUz(text.trim());
            
            this.sendMessage({
                command: 'translateResult',
                translations: {
                    en: translations.en,
                    uz: translations.uz
                }
            });
        } catch (error: any) {
            const errorMessage = error.message || 'Ошибка перевода';
            this.sendMessage({
                command: 'translateResult',
                error: errorMessage
            });
        }
    }

    private sendMessage(message: any): void {
        this.view?.webview.postMessage(message);
    }
}

