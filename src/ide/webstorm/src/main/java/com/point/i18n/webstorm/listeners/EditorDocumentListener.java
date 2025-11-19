package com.point.i18n.webstorm.listeners;

import com.intellij.openapi.editor.Document;
import com.intellij.openapi.editor.event.DocumentEvent;
import com.intellij.openapi.editor.event.DocumentListener;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.project.ProjectManager;
import org.jetbrains.annotations.NotNull;

/**
 * Listener for document changes to update decorations.
 */
public class EditorDocumentListener implements DocumentListener {
    
    @Override
    public void documentChanged(@NotNull DocumentEvent event) {
        // Update decorations when document changes
        updateDecorations(event.getDocument());
    }
    
    private void updateDecorations(Document document) {
        try {
            // Trigger re-analysis by invalidating the document
            // In IntelliJ Platform, line markers are updated automatically by the daemon
            // But we can force update by restarting the daemon
            Project[] projects = ProjectManager.getInstance().getOpenProjects();
            for (Project project : projects) {
                com.intellij.openapi.fileEditor.FileDocumentManager fileDocManager = 
                    com.intellij.openapi.fileEditor.FileDocumentManager.getInstance();
                com.intellij.openapi.vfs.VirtualFile file = fileDocManager.getFile(document);
                if (file != null) {
                    // Restart daemon to update decorations
                    com.intellij.codeInsight.daemon.DaemonCodeAnalyzer.getInstance(project).restart();
                }
            }
        } catch (Exception e) {
            // Ignore errors
            System.err.println("Error updating decorations: " + e.getMessage());
        }
    }
}

