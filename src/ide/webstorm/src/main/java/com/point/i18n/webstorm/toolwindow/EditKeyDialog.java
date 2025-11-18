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
    private boolean success = false;
    
    public EditKeyDialog(Window parent, String key, String ru, String en, String uz,
                        ApiService apiService, CacheService cacheService, 
                        ConfigService configService, StorageService storageService) {
        super(parent, "Edit Key: " + key, ModalityType.APPLICATION_MODAL);
        this.key = key;
        this.apiService = apiService;
        this.cacheService = cacheService;
        this.configService = configService;
        this.storageService = storageService;
        
        initializeUI(ru, en, uz);
        setLocationRelativeTo(parent);
        pack();
    }
    
    private void initializeUI(String ru, String en, String uz) {
        getContentPane().setLayout(new BorderLayout());
        ((JComponent) getContentPane()).setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
        
        JPanel formPanel = new JPanel();
        formPanel.setLayout(new BoxLayout(formPanel, BoxLayout.Y_AXIS));
        
        formPanel.add(new JLabel("Key: " + key));
        formPanel.add(Box.createVerticalStrut(10));
        
        // Translations
        formPanel.add(new JLabel("RU:"));
        ruField = new JTextField(ru, 30);
        formPanel.add(ruField);
        formPanel.add(Box.createVerticalStrut(5));
        
        formPanel.add(new JLabel("EN:"));
        enField = new JTextField(en, 30);
        formPanel.add(enField);
        formPanel.add(Box.createVerticalStrut(5));
        
        formPanel.add(new JLabel("UZ:"));
        uzField = new JTextField(uz, 30);
        formPanel.add(uzField);
        
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
            
            String projectKey = configService.getProjectKey();
            ApiService.CreateKeyResponse response = apiService.updateKey(request, projectKey);
            
            // Update cache
            Map<String, String> translations = new HashMap<>();
            translations.put("ru", response.data.translations.ru != null ? response.data.translations.ru : "");
            translations.put("en", response.data.translations.en != null ? response.data.translations.en : "");
            translations.put("uz", response.data.translations.uz != null ? response.data.translations.uz : "");
            cacheService.updateKey(response.data.key, translations);
            
            success = true;
            Messages.showInfoMessage("Key updated successfully!", "Point I18n");
            dispose();
        } catch (Exception ex) {
            Messages.showErrorDialog("Failed to update key: " + ex.getMessage(), "Point I18n");
        }
    }
    
    public boolean isSuccess() {
        return success;
    }
}

