package com.point.i18n.webstorm.toolwindow;

import com.intellij.openapi.ui.Messages;
import com.point.i18n.webstorm.services.*;

import javax.swing.*;
import java.awt.*;
import java.util.HashMap;
import java.util.Map;

/**
 * Dialog for editing an existing i18n key.
 */
public class EditKeyDialog extends JDialog {
    private final String key;
    private final ApiService apiService;
    private final CacheService cacheService;
    private final ConfigService configService;
    private final StorageService storageService;
    
    private JTextField ruField;
    private JTextField enField;
    private JTextField uzField;
    private JTextField cnField;
    private JButton translateButton;
    private TranslateService translateService;
    private boolean success = false;
    
    public EditKeyDialog(Window parent, String key, String ru, String en, String uz, String cn,
                        ApiService apiService, CacheService cacheService, 
                        ConfigService configService, StorageService storageService) {
        super(parent, "Edit Key: " + key, ModalityType.APPLICATION_MODAL);
        this.key = key;
        this.apiService = apiService;
        this.cacheService = cacheService;
        this.configService = configService;
        this.storageService = storageService;
        this.translateService = new TranslateService(configService);
        
        initializeUI(ru, en, uz, cn);
        setLocationRelativeTo(parent);
        pack();
    }
    
    private void initializeUI(String ru, String en, String uz, String cn) {
        getContentPane().setLayout(new BorderLayout());
        ((JComponent) getContentPane()).setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
        
        JPanel formPanel = new JPanel();
        formPanel.setLayout(new BoxLayout(formPanel, BoxLayout.Y_AXIS));
        
        formPanel.add(new JLabel("Key: " + key));
        formPanel.add(Box.createVerticalStrut(10));
        
        // Translations
        formPanel.add(new JLabel("RU:"));
        JPanel ruPanel = new JPanel(new BorderLayout(4, 0));
        ruField = new JTextField(ru, 30);
        translateButton = new JButton("🌐");
        translateButton.setToolTipText("Перевести с русского на английский, узбекский и китайский");
        translateButton.addActionListener(e -> performTranslate());
        ruPanel.add(ruField, BorderLayout.CENTER);
        ruPanel.add(translateButton, BorderLayout.EAST);
        formPanel.add(ruPanel);
        formPanel.add(Box.createVerticalStrut(5));
        
        formPanel.add(new JLabel("EN:"));
        enField = new JTextField(en, 30);
        formPanel.add(enField);
        formPanel.add(Box.createVerticalStrut(5));
        
        formPanel.add(new JLabel("UZ:"));
        uzField = new JTextField(uz, 30);
        formPanel.add(uzField);
        formPanel.add(Box.createVerticalStrut(5));

        formPanel.add(new JLabel("CN (optional):"));
        cnField = new JTextField(cn != null ? cn : "", 30);
        formPanel.add(cnField);
        
        getContentPane().add(formPanel, BorderLayout.CENTER);
        
        // Buttons
        JPanel buttonPanel = new JPanel(new FlowLayout());
        JButton updateButton = new JButton("Update");
        updateButton.addActionListener(e -> performUpdate());
        buttonPanel.add(updateButton);
        
        JButton cancelButton = new JButton("Cancel");
        cancelButton.addActionListener(e -> dispose());
        buttonPanel.add(cancelButton);
        
        getContentPane().add(buttonPanel, BorderLayout.SOUTH);
    }
    
    private void performUpdate() {
        String token = storageService.getAccessToken();
        if (token == null || token.isEmpty()) {
            Messages.showErrorDialog("Please login first", "Point I18n");
            return;
        }
        
        try {
            ApiService.CreateKeyRequest request = new ApiService.CreateKeyRequest();
            request.key = key;
            request.translations = new ApiService.Translations();
            request.translations.ru = ruField.getText().trim();
            request.translations.en = enField.getText().trim();
            request.translations.uz = uzField.getText().trim();
            request.translations.cn = cnField.getText().trim();
            
            String projectKey = configService.getProjectKey();
            ApiService.CreateKeyResponse response = apiService.updateKey(request, projectKey);
            
            // Проверяем, что ответ содержит данные
            if (response == null || response.data == null) {
                Messages.showErrorDialog("Failed to update key: Invalid response from server", "Point I18n");
                return;
            }
            
            // Update cache
            Map<String, String> translations = new HashMap<>();
            translations.put("ru", response.data.translations != null && response.data.translations.ru != null ? response.data.translations.ru : "");
            translations.put("en", response.data.translations != null && response.data.translations.en != null ? response.data.translations.en : "");
            translations.put("uz", response.data.translations != null && response.data.translations.uz != null ? response.data.translations.uz : "");
            translations.put("cn", response.data.translations != null && response.data.translations.cn != null ? response.data.translations.cn : cnField.getText().trim());
            cacheService.updateKey(response.data.key, translations);
            
            success = true;
            Messages.showInfoMessage("Key updated successfully!", "Point I18n");
            dispose();
        } catch (Exception ex) {
            String errorMessage = ex.getMessage();
            if (errorMessage == null || errorMessage.isEmpty()) {
                errorMessage = "Unknown error occurred";
            }
            Messages.showErrorDialog("Failed to update key: " + errorMessage, "Point I18n");
        }
    }
    
    private void performTranslate() {
        String ruText = ruField.getText().trim();
        if (ruText.isEmpty()) {
            Messages.showErrorDialog("Введите текст на русском языке", "Point I18n");
            return;
        }
        
        translateButton.setEnabled(false);
        translateButton.setText("⏳");
        
        // Выполняем перевод в отдельном потоке, чтобы не блокировать UI
        new Thread(() -> {
            try {
                TranslateService.TranslationResult result = translateService.translateToEnAndUz(ruText);
                
                // Обновляем UI в EDT
                javax.swing.SwingUtilities.invokeLater(() -> {
                    enField.setText(result.en);
                    uzField.setText(result.uz);
                    cnField.setText(result.cn);
                    translateButton.setEnabled(true);
                    translateButton.setText("🌐");
                });
            } catch (IllegalStateException e) {
                // API ключ не настроен
                javax.swing.SwingUtilities.invokeLater(() -> {
                    translateButton.setEnabled(true);
                    translateButton.setText("🌐");
                    int option = Messages.showYesNoDialog(
                        "DeepL API ключ не настроен. Хотите настроить его сейчас?",
                        "Point I18n",
                        Messages.getQuestionIcon()
                    );
                    if (option == Messages.YES) {
                        // Показываем диалог настройки напрямую
                        String apiKey = javax.swing.JOptionPane.showInputDialog(
                            null,
                            "Enter DeepL API Key:",
                            "Point I18n - Configure DeepL API Key",
                            javax.swing.JOptionPane.QUESTION_MESSAGE
                        );
                        if (apiKey != null && !apiKey.trim().isEmpty()) {
                            configService.setDeepLApiKey(apiKey.trim());
                            Messages.showInfoMessage("DeepL API key configured", "Point I18n");
                        }
                    }
                });
            } catch (Exception e) {
                javax.swing.SwingUtilities.invokeLater(() -> {
                    translateButton.setEnabled(true);
                    translateButton.setText("🌐");
                    Messages.showErrorDialog("Ошибка перевода: " + e.getMessage(), "Point I18n");
                });
            }
        }).start();
    }
    
    public boolean isSuccess() {
        return success;
    }
}

