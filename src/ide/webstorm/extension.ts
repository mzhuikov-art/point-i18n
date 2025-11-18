// WebStorm extension entry point
// TODO: Implement WebStorm plugin activation

import { ApiService, CacheService } from '../shared/services';
import { WebStormStorageService, WebStormConfigService, WebStormEditorService, WebStormWindowService } from './services';

export function activate(): void {
    const configService = new WebStormConfigService();
    const storageService = new WebStormStorageService();
    const apiService = new ApiService(configService, storageService);
    const cacheService = new CacheService();
    const editorService = new WebStormEditorService();
    const windowService = new WebStormWindowService();

    // TODO: Register providers and commands for WebStorm
    console.log('WebStorm extension activated');
}

export function deactivate(): void {
    console.log('WebStorm extension deactivated');
}

