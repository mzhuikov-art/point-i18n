package com.point.i18n.webstorm.toolwindow;

import com.intellij.openapi.project.Project;
import com.intellij.openapi.wm.ToolWindow;
import com.intellij.openapi.wm.ToolWindowFactory;
import com.intellij.ui.content.Content;
import com.intellij.ui.content.ContentFactory;
import com.point.i18n.webstorm.services.ApiService;
import com.point.i18n.webstorm.services.StorageService;
import com.point.i18n.webstorm.services.ConfigService;
import org.jetbrains.annotations.NotNull;

import javax.swing.*;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;

/**
 * Factory for Point I18n ToolWindow (Sidebar).
 */
public class PointI18nToolWindowFactory implements ToolWindowFactory {
    
    @Override
    public void createToolWindowContent(@NotNull Project project, @NotNull ToolWindow toolWindow) {
        // Используем глобальный ApplicationService
        com.point.i18n.webstorm.PointI18nApplicationService appService = 
            com.point.i18n.webstorm.PointI18nApplicationService.getInstance();
        
        // Создаем полнофункциональную панель с проектом
        PointI18nToolWindowPanel panel = new PointI18nToolWindowPanel(appService, project);
        
        // Добавляем панель в ToolWindow
        Content content = com.intellij.ui.content.ContentFactory.getInstance().createContent(panel, "", false);
        toolWindow.getContentManager().addContent(content);
    }
    @Override
    public void init(@NotNull ToolWindow toolWindow) {
        // Инициализация ToolWindow
    }
    
    @Override
    public boolean shouldBeAvailable(@NotNull Project project) {
        // ToolWindow доступен для всех проектов
        return true;
    }
}

