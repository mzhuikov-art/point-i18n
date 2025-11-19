package com.point.i18n.webstorm.actions;

import com.intellij.ide.util.PropertiesComponent;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.ui.Messages;
import org.jetbrains.annotations.NotNull;

import javax.swing.*;
import java.net.MalformedURLException;
import java.net.URL;

/**
 * Action for configuring API Base URL.
 */
public class ConfigApiBaseUrlAction extends AnAction {
    
    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        PropertiesComponent props = PropertiesComponent.getInstance();
        String currentUrl = props.getValue("point.i18n.apiBaseUrl", "");
        
        String url = JOptionPane.showInputDialog(
            null,
            "Enter API Base URL (for auth, projects, create, update, search):",
            "Point I18n - Configure API Base URL",
            JOptionPane.QUESTION_MESSAGE
        );
        
        if (url == null) {
            return; // User cancelled
        }
        
        url = url.trim();
        if (url.isEmpty()) {
            Messages.showErrorDialog("URL cannot be empty", "Point I18n");
            return;
        }
        
        // Validate URL
        try {
            new URL(url);
        } catch (MalformedURLException ex) {
            Messages.showErrorDialog("Invalid URL format", "Point I18n");
            return;
        }
        
        // Normalize URL (remove trailing slashes)
        String normalizedUrl = url.replaceAll("/+$", "");
        props.setValue("point.i18n.apiBaseUrl", normalizedUrl);
        
        Messages.showInfoMessage("API Base URL set: " + normalizedUrl, "Point I18n");
    }
}

