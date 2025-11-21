package com.point.i18n.webstorm.toolwindow;

import com.intellij.openapi.ui.Messages;
import com.point.i18n.webstorm.services.*;

import javax.swing.*;
import java.awt.*;
import java.util.HashMap;
import java.util.Map;

/**
 * Dialog for creating a new i18n key.
 */
public class CreateKeyDialog extends JDialog {
    private final ApiService apiService;
    private final CacheService cacheService;
    private final ConfigService configService;
    private final StorageService storageService;
    
    private JTextField keyField;
    private JTextField ruField;
    private JTextField enField;
    private JTextField uzField;
    private JButton translateButton;
    private TranslateService translateService;
    private boolean success = false;
    
    public CreateKeyDialog(Window parent, ApiService apiService, CacheService cacheService, 
                          ConfigService configService, StorageService storageService) {
        super(parent, "Create Key", ModalityType.APPLICATION_MODAL);
        this.apiService = apiService;
        this.cacheService = cacheService;
        this.configService = configService;
        this.storageService = storageService;
        this.translateService = new TranslateService(configService);
        
        initializeUI();
        setLocationRelativeTo(parent);
        pack();
    }
    
    private void initializeUI() {
        getContentPane().setLayout(new BorderLayout());
        ((JComponent) getContentPane()).setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
        
        JPanel formPanel = new JPanel();
        formPanel.setLayout(new BoxLayout(formPanel, BoxLayout.Y_AXIS));
        
        // Key field
        formPanel.add(new JLabel("Key:"));
        keyField = new JTextField(30);
        formPanel.add(keyField);
        formPanel.add(Box.createVerticalStrut(10));
        
        // Translations
        formPanel.add(new JLabel("RU:"));
        JPanel ruPanel = new JPanel(new BorderLayout(4, 0));
        ruField = new JTextField(30);
        translateButton = new JButton("🌐");
        translateButton.setToolTipText("Перевести с русского на английский и узбекский");
        translateButton.addActionListener(e -> performTranslate());
        ruPanel.add(ruField, BorderLayout.CENTER);
        ruPanel.add(translateButton, BorderLayout.EAST);
        formPanel.add(ruPanel);
        formPanel.add(Box.createVerticalStrut(5));
        
        formPanel.add(new JLabel("EN:"));
        enField = new JTextField(30);
        formPanel.add(enField);
        formPanel.add(Box.createVerticalStrut(5));
        
        formPanel.add(new JLabel("UZ:"));
        uzField = new JTextField(30);
        formPanel.add(uzField);
        
        getContentPane().add(formPanel, BorderLayout.CENTER);
        
        // Buttons
        JPanel buttonPanel = new JPanel(new FlowLayout());
        JButton createButton = new JButton("Create");
        createButton.addActionListener(e -> performCreate());
        buttonPanel.add(createButton);
        
        JButton cancelButton = new JButton("Cancel");
        cancelButton.addActionListener(e -> dispose());
        buttonPanel.add(cancelButton);
        
        getContentPane().add(buttonPanel, BorderLayout.SOUTH);
    }
    
    private void performCreate() {
        String key = keyField.getText().trim();
        if (key.isEmpty()) {
            Messages.showErrorDialog("Key cannot be empty", "Point I18n");
            return;
        }
        
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
            
            String projectKey = configService.getProjectKey();
            ApiService.CreateKeyResponse response = apiService.createKey(request, projectKey);
            
            // Проверяем, что ответ содержит данные
            if (response == null || response.data == null) {
                Messages.showErrorDialog("Failed to create key: Invalid response from server", "Point I18n");
                return;
            }
            
            // Add to cache
            Map<String, String> translations = new HashMap<>();
            translations.put("ru", response.data.translations != null && response.data.translations.ru != null ? response.data.translations.ru : "");
            translations.put("en", response.data.translations != null && response.data.translations.en != null ? response.data.translations.en : "");
            translations.put("uz", response.data.translations != null && response.data.translations.uz != null ? response.data.translations.uz : "");
            cacheService.addKey(response.data.key, translations);
            
            success = true;
            Messages.showInfoMessage("Key created successfully!", "Point I18n");
            dispose();
        } catch (Exception ex) {
            String errorMessage = ex.getMessage();
            if (errorMessage == null || errorMessage.isEmpty()) {
                errorMessage = "Unknown error occurred";
            }
            Messages.showErrorDialog("Failed to create key: " + errorMessage, "Point I18n");
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

