package com.point.i18n.webstorm.services;

import com.intellij.ide.util.PropertiesComponent;

/**
 * Service for storing tokens and settings.
 * Java implementation using PropertiesComponent.
 */
public class StorageService {
    private static final String ACCESS_TOKEN_KEY = "point.i18n.accessToken";
    private static final String REFRESH_TOKEN_KEY = "point.i18n.refreshToken";
    private static final String REFRESH_EXPIRES_IN_KEY = "point.i18n.refreshExpiresIn";
    
    private final PropertiesComponent propertiesComponent;
    
    public StorageService() {
        this.propertiesComponent = PropertiesComponent.getInstance();
    }
    
    public String getAccessToken() {
        return propertiesComponent.getValue(ACCESS_TOKEN_KEY);
    }
    
    public String getRefreshToken() {
        return propertiesComponent.getValue(REFRESH_TOKEN_KEY);
    }
    
    public Integer getRefreshExpiresIn() {
        String value = propertiesComponent.getValue(REFRESH_EXPIRES_IN_KEY);
        return value != null ? Integer.parseInt(value) : null;
    }
    
    public void saveTokens(ApiService.AuthResponse authResponse) {
        propertiesComponent.setValue(ACCESS_TOKEN_KEY, authResponse.access_token);
        propertiesComponent.setValue(REFRESH_TOKEN_KEY, authResponse.refresh_token);
        propertiesComponent.setValue(REFRESH_EXPIRES_IN_KEY, String.valueOf(authResponse.refresh_expires_in));
    }
    
    public void deleteTokens() {
        propertiesComponent.unsetValue(ACCESS_TOKEN_KEY);
        propertiesComponent.unsetValue(REFRESH_TOKEN_KEY);
        propertiesComponent.unsetValue(REFRESH_EXPIRES_IN_KEY);
    }
}

