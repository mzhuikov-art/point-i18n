package com.point.i18n.webstorm.providers;

import com.intellij.lang.documentation.AbstractDocumentationProvider;
import com.intellij.lang.documentation.DocumentationMarkup;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.editor.Document;
import com.intellij.psi.PsiElement;
import com.intellij.psi.PsiFile;
import com.point.i18n.webstorm.services.ApiService;
import com.point.i18n.webstorm.services.CacheService;
import com.point.i18n.webstorm.services.ConfigService;
import com.point.i18n.webstorm.services.StorageService;
import com.point.i18n.webstorm.utils.I18nKeyParser;
import org.jetbrains.annotations.Nullable;

import java.util.Arrays;
import java.util.List;

/**
 * Hover provider для отображения переводов при наведении на ключи локализации.
 * Полностью переработан для лучшей совместимости с IntelliJ Platform.
 */
public class PointI18nHoverProvider extends AbstractDocumentationProvider {
    private static final Logger LOG = Logger.getInstance(PointI18nHoverProvider.class);
    private static final List<String> SUPPORTED_LOCALES = Arrays.asList("ru", "en", "uz");
    
    public PointI18nHoverProvider() {
        LOG.info("PointI18nHoverProvider created");
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
    
    @Override
    public @Nullable String generateDoc(PsiElement element, @Nullable PsiElement originalElement) {
        if (element == null) {
            return null;
        }
        
        PsiFile file = element.getContainingFile();
        if (file == null) {
            return null;
        }
        
        // Проверяем токен
        String token = getStorageService().getAccessToken();
        if (token == null || token.isEmpty()) {
            return null;
        }
        
        // Получаем текст файла и offset элемента
        String fileText = file.getText();
        if (fileText == null || fileText.isEmpty()) {
            return null;
        }
        
        // Получаем offset элемента
        int offset = element.getTextOffset();
        
        // Пытаемся найти ключ на позиции курсора
        I18nKeyParser.KeyInfo keyInfo = findKeyAtPosition(fileText, offset, element);
        
        if (keyInfo == null) {
            return null;
        }
        
        LOG.info("Hover: Found key '" + keyInfo.key + "' at offset " + offset);
        
        // Загружаем все локали
        try {
            ensureAllLocalesLoaded();
        } catch (Exception e) {
            LOG.warn("Failed to ensure locales loaded: " + e.getMessage());
        }
        
        return createDocumentation(keyInfo.key);
    }
    
    /**
     * Находит ключ локализации на заданной позиции.
     * Использует несколько стратегий для поиска.
     */
    private I18nKeyParser.KeyInfo findKeyAtPosition(String text, int offset, PsiElement element) {
        // Стратегия 1: Прямой поиск на offset
        I18nKeyParser.KeyInfo keyInfo = I18nKeyParser.findKeyAtOffset(text, offset);
        if (keyInfo != null) {
            return keyInfo;
        }
        
        // Стратегия 2: Поиск в тексте элемента
        String elementText = element.getText();
        if (elementText != null && !elementText.isEmpty()) {
            List<I18nKeyParser.KeyInfo> keysInElement = I18nKeyParser.findAllKeys(elementText);
            if (!keysInElement.isEmpty()) {
                // Возвращаем первый найденный ключ в элементе
                I18nKeyParser.KeyInfo found = keysInElement.get(0);
                return new I18nKeyParser.KeyInfo(found.key, offset, offset + found.key.length());
            }
        }
        
        // Стратегия 3: Поиск в родительских элементах
        PsiElement current = element.getParent();
        int depth = 0;
        while (current != null && depth < 5) {
            int currentOffset = current.getTextOffset();
            keyInfo = I18nKeyParser.findKeyAtOffset(text, currentOffset);
            if (keyInfo != null && offset >= keyInfo.startOffset && offset <= keyInfo.endOffset) {
                return keyInfo;
            }
            
            // Проверяем текст родительского элемента
            String currentText = current.getText();
            if (currentText != null && !currentText.isEmpty()) {
                List<I18nKeyParser.KeyInfo> keysInCurrent = I18nKeyParser.findAllKeys(currentText);
                if (!keysInCurrent.isEmpty()) {
                    I18nKeyParser.KeyInfo found = keysInCurrent.get(0);
                    int absoluteOffset = current.getTextOffset();
                    return new I18nKeyParser.KeyInfo(
                        found.key, 
                        absoluteOffset + found.startOffset, 
                        absoluteOffset + found.endOffset
                    );
                }
            }
            
            current = current.getParent();
            depth++;
        }
        
        // Стратегия 4: Поиск в области вокруг offset
        int searchRadius = 200;
        int startOffset = Math.max(0, offset - searchRadius);
        int endOffset = Math.min(text.length(), offset + searchRadius);
        String searchText = text.substring(startOffset, endOffset);
        
        List<I18nKeyParser.KeyInfo> nearbyKeys = I18nKeyParser.findAllKeys(searchText);
        for (I18nKeyParser.KeyInfo key : nearbyKeys) {
            int absoluteStart = startOffset + key.startOffset;
            int absoluteEnd = startOffset + key.endOffset;
            
            // Проверяем, попадает ли offset в диапазон ключа
            if (offset >= absoluteStart && offset <= absoluteEnd) {
                return new I18nKeyParser.KeyInfo(key.key, absoluteStart, absoluteEnd);
            }
        }
        
        // Стратегия 5: Ищем ближайший ключ
        I18nKeyParser.KeyInfo closestKey = null;
        int minDistance = Integer.MAX_VALUE;
        
        for (I18nKeyParser.KeyInfo key : nearbyKeys) {
            int absoluteStart = startOffset + key.startOffset;
            int distance = Math.abs(offset - absoluteStart);
            
            if (distance < minDistance && distance < 50) { // Максимальное расстояние 50 символов
                minDistance = distance;
                closestKey = new I18nKeyParser.KeyInfo(
                    key.key, 
                    absoluteStart, 
                    startOffset + key.endOffset
                );
            }
        }
        
        return closestKey;
    }
    
    /**
     * Загружает все поддерживаемые локали.
     */
    private void ensureAllLocalesLoaded() {
        CacheService cacheService = getCacheService();
        ApiService apiService = getApiService();
        ConfigService configService = getConfigService();
        String projectKey = configService.getProjectKey();
        
        for (String locale : SUPPORTED_LOCALES) {
            if (!cacheService.has(locale)) {
                try {
                    LOG.info("Loading locale: " + locale + " for project: " + projectKey);
                    java.util.Map<String, String> locales = apiService.fetchLocales(locale, projectKey);
                    if (locales != null && !locales.isEmpty()) {
                        cacheService.set(locale, locales);
                        LOG.info("Loaded locale " + locale + " with " + locales.size() + " keys");
                    } else {
                        LOG.warn("Locale " + locale + " returned empty data");
                    }
                } catch (Exception e) {
                    LOG.error("Failed to load locale " + locale + ": " + e.getMessage(), e);
                }
            } else {
                LOG.info("Locale " + locale + " already cached");
            }
        }
    }
    
    /**
     * Создает HTML документацию с таблицей переводов.
     */
    private String createDocumentation(String key) {
        CacheService cacheService = getCacheService();
        java.util.Map<String, String> translations = new java.util.HashMap<>();
        java.util.Map<String, Boolean> localeStatus = new java.util.HashMap<>();
        boolean hasAnyTranslation = false;
        
        for (String lang : SUPPORTED_LOCALES) {
            boolean localeLoaded = cacheService.has(lang);
            localeStatus.put(lang, localeLoaded);
            
            String translation = cacheService.getTranslation(lang, key);
            LOG.info("Locale " + lang + " loaded=" + localeLoaded + ", translation for '" + key + "': " + (translation != null ? translation : "null"));
            
            if (translation != null && !translation.isEmpty()) {
                translations.put(lang, translation);
                hasAnyTranslation = true;
            } else {
                translations.put(lang, null);
            }
        }
        
        if (!hasAnyTranslation) {
            return null;
        }
        
        StringBuilder html = new StringBuilder();
        
        // Используем DocumentationMarkup для правильного форматирования
        html.append(DocumentationMarkup.DEFINITION_START);
        html.append("<code>").append(escapeHtml(key)).append("</code>");
        html.append(DocumentationMarkup.DEFINITION_END);
        
        html.append(DocumentationMarkup.CONTENT_START);
        html.append("<table style='width:100%; border-collapse: collapse;'>");
        html.append("<tr>");
        html.append("<th style='padding: 8px 12px; text-align: left; opacity: 0.7;'>Язык</th>");
        html.append("<th style='padding: 8px 12px; text-align: left; opacity: 0.7;'>Перевод</th>");
        html.append("</tr>");
        
        for (String lang : SUPPORTED_LOCALES) {
            String flag = getFlag(lang);
            String translation = translations.get(lang);
            boolean isLocaleLoaded = localeStatus.get(lang);
            
            String displayTranslation;
            if (translation != null && !translation.isEmpty()) {
                displayTranslation = escapeHtml(translation);
            } else if (!isLocaleLoaded) {
                displayTranslation = "<i style='color: #ff9900;'>⚠️ локаль не загружена</i>";
            } else {
                displayTranslation = "<i style='opacity: 0.5;'>нет перевода</i>";
            }
            
            html.append("<tr>");
            html.append("<td style='padding: 8px 12px;'>")
                .append(flag).append(" <b>").append(lang.toUpperCase()).append("</b></td>");
            html.append("<td style='padding: 8px 12px;'>")
                .append(displayTranslation).append("</td>");
            html.append("</tr>");
        }
        
        html.append("</table>");
        html.append(DocumentationMarkup.CONTENT_END);
        
        return html.toString();
    }
    
    private String getFlag(String locale) {
        switch (locale) {
            case "ru": return "🇷🇺";
            case "en": return "🇬🇧";
            case "uz": return "🇺🇿";
            default: return "🌐";
        }
    }
    
    private String escapeHtml(String text) {
        if (text == null) {
            return "";
        }
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;")
                   .replace("'", "&#39;");
    }
}
