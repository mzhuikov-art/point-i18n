package com.point.i18n.webstorm.actions;

import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.Messages;
import com.point.i18n.webstorm.providers.PointI18nAnnotator;
import com.point.i18n.webstorm.providers.PointI18nInlayHintsProvider;
import com.point.i18n.webstorm.providers.PointI18nLineMarkerProvider;
import org.jetbrains.annotations.NotNull;

/**
 * Action для переключения отображения переводов в коде.
 * Управляет как line markers, так и inlay hints.
 */
public class ToggleDecorationsAction extends AnAction {
    
    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        // Переключаем все типы decorations
        PointI18nLineMarkerProvider.toggle();
        PointI18nInlayHintsProvider.toggle();
        PointI18nAnnotator.toggle();
        
        boolean enabled = PointI18nLineMarkerProvider.isEnabled();
        String status = enabled ? "включены" : "выключены";
        
        Messages.showInfoMessage(
            "Переводы I18n " + status,
            "Point I18n"
        );
        
        // Запускаем повторный анализ кода для обновления decorations
        Project project = e.getProject();
        if (project != null) {
            com.intellij.codeInsight.daemon.DaemonCodeAnalyzer.getInstance(project).restart();
            
            // Также обновляем inlay hints
            com.intellij.openapi.editor.EditorFactory.getInstance().getAllEditors();
            for (com.intellij.openapi.editor.Editor editor : com.intellij.openapi.editor.EditorFactory.getInstance().getAllEditors()) {
                com.intellij.openapi.fileEditor.FileDocumentManager manager = 
                    com.intellij.openapi.fileEditor.FileDocumentManager.getInstance();
                com.intellij.openapi.vfs.VirtualFile file = manager.getFile(editor.getDocument());
                
                if (file != null && file.getFileType().getName().matches("(JavaScript|TypeScript|Vue)")) {
                    editor.getInlayModel().getInlineElementsInRange(0, editor.getDocument().getTextLength())
                        .forEach(inlay -> {
                            if (inlay.getRenderer().toString().contains("Point I18n")) {
                                com.intellij.openapi.util.Disposer.dispose(inlay);
                            }
                        });
                    
                    // Триггерим обновление inlay hints
                    com.intellij.psi.PsiDocumentManager psiManager = 
                        com.intellij.psi.PsiDocumentManager.getInstance(project);
                    psiManager.commitDocument(editor.getDocument());
                }
            }
        }
    }
}
