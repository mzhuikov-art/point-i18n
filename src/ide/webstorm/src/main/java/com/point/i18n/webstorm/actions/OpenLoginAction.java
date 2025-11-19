package com.point.i18n.webstorm.actions;

import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.ui.Messages;
import com.point.i18n.webstorm.services.ApiService;
import com.point.i18n.webstorm.services.StorageService;
import org.jetbrains.annotations.NotNull;

import javax.swing.*;

/**
 * Action for opening login dialog.
 */
public class OpenLoginAction extends AnAction {
    
    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        // Запрашиваем username
        String username = JOptionPane.showInputDialog(
            null,
            "Enter your username:",
            "Point I18n - Login",
            JOptionPane.QUESTION_MESSAGE
        );
        
        if (username == null || username.trim().isEmpty()) {
            return; // Пользователь отменил или пустое значение
        }
        
        // Запрашиваем password
        JPasswordField passwordField = new JPasswordField();
        int option = JOptionPane.showConfirmDialog(
            null,
            passwordField,
            "Enter your password:",
            JOptionPane.OK_CANCEL_OPTION,
            JOptionPane.QUESTION_MESSAGE
        );
        
        if (option != JOptionPane.OK_OPTION) {
            return; // Пользователь отменил
        }
        
        String password = new String(passwordField.getPassword());
        if (password.trim().isEmpty()) {
            Messages.showErrorDialog("Password cannot be empty", "Point I18n");
            return;
        }
        
        // Выполняем авторизацию
        try {
            StorageService storageService = new StorageService();
            ApiService apiService = new ApiService(storageService);
            
            ApiService.AuthResponse authResponse = apiService.authenticate(username, password);
            storageService.saveTokens(authResponse);
            
            Messages.showInfoMessage("Tokens saved successfully!", "Point I18n");
        } catch (Exception ex) {
            Messages.showErrorDialog(
                "Authentication failed: " + ex.getMessage(),
                "Point I18n - Error"
            );
        }
    }
}
