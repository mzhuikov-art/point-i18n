package com.point.i18n.webstorm.providers;

import com.intellij.codeInsight.hints.*;
import com.intellij.codeInsight.hints.presentation.InlayPresentation;
import com.intellij.codeInsight.hints.presentation.PresentationFactory;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.editor.Editor;
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
 * Inlay hints provider для отображения переводов inline с кодом.
 */
@SuppressWarnings("UnstableApiUsage")
public class PointI18nInlayHintsProvider implements InlayHintsProvider<NoSettings> {
    private static final Logger LOG = Logger.getInstance(PointI18nInlayHintsProvider.class);
    private static final SettingsKey<NoSettings> KEY = new SettingsKey<>("point.i18n.inlay.hints");
    private static boolean enabled = true;
    // Храним обработанные позиции для каждого файла
    private static final java.util.Map<String, java.util.Set<Integer>> fileProcessedOffsets = new java.util.concurrent.ConcurrentHashMap<>();
    
    public PointI18nInlayHintsProvider() {
        LOG.info("PointI18nInlayHintsProvider created");
    }
    
    public static void toggle() {
        enabled = !enabled;
        LOG.info("InlayHints toggled: " + enabled);
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
    public SettingsKey<NoSettings> getKey() {
        return KEY;
    }
    
    @NotNull
    @Override
    public String getName() {
        return "Point I18n translations";
    }
    
    @Nullable
    @Override
    public String getPreviewText() {
        return "t('key') ← translation";
    }
    
    @NotNull
    @Override
    public ImmediateConfigurable createConfigurable(@NotNull NoSettings settings) {
        return new ImmediateConfigurable() {
            @NotNull
            @Override
            public JComponent createComponent(@NotNull ChangeListener listener) {
                JPanel panel = new JPanel();
                panel.add(new JLabel("Show translations inline"));
                return panel;
            }
        };
    }
    
    @NotNull
    @Override
    public NoSettings createSettings() {
        return new NoSettings();
    }
    
    @NotNull
    @Override
    public InlayHintsCollector getCollectorFor(@NotNull PsiFile file, @NotNull Editor editor, @NotNull NoSettings settings, @NotNull InlayHintsSink sink) {
        // Получаем уникальный идентификатор файла
        String fileKey = file.getVirtualFile() != null 
            ? file.getVirtualFile().getPath() + ":" + file.getModificationStamp()
            : file.getName() + ":" + System.identityHashCode(file);
        
        // Получаем или создаем Set для текущего файла
        final java.util.Set<Integer> processedOffsets = fileProcessedOffsets.computeIfAbsent(fileKey, k -> {
            // Если карта становится слишком большой, очищаем старые записи
            if (fileProcessedOffsets.size() > 100) {
                fileProcessedOffsets.clear();
            }
            return new java.util.HashSet<>();
        });
        
        return new FactoryInlayHintsCollector(editor) {
            @Override
            public boolean collect(@NotNull PsiElement element, @NotNull Editor editor, @NotNull InlayHintsSink sink) {
                // Проверяем только корневой элемент файла
                if (element != file) {
                    return true;
                }
                
                if (!enabled) {
                    return true;
                }
                
                String token = getStorageService().getAccessToken();
                if (token == null || token.isEmpty()) {
                    return true;
                }
                
                String fileText = file.getText();
                if (fileText == null || fileText.isEmpty()) {
                    return true;
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
                        return true;
                    }
                }
                
                // Ищем все ключи в файле
                List<I18nKeyParser.KeyInfo> allKeys = I18nKeyParser.findAllKeys(fileText);
                if (allKeys.isEmpty()) {
                    return true;
                }
                
                // Для каждого ключа создаем hint (только один раз)
                for (I18nKeyParser.KeyInfo keyInfo : allKeys) {
                    // Проверяем, не добавляли ли уже hint на этой позиции
                    if (processedOffsets.contains(keyInfo.endOffset)) {
                        continue;
                    }
                    processedOffsets.add(keyInfo.endOffset);
                    
                    String translation = cacheService.getTranslation(locale, keyInfo.key);
                    if (translation == null || translation.isEmpty()) {
                        continue;
                    }
                    
                    // Ограничиваем длину перевода
                    String displayText = translation.length() > 60 
                        ? translation.substring(0, 57) + "..." 
                        : translation;
                    
                    try {
                        // Создаем презентацию
                        InlayPresentation presentation = getFactory().smallText(" ← " + displayText);
                        
                        // Добавляем hint
                        sink.addInlineElement(
                            keyInfo.endOffset,
                            false,
                            presentation,
                            false
                        );
                    } catch (Exception e) {
                        // Игнорируем ошибки
                    }
                }
                
                return true;
            }
        };
    }
}
