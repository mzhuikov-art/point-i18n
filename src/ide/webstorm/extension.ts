import { ApiService, CacheService } from '../../shared/services';
import { WebStormStorageService, WebStormConfigService, WebStormEditorService, WebStormWindowService } from './services';
import { WebStormHoverProvider, WebStormLineMarkerProvider } from './providers';
import { OpenLoginAction, FetchNowAction, ConfigApiBaseUrlAction, ConfigLocalizationApiBaseUrlAction, ToggleDecorationsAction } from './actions';
import { SidebarToolWindow } from './toolwindow/sidebar-tool-window';

// Глобальные экземпляры для доступа из Actions и Providers
let apiService: ApiService;
let cacheService: CacheService;
let storageService: WebStormStorageService;
let configService: WebStormConfigService;
let editorService: WebStormEditorService;
let windowService: WebStormWindowService;
let hoverProvider: WebStormHoverProvider;
let lineMarkerProvider: WebStormLineMarkerProvider;
let sidebarToolWindow: SidebarToolWindow;

export function activate(): void {
    configService = new WebStormConfigService();
    storageService = new WebStormStorageService();
    apiService = new ApiService(configService, storageService);
    cacheService = new CacheService();
    editorService = new WebStormEditorService();
    windowService = new WebStormWindowService();

    // Инициализируем провайдеры
    hoverProvider = new WebStormHoverProvider(
        apiService,
        cacheService,
        storageService,
        configService
    );

    lineMarkerProvider = new WebStormLineMarkerProvider(
        apiService,
        cacheService,
        storageService,
        configService
    );

    // Инициализируем ToolWindow
    sidebarToolWindow = new SidebarToolWindow(
        apiService,
        cacheService,
        storageService,
        configService,
        windowService
    );

    // Регистрируем Actions (они будут зарегистрированы через plugin.xml)
    // Actions создаются через фабрики в Java/Kotlin коде, но логика остается в TypeScript

    console.log('WebStorm extension activated');
}

export function deactivate(): void {
    console.log('WebStorm extension deactivated');
}

// Экспортируем функции для доступа из Java/Kotlin кода
export function getHoverProvider(): WebStormHoverProvider {
    return hoverProvider;
}

export function getLineMarkerProvider(): WebStormLineMarkerProvider {
    return lineMarkerProvider;
}

export function getSidebarToolWindow(): SidebarToolWindow {
    return sidebarToolWindow;
}

export function createOpenLoginAction(): OpenLoginAction {
    return new OpenLoginAction(apiService, storageService, configService, windowService);
}

export function createFetchNowAction(): FetchNowAction {
    return new FetchNowAction(apiService, cacheService, storageService, configService, windowService);
}

export function createConfigApiBaseUrlAction(): ConfigApiBaseUrlAction {
    return new ConfigApiBaseUrlAction(configService, windowService);
}

export function createConfigLocalizationApiBaseUrlAction(): ConfigLocalizationApiBaseUrlAction {
    return new ConfigLocalizationApiBaseUrlAction(configService, windowService);
}

export function createToggleDecorationsAction(): ToggleDecorationsAction {
    return new ToggleDecorationsAction(windowService);
}
