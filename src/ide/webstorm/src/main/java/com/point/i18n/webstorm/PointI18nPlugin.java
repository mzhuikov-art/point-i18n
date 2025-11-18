package com.point.i18n.webstorm;

import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.components.BaseComponent;
import com.intellij.openapi.components.Service;
import org.jetbrains.annotations.NotNull;

/**
 * Main plugin class for Point I18n WebStorm plugin.
 * This class is initialized when the IDE starts.
 */
@Service
public final class PointI18nPlugin implements BaseComponent {
    
    @Override
    public void initComponent() {
        // Initialize plugin
        System.out.println("Point I18n Plugin initialized");
        
        // TODO: Initialize TypeScript extension
        // Load and initialize TypeScript code from out/webstorm/
    }
    
    @Override
    public void disposeComponent() {
        // Cleanup
        System.out.println("Point I18n Plugin disposed");
    }
    
    @NotNull
    @Override
    public String getComponentName() {
        return "PointI18nPlugin";
    }
    
    public static PointI18nPlugin getInstance() {
        return ApplicationManager.getApplication().getComponent(PointI18nPlugin.class);
    }
}

