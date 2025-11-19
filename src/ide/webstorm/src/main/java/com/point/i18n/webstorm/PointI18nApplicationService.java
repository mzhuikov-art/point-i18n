package com.point.i18n.webstorm;

import com.intellij.codeInsight.daemon.LineMarkerProvider;
import com.intellij.lang.documentation.DocumentationProvider;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.components.Service;
import com.intellij.openapi.editor.EditorFactory;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.project.ProjectManager;
import com.point.i18n.webstorm.listeners.EditorDocumentListener;
import com.point.i18n.webstorm.providers.PointI18nHoverProvider;
import com.point.i18n.webstorm.providers.PointI18nLineMarkerProvider;
import com.point.i18n.webstorm.services.ApiService;
import com.point.i18n.webstorm.services.CacheService;
import com.point.i18n.webstorm.services.ConfigService;
import com.point.i18n.webstorm.services.StorageService;

/**
 * Application-level service for Point I18n plugin.
 * This service is initialized when the IDE starts.
 */
@Service
public final class PointI18nApplicationService {
    private ApiService apiService;
    private CacheService cacheService;
    private StorageService storageService;
    private ConfigService configService;
    
    public static PointI18nApplicationService getInstance() {
        return ApplicationManager.getApplication().getService(PointI18nApplicationService.class);
    }

    public PointI18nApplicationService() {
        // Initialize services
        storageService = new StorageService();
        configService = new ConfigService();
        apiService = new ApiService(storageService);
        cacheService = new CacheService();
        
        // Providers are initialized through extension points in plugin.xml
        // They access services through getInstance()
        
        // Register document listener for decoration updates
        EditorFactory.getInstance().getEventMulticaster().addDocumentListener(
            new EditorDocumentListener(),
            ApplicationManager.getApplication()
        );
        
        // Check token on startup
        checkTokenOnStartup();
        
        System.out.println("Point I18n Application Service initialized");
    }
    
    private void checkTokenOnStartup() {
        String refreshToken = storageService.getRefreshToken();
        if (refreshToken == null || refreshToken.isEmpty()) {
            return;
        }
        
        String accessToken = storageService.getAccessToken();
        if (accessToken == null || accessToken.isEmpty()) {
            storageService.deleteTokens();
            return;
        }
        
        // Try to validate token by fetching user info or projects
        try {
            apiService.fetchProjects();
        } catch (Exception e) {
            // Token might be expired, try to refresh
            try {
                // Note: refreshToken method needs to be implemented in ApiService
                // For now, just delete tokens if validation fails
                storageService.deleteTokens();
            } catch (Exception refreshError) {
                storageService.deleteTokens();
            }
        }
    }
    
    public ApiService getApiService() {
        return apiService;
    }
    
    public CacheService getCacheService() {
        return cacheService;
    }
    
    public StorageService getStorageService() {
        return storageService;
    }
    
    public ConfigService getConfigService() {
        return configService;
    }
    
}

