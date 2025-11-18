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
        return new FactoryInlayHintsCollector(editor) {
            @Override
            public boolean collect(@NotNull PsiElement element, @NotNull Editor editor, @NotNull InlayHintsSink sink) {
                // Проверяем только корневой элемент файла
                if (element != file) {
                    return true;
                }
                
                if (!enabled) {
                    LOG.info("InlayHints disabled");
                    return true;
                }
                
                String token = getStorageService().getAccessToken();
                if (token == null || token.isEmpty()) {
                    LOG.info("No access token");
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
                        LOG.info("Loaded locale " + locale + " for inlay hints");
                    } catch (Exception e) {
                        LOG.warn("Failed to load locale: " + e.getMessage());
                        return true;
                    }
                }
                
                // Ищем все ключи в файле
                List<I18nKeyParser.KeyInfo> allKeys = I18nKeyParser.findAllKeys(fileText);
                if (allKeys.isEmpty()) {
                    LOG.info("No keys found in file");
                    return true;
                }
                
                LOG.info("Found " + allKeys.size() + " keys in file " + file.getName());
                
                int hintsAdded = 0;
                
                // Для каждого ключа создаем hint
                for (I18nKeyParser.KeyInfo keyInfo : allKeys) {
                    String translation = cacheService.getTranslation(locale, keyInfo.key);
                    if (translation == null || translation.isEmpty()) {
                        LOG.info("No translation for key: " + keyInfo.key);
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
                        hintsAdded++;
                        LOG.info("Added hint for key: " + keyInfo.key + " at offset " + keyInfo.endOffset);
                    } catch (Exception e) {
                        LOG.warn("Failed to create hint for key " + keyInfo.key + ": " + e.getMessage());
                    }
                }
                
                LOG.info("Added " + hintsAdded + " hints to file " + file.getName());
                return true;
            }
        };
    }
}
