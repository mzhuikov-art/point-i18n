package com.point.i18n.webstorm.providers;

import com.intellij.codeInsight.daemon.LineMarkerInfo;
import com.intellij.codeInsight.daemon.LineMarkerProviderDescriptor;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.editor.markup.GutterIconRenderer;
import com.intellij.openapi.util.IconLoader;
import com.intellij.psi.PsiElement;
import com.intellij.psi.PsiFile;
import com.point.i18n.webstorm.services.ApiService;
import com.point.i18n.webstorm.services.CacheService;
import com.point.i18n.webstorm.services.ConfigService;
import com.point.i18n.webstorm.services.StorageService;
import com.point.i18n.webstorm.utils.I18nKeyParser;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.*;
import java.util.List;

/**
 * Line marker provider для отображения иконок рядом с ключами локализации.
 * Полностью переработан для лучшей производительности.
 */
public class PointI18nLineMarkerProvider extends LineMarkerProviderDescriptor {
    private static final Logger LOG = Logger.getInstance(PointI18nLineMarkerProvider.class);
    private static boolean enabled = true;
    private static Icon TRANSLATION_ICON = null;
    
    public PointI18nLineMarkerProvider() {
        LOG.info("PointI18nLineMarkerProvider created");
        try {
            TRANSLATION_ICON = IconLoader.getIcon("/icons/globe.svg", getClass());
        } catch (Exception e) {
            LOG.warn("Failed to load icon: " + e.getMessage());
        }
    }
    
    public static void toggle() {
        enabled = !enabled;
    }
    
    public static boolean isEnabled() {
        return enabled;
    }
    
    private ApiService getApiService() {
        return com.point.i18n.webstorm.PointI18nApplicationService.getInstance().getApiService();
    }
    
    private CacheService getCacheService() {
        return com.point.i18n.webstorm.PointI18nApplicationService.getInstance().getCacheService();
    }
    
    private StorageService getStorageService() {
        return com.point.i18n.webstorm.PointI18nApplicationService.getInstance().getStorageService();
    }
    
    private ConfigService getConfigService() {
        return com.point.i18n.webstorm.PointI18nApplicationService.getInstance().getConfigService();
    }
    
    @NotNull
    @Override
    public String getName() {
        return "Point I18n Line Markers";
    }
    
    @Nullable
    @Override
    public Icon getIcon() {
        return TRANSLATION_ICON;
    }
    
    @Override
    public @Nullable LineMarkerInfo<?> getLineMarkerInfo(@NotNull PsiElement element) {
        if (!enabled) {
            return null;
        }
        
        String token = getStorageService().getAccessToken();
        if (token == null || token.isEmpty()) {
            return null;
        }
        
        PsiFile file = element.getContainingFile();
        if (file == null) {
            return null;
        }
        
        // Проверяем только текстовые элементы (листья PSI дерева)
        if (element.getFirstChild() != null) {
            return null; // Не листовой элемент
        }
        
        String elementText = element.getText();
        if (elementText == null || elementText.isEmpty()) {
            return null;
        }
        
        // Проверяем, содержит ли элемент ключ локализации
        List<I18nKeyParser.KeyInfo> keys = I18nKeyParser.findAllKeys(elementText);
        if (keys.isEmpty()) {
            return null;
        }
        
        // Берем первый ключ
        I18nKeyParser.KeyInfo keyInfo = keys.get(0);
        
        CacheService cacheService = getCacheService();
        ConfigService configService = getConfigService();
        ApiService apiService = getApiService();
        
        String locale = configService.getLocale();
        
        // Загружаем локаль если нужно
        if (!cacheService.has(locale)) {
            try {
                String projectKey = configService.getProjectKey();
                java.util.Map<String, String> locales = apiService.fetchLocales(locale, projectKey);
                cacheService.set(locale, locales);
                LOG.info("Loaded locale " + locale + " for line markers");
            } catch (Exception e) {
                LOG.warn("Failed to load locale " + locale + ": " + e.getMessage());
                return null;
            }
        }
        
        String translation = cacheService.getTranslation(locale, keyInfo.key);
        if (translation == null || translation.isEmpty()) {
            return null;
        }
        
        // Ограничиваем длину tooltip
        String tooltip = translation.length() > 100 
            ? translation.substring(0, 97) + "..." 
            : translation;
        
        // Создаем line marker с иконкой и tooltip
        return new LineMarkerInfo<>(
            element,
            element.getTextRange(),
            TRANSLATION_ICON,
            e -> "💬 " + tooltip,
            null,
            GutterIconRenderer.Alignment.RIGHT,
            () -> "Translation: " + tooltip
        );
    }
}
