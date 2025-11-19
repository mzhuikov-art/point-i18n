package com.point.i18n.webstorm.providers;

import com.intellij.lang.annotation.AnnotationHolder;
import com.intellij.lang.annotation.Annotator;
import com.intellij.lang.annotation.HighlightSeverity;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.editor.colors.TextAttributesKey;
import com.intellij.openapi.editor.markup.TextAttributes;
import com.intellij.psi.PsiElement;
import com.intellij.psi.PsiFile;
import com.point.i18n.webstorm.services.ApiService;
import com.point.i18n.webstorm.services.CacheService;
import com.point.i18n.webstorm.services.ConfigService;
import com.point.i18n.webstorm.services.StorageService;
import com.point.i18n.webstorm.utils.I18nKeyParser;
import org.jetbrains.annotations.NotNull;

import java.awt.*;
import java.util.List;

/**
 * Annotator для отображения переводов как сноски над ключами локализации.
 */
public class PointI18nAnnotator implements Annotator {
    private static final Logger LOG = Logger.getInstance(PointI18nAnnotator.class);
    private static boolean enabled = true;
    // Храним обработанные позиции для каждого файла
    private static final java.util.Map<String, java.util.Set<String>> fileProcessedPositions = new java.util.concurrent.ConcurrentHashMap<>();
    
    // Цвет для сноски (серый, немного прозрачный)
    private static final TextAttributesKey TRANSLATION_HINT = TextAttributesKey.createTextAttributesKey(
        "POINT_I18N_TRANSLATION_HINT",
        new TextAttributes(new Color(128, 128, 128, 180), null, null, null, Font.ITALIC)
    );
    
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
    
    @Override
    public void annotate(@NotNull PsiElement element, @NotNull AnnotationHolder holder) {
        if (!enabled) {
            return;
        }
        
        String token = getStorageService().getAccessToken();
        if (token == null || token.isEmpty()) {
            return;
        }
        
        PsiFile currentFile = element.getContainingFile();
        if (currentFile == null) {
            return;
        }
        
        // Получаем уникальный идентификатор файла
        String fileKey = currentFile.getVirtualFile() != null 
            ? currentFile.getVirtualFile().getPath() + ":" + currentFile.getModificationStamp()
            : currentFile.getName() + ":" + System.identityHashCode(currentFile);
        
        // Получаем или создаем Set для текущего файла
        java.util.Set<String> processed = fileProcessedPositions.computeIfAbsent(fileKey, k -> {
            // Если карта становится слишком большой, очищаем старые записи
            if (fileProcessedPositions.size() > 100) {
                fileProcessedPositions.clear();
            }
            return new java.util.HashSet<>();
        });
        
        // Обрабатываем только листовые элементы
        if (element.getFirstChild() != null) {
            return;
        }
        
        String elementText = element.getText();
        if (elementText == null || elementText.isEmpty()) {
            return;
        }
        
        // Ищем ключи в элементе
        List<I18nKeyParser.KeyInfo> keys = I18nKeyParser.findAllKeys(elementText);
        if (keys.isEmpty()) {
            return;
        }
        
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
            } catch (Exception e) {
                return;
            }
        }
        
        // Для каждого ключа добавляем аннотацию
        int elementOffset = element.getTextOffset();
        
        for (I18nKeyParser.KeyInfo keyInfo : keys) {
            // Вычисляем абсолютную позицию в файле
            int absoluteStart = elementOffset + keyInfo.startOffset;
            int absoluteEnd = elementOffset + keyInfo.endOffset;
            
            // Создаем уникальный ключ для этой позиции
            String positionKey = absoluteStart + "-" + absoluteEnd + ":" + keyInfo.key;
            
            // Проверяем, не обработали ли мы уже эту позицию
            if (processed.contains(positionKey)) {
                continue;
            }
            processed.add(positionKey);
            
            String translation = cacheService.getTranslation(locale, keyInfo.key);
            if (translation == null || translation.isEmpty()) {
                continue;
            }
            
            // Ограничиваем длину перевода
            String displayText = translation.length() > 60 
                ? translation.substring(0, 57) + "..." 
                : translation;
            
            try {
                // Создаем range для ключа
                com.intellij.openapi.util.TextRange range = 
                    new com.intellij.openapi.util.TextRange(absoluteStart, absoluteEnd);
                
                // Добавляем аннотацию как сноску
                holder.newSilentAnnotation(HighlightSeverity.INFORMATION)
                    .range(range)
                    .tooltip("Перевод: " + displayText)
                    .textAttributes(TRANSLATION_HINT)
                    .create();
                    
            } catch (Exception e) {
                LOG.warn("Failed to create annotation: " + e.getMessage());
            }
        }
    }
}

