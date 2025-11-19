package com.point.i18n.webstorm.actions;

import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.ui.Messages;
import com.point.i18n.webstorm.services.ApiService;
import com.point.i18n.webstorm.services.CacheService;
import com.point.i18n.webstorm.services.ConfigService;
import com.point.i18n.webstorm.services.StorageService;
import org.jetbrains.annotations.NotNull;

import java.util.Arrays;
import java.util.List;

/**
 * Action for fetching locales from API and caching them.
 */
public class FetchNowAction extends AnAction {
    private static final List<String> SUPPORTED_LOCALES = Arrays.asList("ru", "en", "uz");
    
    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        // Используем глобальный экземпляр сервисов
        com.point.i18n.webstorm.PointI18nApplicationService appService = 
            com.point.i18n.webstorm.PointI18nApplicationService.getInstance();
        
        StorageService storageService = appService.getStorageService();
        String token = storageService.getAccessToken();
        
        if (token == null || token.isEmpty()) {
            Messages.showErrorDialog("No token. Please login first.", "Point I18n");
            return;
        }
        
        try {
            ApiService apiService = appService.getApiService();
            CacheService cacheService = appService.getCacheService();
            ConfigService configService = appService.getConfigService();
            
            String projectKey = configService.getProjectKey();
            
            Messages.showInfoMessage("Fetching locales...", "Point I18n");
            
            for (String locale : SUPPORTED_LOCALES) {
                try {
                    java.util.Map<String, String> locales = apiService.fetchLocales(locale, projectKey);
                    cacheService.set(locale, locales);
                } catch (Exception ex) {
                    System.err.println("Failed to fetch " + locale + ": " + ex.getMessage());
                }
            }
            
            Messages.showInfoMessage("Locales fetched successfully!", "Point I18n");
        } catch (Exception ex) {
            Messages.showErrorDialog("Failed to fetch locales: " + ex.getMessage(), "Point I18n");
        }
    }
}

