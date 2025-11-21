import * as vscode from 'vscode';
import { ApiService, CacheService } from '../../shared/services';
import { SUPPORTED_LOCALES } from '../../shared/constants';
import { TranslateService } from '../../services/translate.service';
import { VSCodeStorageService, VSCodeConfigService, VSCodeEditorService, VSCodeWindowService } from './services';
import { VSCodeHoverProvider } from './providers/hover.provider';
import { VSCodeDecorationProvider } from './providers/decoration.provider';
import { VSCodeTranslatedContentProvider } from './providers/translated-content.provider';
import { SidebarViewProvider as VSCodeSidebarViewProvider } from './views/sidebar.view';
import { getVSCodeLoginHtml as getLoginHtml } from './views/login.html';

export function activate(ctx: vscode.ExtensionContext): void {
    const configService = new VSCodeConfigService();
    const storageService = new VSCodeStorageService(ctx);
    const apiService = new ApiService(configService, storageService);
    const cacheService = new CacheService();
    const editorService = new VSCodeEditorService();
    const windowService = new VSCodeWindowService();

    const translatedContentProvider = new VSCodeTranslatedContentProvider(
        apiService,
        cacheService,
        storageService,
        configService,
        editorService
    );
    ctx.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider(
            'i18n-translated',
            translatedContentProvider
        )
    );

    const hoverProvider = vscode.languages.registerHoverProvider(
        '*',
        new VSCodeHoverProvider(apiService, cacheService, storageService, configService)
    );

    const decorationProvider = new VSCodeDecorationProvider(
        apiService,
        cacheService,
        storageService,
        configService,
        windowService,
        editorService
    );

    const translateService = new TranslateService();

    const sidebarProvider = new VSCodeSidebarViewProvider(
        ctx,
        apiService,
        cacheService,
        storageService,
        decorationProvider as any,
        translateService
    );
    
    ctx.subscriptions.push(
        vscode.window.registerWebviewViewProvider('i18nRemote.sidebar', sidebarProvider)
    );

    ctx.subscriptions.push(hoverProvider);

    ctx.subscriptions.push(
        editorService.onDidChangeActiveTextEditor(async editor => {
            if (editor) {
                await decorationProvider.updateDecorations(editor);
            }
        })
    );

    ctx.subscriptions.push(
        editorService.onDidChangeTextDocument(async event => {
            const editor = editorService.getActiveTextEditor();
            if (editor && event.document.uri.toString() === editor.document.uri.toString()) {
                await decorationProvider.updateDecorations(editor);
            }
        })
    );

    ctx.subscriptions.push(
        editorService.onDidSaveTextDocument(async document => {
            const editor = editorService.getActiveTextEditor();
            if (editor && document.uri.toString() === editor.document.uri.toString()) {
                await decorationProvider.updateDecorations(editor);
            }
        })
    );

    checkTokenOnStartup(apiService, storageService);

    const activeEditor = editorService.getActiveTextEditor();
    if (activeEditor) {
        decorationProvider.updateDecorations(activeEditor);
    }

    ctx.subscriptions.push(
        vscode.commands.registerCommand('i18nRemote.openLogin', async () => {
            const panel = windowService.createWebviewPanel(
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
                    translatedContentProvider,
                    editorService,
                    windowService
                );
            });
        })
    );

    ctx.subscriptions.push(
        vscode.commands.registerCommand('i18nRemote.fetchNow', async () => {
            const token = await storageService.getToken();
            if (!token) {
                windowService.showErrorMessage('No token. Run I18n: Quick Login');
                return;
            }

            await fetchLocalesAndCache(apiService, cacheService, configService);
            windowService.showInformationMessage('I18n: locales fetched to memory cache.');
            
            const editor = editorService.getActiveTextEditor();
            if (editor) {
                await decorationProvider.updateDecorations(editor);
            }
            
            updateAllOpenTranslatedDocuments(translatedContentProvider, editorService);
        })
    );

    ctx.subscriptions.push(
        vscode.commands.registerCommand('i18nRemote.toggleDecorations', () => {
            decorationProvider.toggle();
            const editor = editorService.getActiveTextEditor();
            if (editor) {
                decorationProvider.updateDecorations(editor);
            }
        })
    );

    ctx.subscriptions.push(
        editorService.onDidChangeTextEditorSelection(event => {
            if (event.selections.length === 1 && event.selections[0].isEmpty) {
                const editor = event.textEditor;
                const position = event.selections[0].active;
                
                setTimeout(() => {
                    const activeEditor = editorService.getActiveTextEditor();
                    if (activeEditor && activeEditor.document.uri.toString() === editor.document.uri.toString()) {
                        decorationProvider.handleClick(position, editor);
                    }
                }, 100);
            }
        })
    );

    ctx.subscriptions.push(
        vscode.commands.registerCommand('i18nRemote.openTranslatedForSearch', async () => {
            const editor = editorService.getActiveTextEditor();
            if (!editor) {
                windowService.showWarningMessage('Откройте файл для поиска переводов');
                return;
            }

            const originalUri = editor.document.uri.toString();
            const translatedUri = vscode.Uri.parse(
                `i18n-translated://translated/${originalUri}?${originalUri}`
            );

            try {
                const doc = await editorService.openTextDocument(translatedUri.toString());
                await editorService.showTextDocument(doc, vscode.ViewColumn.Beside);
                windowService.showInformationMessage('Открыт файл с переводами для поиска. Используйте Ctrl+F / Cmd+F для поиска.');
            } catch (error) {
                windowService.showErrorMessage(`Ошибка при открытии переведенного файла: ${error}`);
            }
        })
    );

    ctx.subscriptions.push(
        vscode.commands.registerCommand('i18nRemote.configApiBaseUrl', async () => {
            const config = vscode.workspace.getConfiguration('i18nRemote');
            const currentUrl = config.get<string>('apiBaseUrl') || '';
            
            const url = await windowService.showInputBox({
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
                windowService.showInformationMessage(`API Base URL установлен: ${normalizedUrl}`);
            }
        })
    );

    ctx.subscriptions.push(
        vscode.commands.registerCommand('i18nRemote.configLocalizationApiBaseUrl', async () => {
            const config = vscode.workspace.getConfiguration('i18nRemote');
            const currentUrl = config.get<string>('localizationApiBaseUrl') || '';
            
            const url = await windowService.showInputBox({
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
                windowService.showInformationMessage(`Localization API Base URL установлен: ${normalizedUrl}`);
            }
        })
    );

    // Команда для настройки DeepL API ключа
    ctx.subscriptions.push(
        vscode.commands.registerCommand('i18nRemote.configDeepLApiKey', async () => {
            const config = vscode.workspace.getConfiguration('i18nRemote');
            const currentKey = config.get<string>('deepLApiKey') || '';
            
            const apiKey = await windowService.showInputBox({
                prompt: 'Введите API ключ DeepL',
                value: currentKey,
                placeHolder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx',
                password: true,
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'API ключ не может быть пустым';
                    }
                    return null;
                }
            });

            if (apiKey !== undefined) {
                await config.update('deepLApiKey', apiKey.trim(), vscode.ConfigurationTarget.Global);
                windowService.showInformationMessage('DeepL API ключ установлен');
            }
        })
    );

    ctx.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(async document => {
            if (document.uri.scheme === 'file') {
                updateTranslatedDocument(document.uri.toString(), translatedContentProvider);
            }
        })
    );
}

function updateTranslatedDocument(originalUri: string, provider: VSCodeTranslatedContentProvider): void {
    const translatedUri = `i18n-translated://translated/${originalUri}?${originalUri}`;
    provider.update(vscode.Uri.parse(translatedUri));
}

function updateAllOpenTranslatedDocuments(provider: VSCodeTranslatedContentProvider, editorService: VSCodeEditorService): void {
    vscode.workspace.textDocuments.forEach(doc => {
        if (doc.uri.scheme === 'i18n-translated') {
            provider.update(doc.uri);
        }
    });
}

async function handleWebviewMessage(
    msg: any,
    panel: any,
    apiService: ApiService,
    cacheService: CacheService,
    storageService: VSCodeStorageService,
    decorationProvider: VSCodeDecorationProvider,
    translatedContentProvider: VSCodeTranslatedContentProvider,
    editorService: VSCodeEditorService,
    windowService: VSCodeWindowService
): Promise<void> {
    switch (msg.command) {
        case 'login':
            await handleLogin(msg, panel, apiService, cacheService, storageService, decorationProvider, translatedContentProvider, editorService, windowService);
            break;
        case 'logout':
            await handleLogout(cacheService, storageService, windowService);
            break;
        case 'fetchNow':
            await handleFetchNow(apiService, cacheService, storageService, decorationProvider, translatedContentProvider, editorService, windowService);
            break;
    }
}

async function handleLogin(
    msg: any,
    panel: any,
    apiService: ApiService,
    cacheService: CacheService,
    storageService: VSCodeStorageService,
    decorationProvider: VSCodeDecorationProvider,
    translatedContentProvider: VSCodeTranslatedContentProvider,
    editorService: VSCodeEditorService,
    windowService: VSCodeWindowService
): Promise<void> {
    try {
        const authResponse = await apiService.authenticate(msg.login, msg.password);
        
        if (!authResponse.access_token) {
            panel.webview.postMessage({ status: 'error', message: 'Auth failed' });
            return;
        }

        await storageService.saveTokens(authResponse);
        panel.webview.postMessage({ status: 'ok' });
        windowService.showInformationMessage('I18n token saved.');
        
        const configService = new VSCodeConfigService();
        await fetchLocalesAndCache(apiService, cacheService, configService);
        
        const editor = editorService.getActiveTextEditor();
        if (editor) {
            await decorationProvider.updateDecorations(editor);
        }
        
        updateAllOpenTranslatedDocuments(translatedContentProvider, editorService);
    } catch (err: any) {
        const errorMessage = err.message || String(err);
        panel.webview.postMessage({ status: 'error', message: errorMessage });
        windowService.showErrorMessage(`Ошибка авторизации: ${errorMessage}`);
    }
}

async function handleLogout(
    cacheService: CacheService,
    storageService: VSCodeStorageService,
    windowService: VSCodeWindowService
): Promise<void> {
    await storageService.deleteToken();
    cacheService.clear();
    windowService.showInformationMessage('I18n token removed.');
}

async function handleFetchNow(
    apiService: ApiService,
    cacheService: CacheService,
    storageService: VSCodeStorageService,
    decorationProvider: VSCodeDecorationProvider,
    translatedContentProvider: VSCodeTranslatedContentProvider,
    editorService: VSCodeEditorService,
    windowService: VSCodeWindowService
): Promise<void> {
    const token = await storageService.getToken();
    
    if (!token) {
        windowService.showErrorMessage('Нет токена. Выполните I18n: Quick Login.');
        return;
    }

    const configService = new VSCodeConfigService();
    await fetchLocalesAndCache(apiService, cacheService, configService);
    windowService.showInformationMessage('Locales fetched into memory.');
    
    const editor = editorService.getActiveTextEditor();
    if (editor) {
        await decorationProvider.updateDecorations(editor);
    }
    
    updateAllOpenTranslatedDocuments(translatedContentProvider, editorService);
}

async function fetchLocalesAndCache(
    apiService: ApiService,
    cacheService: CacheService,
    configService: VSCodeConfigService
): Promise<void> {
    const projectKey = configService.getProjectKey();
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

async function checkTokenOnStartup(apiService: ApiService, storageService: VSCodeStorageService): Promise<void> {
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

