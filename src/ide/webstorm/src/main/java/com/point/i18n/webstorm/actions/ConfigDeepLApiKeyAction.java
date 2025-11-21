package com.point.i18n.webstorm.actions;

import com.intellij.ide.util.PropertiesComponent;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.ui.Messages;
import org.jetbrains.annotations.NotNull;

import javax.swing.*;

/**
 * Action for configuring DeepL API Key.
 */
public class ConfigDeepLApiKeyAction extends AnAction {
    
    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        PropertiesComponent props = PropertiesComponent.getInstance();
        String currentKey = props.getValue("point.i18n.deepLApiKey", "");
        
        String apiKey = JOptionPane.showInputDialog(
            null,
            "Enter DeepL API Key:",
            "Point I18n - Configure DeepL API Key",
            JOptionPane.QUESTION_MESSAGE
        );
        
        if (apiKey == null) {
            return; // User cancelled
        }
        
        apiKey = apiKey.trim();
        if (apiKey.isEmpty()) {
            Messages.showErrorDialog("API key cannot be empty", "Point I18n");
            return;
        }
        
        props.setValue("point.i18n.deepLApiKey", apiKey);
        
        Messages.showInfoMessage("DeepL API key configured", "Point I18n");
    }
}

