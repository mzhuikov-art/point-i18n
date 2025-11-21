package com.point.i18n.webstorm.services;

import com.intellij.ide.util.PropertiesComponent;

/**
 * Service for configuration.
 * Java implementation using PropertiesComponent.
 */
public class ConfigService {
    private static final String CONFIG_NAMESPACE = "point.i18n";
    private static final String API_BASE_URL_KEY = CONFIG_NAMESPACE + ".apiBaseUrl";
    private static final String LOCALIZATION_API_BASE_URL_KEY = CONFIG_NAMESPACE + ".localizationApiBaseUrl";
    private static final String DEEPL_API_KEY = CONFIG_NAMESPACE + ".deepLApiKey";
    
    private final PropertiesComponent propertiesComponent;
    
    public ConfigService() {
        this.propertiesComponent = PropertiesComponent.getInstance();
    }
    
    public String getApiBaseUrl() {
        String url = propertiesComponent.getValue(API_BASE_URL_KEY);
        if (url == null || url.trim().isEmpty()) {
            throw new IllegalStateException("API Base URL is not configured. Please configure it first.");
        }
        return normalizeUrl(url);
    }
    
    public String getLocalizationApiBaseUrl() {
        String url = propertiesComponent.getValue(LOCALIZATION_API_BASE_URL_KEY);
        if (url == null || url.trim().isEmpty()) {
            throw new IllegalStateException("Localization API Base URL is not configured. Please configure it first.");
        }
        return normalizeUrl(url);
    }
    
    public String getProjectKey() {
        return propertiesComponent.getValue(CONFIG_NAMESPACE + ".projectKey", "point-frontend");
    }
    
    public String getLocale() {
        return propertiesComponent.getValue(CONFIG_NAMESPACE + ".locale", "ru");
    }
    
    public String getSearchPath() {
        return propertiesComponent.getValue(CONFIG_NAMESPACE + ".searchPath", "src");
    }
    
    public void setProjectKey(String projectKey) {
        propertiesComponent.setValue(CONFIG_NAMESPACE + ".projectKey", projectKey);
    }
    
    public void setLocale(String locale) {
        propertiesComponent.setValue(CONFIG_NAMESPACE + ".locale", locale);
    }
    
    public void setSearchPath(String searchPath) {
        propertiesComponent.setValue(CONFIG_NAMESPACE + ".searchPath", searchPath);
    }
    
    public String getDeepLApiKey() {
        return propertiesComponent.getValue(DEEPL_API_KEY);
    }
    
    public void setDeepLApiKey(String apiKey) {
        propertiesComponent.setValue(DEEPL_API_KEY, apiKey);
    }
    
    private String normalizeUrl(String url) {
        return url.trim().replaceAll("/+$", "");
    }
}

