import * as vscode from 'vscode';
import { supportedLanguages, SUPPORTED_LOCALES } from './constants';
import { ApiService } from './services/api.service';
import { CacheService } from './services/cache.service';
import { StorageService } from './services/storage.service';
import { HoverProvider } from './providers/hover.provider';
import { DecorationProvider } from './providers/decoration.provider';
import { SidebarViewProvider } from './views/sidebar.view';
import { getLoginHtml } from './views/login.html';

export function activate(ctx: vscode.ExtensionContext): void {
    const apiService = new ApiService();
    const cacheService = new CacheService();
    const storageService = new StorageService(ctx);

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
                    decorationProvider
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

            await fetchLocalesAndCache(apiService, cacheService, token);
            vscode.window.showInformationMessage('I18n: locales fetched to memory cache.');
            
            // Обновляем decorations после загрузки локалей
            if (vscode.window.activeTextEditor) {
                await decorationProvider.updateDecorations(vscode.window.activeTextEditor);
            }
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
}

async function handleWebviewMessage(
    msg: any,
    panel: vscode.WebviewPanel,
    apiService: ApiService,
    cacheService: CacheService,
    storageService: StorageService,
    decorationProvider: DecorationProvider
): Promise<void> {
    switch (msg.command) {
        case 'login':
            await handleLogin(msg, panel, apiService, cacheService, storageService, decorationProvider);
            break;
        case 'logout':
            await handleLogout(cacheService, storageService);
            break;
        case 'fetchNow':
            await handleFetchNow(apiService, cacheService, storageService, decorationProvider);
            break;
    }
}

async function handleLogin(
    msg: any,
    panel: vscode.WebviewPanel,
    apiService: ApiService,
    cacheService: CacheService,
    storageService: StorageService,
    decorationProvider: DecorationProvider
): Promise<void> {
    try {
        const token = await apiService.authenticate(msg.login, msg.password);
        
        if (!token) {
            panel.webview.postMessage({ status: 'error', message: 'Auth failed' });
            return;
        }

        await storageService.saveToken(token);
          panel.webview.postMessage({ status: 'ok' });
          vscode.window.showInformationMessage('I18n token saved.');
        
        await fetchLocalesAndCache(apiService, cacheService, token);
        
        // Обновляем decorations после логина
        if (vscode.window.activeTextEditor) {
            await decorationProvider.updateDecorations(vscode.window.activeTextEditor);
        }
    } catch (err: any) {
        panel.webview.postMessage({ status: 'error', message: String(err) });
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
    decorationProvider: DecorationProvider
): Promise<void> {
    const token = await storageService.getToken();
    
    if (!token) {
        vscode.window.showErrorMessage('Нет токена. Выполните I18n: Quick Login.');
        return;
    }

    await fetchLocalesAndCache(apiService, cacheService, token);
    vscode.window.showInformationMessage('Locales fetched into memory.');
    
    // Обновляем decorations после загрузки
    if (vscode.window.activeTextEditor) {
        await decorationProvider.updateDecorations(vscode.window.activeTextEditor);
    }
}

async function fetchLocalesAndCache(
    apiService: ApiService,
    cacheService: CacheService,
    token: string
): Promise<void> {
    const projectKey = vscode.workspace.getConfiguration('i18nRemote').get<string>('projectKey') || 'point-frontend';
    // Загружаем все локали параллельно
    const promises = SUPPORTED_LOCALES.map(async (locale) => {
        try {
            const locales = await apiService.fetchLocales(token, locale, projectKey);
            cacheService.set(locale, locales);
        } catch (error) {
            console.error(`Failed to fetch ${locale}:`, error);
        }
    });
    
    await Promise.all(promises);
}

export function deactivate(): void {}
