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
    private boolean success = false;
    
    public CreateKeyDialog(Window parent, ApiService apiService, CacheService cacheService, 
                          ConfigService configService, StorageService storageService) {
        super(parent, "Create Key", ModalityType.APPLICATION_MODAL);
        this.apiService = apiService;
        this.cacheService = cacheService;
        this.configService = configService;
        this.storageService = storageService;
        
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
        ruField = new JTextField(30);
        formPanel.add(ruField);
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
    
    public boolean isSuccess() {
        return success;
    }
}

