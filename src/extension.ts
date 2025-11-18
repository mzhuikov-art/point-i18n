import * as vscode from 'vscode';
import { supportedLanguages, SUPPORTED_LOCALES } from './constants';
import { ApiService } from './services/api.service';
import { CacheService } from './services/cache.service';
import { StorageService } from './services/storage.service';
import { HoverProvider } from './providers/hover.provider';
import { DecorationProvider } from './providers/decoration.provider';
import { TranslatedContentProvider } from './providers/translated-content.provider';
import { SidebarViewProvider } from './views/sidebar.view';
import { getLoginHtml } from './views/login.html';

export function activate(ctx: vscode.ExtensionContext): void {
    const storageService = new StorageService(ctx);
    const apiService = new ApiService(storageService);
    const cacheService = new CacheService();

    // Регистрируем провайдер для виртуальных документов с переводами
    const translatedContentProvider = new TranslatedContentProvider(
        apiService,
        cacheService,
        storageService
    );
    ctx.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider(
            'i18n-translated',
            translatedContentProvider
        )
    );

    // Регистрируем hover на все файлы как в i18n Ally
    const hoverProvider = vscode.languages.registerHoverProvider(
        '*',
        new HoverProvider(apiService, cacheService, storageService)
    );

    const decorationProvider = new DecorationProvider(
        apiService,
        cacheService,
        storageService
    );

    // Регистрируем sidebar
    const sidebarProvider = new SidebarViewProvider(
        ctx,
        apiService,
        cacheService,
        storageService,
        decorationProvider
    );
    
    ctx.subscriptions.push(
        vscode.window.registerWebviewViewProvider('i18nRemote.sidebar', sidebarProvider)
    );

    ctx.subscriptions.push(hoverProvider);

    // Обновляем decorations при изменении активного редактора
    ctx.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(async editor => {
            if (editor) {
                await decorationProvider.updateDecorations(editor);
            }
        })
    );

    // Обновляем decorations при изменении документа
    ctx.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(async event => {
            const editor = vscode.window.activeTextEditor;
            if (editor && event.document === editor.document) {
                await decorationProvider.updateDecorations(editor);
            }
        })
    );

    // Обновляем decorations при сохранении документа
    ctx.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(async document => {
            const editor = vscode.window.activeTextEditor;
            if (editor && document === editor.document) {
                await decorationProvider.updateDecorations(editor);
            }
        })
    );

    // Проверяем токен при старте приложения
    checkTokenOnStartup(apiService, storageService);

    // Инициализируем decorations для текущего редактора
    if (vscode.window.activeTextEditor) {
        decorationProvider.updateDecorations(vscode.window.activeTextEditor);
    }

    ctx.subscriptions.push(
        vscode.commands.registerCommand('i18nRemote.openLogin', async () => {
            const panel = vscode.window.createWebviewPanel(
                'i18nLogin',
                'I18n Quick Login',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );

    panel.webview.html = getLoginHtml();

    panel.webview.onDidReceiveMessage(async msg => {
                await handleWebviewMessage(
                    msg,
                    panel,
                    apiService,
                    cacheService,
                    storageService,
                    decorationProvider,
                    translatedContentProvider
                );
            });
        })
    );

    ctx.subscriptions.push(
        vscode.commands.registerCommand('i18nRemote.fetchNow', async () => {
            const token = await storageService.getToken();
            if (!token) {
                vscode.window.showErrorMessage('No token. Run I18n: Quick Login');
                return;
            }

            await fetchLocalesAndCache(apiService, cacheService);
            vscode.window.showInformationMessage('I18n: locales fetched to memory cache.');
            
            // Обновляем decorations после загрузки локалей
            if (vscode.window.activeTextEditor) {
                await decorationProvider.updateDecorations(vscode.window.activeTextEditor);
            }
            
            // Обновляем все открытые виртуальные документы
            updateAllOpenTranslatedDocuments(translatedContentProvider);
        })
    );

    ctx.subscriptions.push(
        vscode.commands.registerCommand('i18nRemote.toggleDecorations', () => {
            decorationProvider.toggle();
            // Обновляем текущий редактор
            if (vscode.window.activeTextEditor) {
                decorationProvider.updateDecorations(vscode.window.activeTextEditor);
            }
        })
    );

    // Обработка кликов по задекорированному тексту
    ctx.subscriptions.push(
        vscode.commands.registerCommand('i18nRemote.toggleSingleDecoration', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const position = editor.selection.active;
                decorationProvider.handleClick(position, editor);
            }
        })
    );

    // Регистрируем обработчик кликов через selection change
    ctx.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(event => {
            // Если это был клик (selection пустой и изменился)
            if (event.selections.length === 1 && event.selections[0].isEmpty) {
                const editor = event.textEditor;
                const position = event.selections[0].active;
                
                // Небольшая задержка чтобы не срабатывало при обычной навигации
                setTimeout(() => {
                    if (editor === vscode.window.activeTextEditor) {
                        decorationProvider.handleClick(position, editor);
                    }
                }, 100);
            }
        })
    );

    // Команда для открытия виртуального документа с переводами для поиска
    ctx.subscriptions.push(
        vscode.commands.registerCommand('i18nRemote.openTranslatedForSearch', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('Откройте файл для поиска переводов');
                return;
            }

            const originalUri = editor.document.uri;
            // Создаем виртуальный URI с переведенным содержимым
            const translatedUri = vscode.Uri.parse(
                `i18n-translated://translated/${originalUri.path}?${originalUri.toString()}`
            );

            try {
                const doc = await vscode.workspace.openTextDocument(translatedUri);
                await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
                vscode.window.showInformationMessage('Открыт файл с переводами для поиска. Используйте Ctrl+F / Cmd+F для поиска.');
            } catch (error) {
                vscode.window.showErrorMessage(`Ошибка при открытии переведенного файла: ${error}`);
            }
        })
    );

    // Команда для настройки базового URL API
    ctx.subscriptions.push(
        vscode.commands.registerCommand('i18nRemote.configApiBaseUrl', async () => {
            const config = vscode.workspace.getConfiguration('i18nRemote');
            const currentUrl = config.get<string>('apiBaseUrl') || '';
            
            const url = await vscode.window.showInputBox({
                prompt: 'Введите базовый URL для API (auth, projects, create, update, search)',
                value: currentUrl,
                placeHolder: 'https://example.com',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'URL не может быть пустым';
                    }
                    try {
                        new URL(value);
                        return null;
                    } catch {
                        return 'Введите корректный URL';
                    }
                }
            });

            if (url !== undefined) {
                const normalizedUrl = url.trim().replace(/\/+$/, '');
                await config.update('apiBaseUrl', normalizedUrl, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`API Base URL установлен: ${normalizedUrl}`);
            }
        })
    );

    // Команда для настройки базового URL API локализации
    ctx.subscriptions.push(
        vscode.commands.registerCommand('i18nRemote.configLocalizationApiBaseUrl', async () => {
            const config = vscode.workspace.getConfiguration('i18nRemote');
            const currentUrl = config.get<string>('localizationApiBaseUrl') || '';
            
            const url = await vscode.window.showInputBox({
                prompt: 'Введите базовый URL для API локализации (fetch locales)',
                value: currentUrl,
                placeHolder: 'https://example.com',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'URL не может быть пустым';
                    }
                    try {
                        new URL(value);
                        return null;
                    } catch {
                        return 'Введите корректный URL';
                    }
                }
            });

            if (url !== undefined) {
                const normalizedUrl = url.trim().replace(/\/+$/, '');
                await config.update('localizationApiBaseUrl', normalizedUrl, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`Localization API Base URL установлен: ${normalizedUrl}`);
            }
        })
    );

    // Обновляем виртуальные документы при изменении файлов
    ctx.subscriptions.push(
        vscode.commands.registerCommand('i18nRemote.configApiBaseUrl', async () => {
            const config = vscode.workspace.getConfiguration('i18nRemote');
            const currentUrl = config.get<string>('apiBaseUrl') || '';
            
            const url = await vscode.window.showInputBox({
                prompt: 'Введите базовый URL для API (auth, projects, create, update, search)',
                value: currentUrl,
                placeHolder: 'https://example.com',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'URL не может быть пустым';
                    }
                    try {
                        new URL(value);
                        return null;
                    } catch {
                        return 'Введите корректный URL';
                    }
                }
            });

            if (url !== undefined) {
                const normalizedUrl = url.trim().replace(/\/+$/, '');
                await config.update('apiBaseUrl', normalizedUrl, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`API Base URL установлен: ${normalizedUrl}`);
            }
        })
    );

    // Команда для настройки базового URL API локализации
    ctx.subscriptions.push(
        vscode.commands.registerCommand('i18nRemote.configLocalizationApiBaseUrl', async () => {
            const config = vscode.workspace.getConfiguration('i18nRemote');
            const currentUrl = config.get<string>('localizationApiBaseUrl') || '';
            
            const url = await vscode.window.showInputBox({
                prompt: 'Введите базовый URL для API локализации (fetch locales)',
                value: currentUrl,
                placeHolder: 'https://example.com',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'URL не может быть пустым';
                    }
                    try {
                        new URL(value);
                        return null;
                    } catch {
                        return 'Введите корректный URL';
                    }
                }
            });

            if (url !== undefined) {
                const normalizedUrl = url.trim().replace(/\/+$/, '');
                await config.update('localizationApiBaseUrl', normalizedUrl, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`Localization API Base URL установлен: ${normalizedUrl}`);
            }
        })
    );


    // Команда для открытия виртуального документа с переводами для поиска
    ctx.subscriptions.push(
        vscode.commands.registerCommand('i18nRemote.openTranslatedForSearch', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('Откройте файл для поиска переводов');
                return;
            }

            const originalUri = editor.document.uri;
            // Создаем виртуальный URI с переведенным содержимым
            const translatedUri = vscode.Uri.parse(
                `i18n-translated://translated/${originalUri.path}?${originalUri.toString()}`
            );

            try {
                const doc = await vscode.workspace.openTextDocument(translatedUri);
                await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
                vscode.window.showInformationMessage('Открыт файл с переводами для поиска. Используйте Ctrl+F / Cmd+F для поиска.');
            } catch (error) {
                vscode.window.showErrorMessage(`Ошибка при открытии переведенного файла: ${error}`);
            }
        })
    );

    // Обновляем виртуальные документы при изменении файлов
    ctx.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(async event => {
            if (event.document.uri.scheme === 'file') {
                updateTranslatedDocument(event.document.uri, translatedContentProvider);
            }
        })
    );

    // Обновляем виртуальные документы при открытии файлов
    ctx.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(async document => {
            if (document.uri.scheme === 'file') {
                updateTranslatedDocument(document.uri, translatedContentProvider);
            }
        })
    );
}

function updateTranslatedDocument(originalUri: vscode.Uri, provider: TranslatedContentProvider): void {
    const translatedUri = vscode.Uri.parse(
        `i18n-translated://translated/${originalUri.path}?${originalUri.toString()}`
    );
    provider.update(translatedUri);
}

function updateAllOpenTranslatedDocuments(provider: TranslatedContentProvider): void {
    vscode.workspace.textDocuments.forEach(doc => {
        if (doc.uri.scheme === 'i18n-translated') {
            provider.update(doc.uri);
        }
    });
}

async function handleWebviewMessage(
    msg: any,
    panel: vscode.WebviewPanel,
    apiService: ApiService,
    cacheService: CacheService,
    storageService: StorageService,
    decorationProvider: DecorationProvider,
    translatedContentProvider: TranslatedContentProvider
): Promise<void> {
    switch (msg.command) {
        case 'login':
            await handleLogin(msg, panel, apiService, cacheService, storageService, decorationProvider, translatedContentProvider);
            break;
        case 'logout':
            await handleLogout(cacheService, storageService);
            break;
        case 'fetchNow':
            await handleFetchNow(apiService, cacheService, storageService, decorationProvider, translatedContentProvider);
            break;
    }
}

async function handleLogin(
    msg: any,
    panel: vscode.WebviewPanel,
    apiService: ApiService,
    cacheService: CacheService,
    storageService: StorageService,
    decorationProvider: DecorationProvider,
    translatedContentProvider: TranslatedContentProvider
): Promise<void> {
    try {
        const authResponse = await apiService.authenticate(msg.login, msg.password);
        
        if (!authResponse.access_token) {
            panel.webview.postMessage({ status: 'error', message: 'Auth failed' });
            return;
        }

        await storageService.saveTokens(authResponse);
        panel.webview.postMessage({ status: 'ok' });
        vscode.window.showInformationMessage('I18n token saved.');
        
        await fetchLocalesAndCache(apiService, cacheService);
        
        // Обновляем decorations после логина
        if (vscode.window.activeTextEditor) {
            await decorationProvider.updateDecorations(vscode.window.activeTextEditor);
        }
        
        // Обновляем все открытые виртуальные документы
        updateAllOpenTranslatedDocuments(translatedContentProvider);
    } catch (err: any) {
        const errorMessage = err.message || String(err);
        panel.webview.postMessage({ status: 'error', message: errorMessage });
        vscode.window.showErrorMessage(`Ошибка авторизации: ${errorMessage}`);
    }
}

async function handleLogout(
    cacheService: CacheService,
    storageService: StorageService
): Promise<void> {
    await storageService.deleteToken();
    cacheService.clear();
    vscode.window.showInformationMessage('I18n token removed.');
}

async function handleFetchNow(
    apiService: ApiService,
    cacheService: CacheService,
    storageService: StorageService,
    decorationProvider: DecorationProvider,
    translatedContentProvider: TranslatedContentProvider
): Promise<void> {
    const token = await storageService.getToken();
    
    if (!token) {
        vscode.window.showErrorMessage('Нет токена. Выполните I18n: Quick Login.');
        return;
    }

    await fetchLocalesAndCache(apiService, cacheService);
    vscode.window.showInformationMessage('Locales fetched into memory.');
    
    // Обновляем decorations после загрузки
    if (vscode.window.activeTextEditor) {
        await decorationProvider.updateDecorations(vscode.window.activeTextEditor);
    }
    
    // Обновляем все открытые виртуальные документы
    updateAllOpenTranslatedDocuments(translatedContentProvider);
}

async function fetchLocalesAndCache(
    apiService: ApiService,
    cacheService: CacheService
): Promise<void> {
    const projectKey = vscode.workspace.getConfiguration('i18nRemote').get<string>('projectKey') || 'point-frontend';
    // Загружаем все локали параллельно
    const promises = SUPPORTED_LOCALES.map(async (locale) => {
        try {
            const locales = await apiService.fetchLocales(undefined, locale, projectKey);
            cacheService.set(locale, locales);
        } catch (error) {
            console.error(`Failed to fetch ${locale}:`, error);
        }
    });
    
    await Promise.all(promises);
}

async function checkTokenOnStartup(apiService: ApiService, storageService: StorageService): Promise<void> {
    const refreshToken = await storageService.getRefreshToken();
    if (!refreshToken) {
        return;
    }

    try {
        const accessToken = await storageService.getAccessToken();
        if (!accessToken) {
            await storageService.deleteTokens();
            return;
        }

        await apiService.getUserInfo(accessToken);
    } catch (error: any) {
        if (error.message && error.message.includes('401')) {
            try {
                const authResponse = await apiService.refreshToken(refreshToken);
                await storageService.saveTokens(authResponse);
            } catch (refreshError) {
                await storageService.deleteTokens();
            }
        } else {
            await storageService.deleteTokens();
        }
    }
}

export function deactivate(): void {}
