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
 * Action for configuring Projects API Base URL.
 */
public class ConfigProjectsApiBaseUrlAction extends AnAction {

    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        PropertiesComponent props = PropertiesComponent.getInstance();
        String currentUrl = props.getValue("point.i18n.projectsApiBaseUrl", "");

        String url = (String) JOptionPane.showInputDialog(
            null,
            "Enter Projects API Base URL (for project list):",
            "Point I18n - Configure Projects API Base URL",
            JOptionPane.QUESTION_MESSAGE,
            null,
            null,
            currentUrl
        );

        if (url == null) {
            return;
        }

        url = url.trim();
        if (url.isEmpty()) {
            Messages.showErrorDialog("URL cannot be empty", "Point I18n");
            return;
        }

        try {
            new URL(url);
        } catch (MalformedURLException ex) {
            Messages.showErrorDialog("Invalid URL format", "Point I18n");
            return;
        }

        String normalizedUrl = url.replaceAll("/+$", "");
        props.setValue("point.i18n.projectsApiBaseUrl", normalizedUrl);

        Messages.showInfoMessage("Projects API Base URL set: " + normalizedUrl, "Point I18n");
    }
}
