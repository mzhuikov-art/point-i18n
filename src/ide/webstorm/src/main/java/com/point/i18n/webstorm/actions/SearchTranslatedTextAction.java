package com.point.i18n.webstorm.actions;

import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.fileEditor.FileEditorManager;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.Messages;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.psi.PsiFile;
import com.intellij.psi.PsiManager;
import com.point.i18n.webstorm.PointI18nApplicationService;
import com.point.i18n.webstorm.services.CacheService;
import com.point.i18n.webstorm.services.ConfigService;
import com.point.i18n.webstorm.utils.I18nKeyParser;
import org.jetbrains.annotations.NotNull;

import javax.swing.*;
import java.awt.Dimension;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Action for searching translated text in files.
 */
public class SearchTranslatedTextAction extends AnAction {
    
    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        if (project == null) {
            Messages.showErrorDialog("No project found", "Point I18n");
            return;
        }
        
        PointI18nApplicationService appService = PointI18nApplicationService.getInstance();
        CacheService cacheService = appService.getCacheService();
        ConfigService configService = appService.getConfigService();
        
        // Запрашиваем текст для поиска
        String query = JOptionPane.showInputDialog(
            null,
            "Enter text to search in translations:",
            "Point I18n - Search Translated Text",
            JOptionPane.QUESTION_MESSAGE
        );
        
        if (query == null || query.trim().isEmpty()) {
            return;
        }
        
        query = query.trim().toLowerCase();
        String locale = configService.getLocale();
        
        // Загружаем локали если их нет
        if (!cacheService.has(locale)) {
            Messages.showErrorDialog("Locale " + locale + " not loaded. Please fetch locales first.", "Point I18n");
            return;
        }
        
        // Находим ключи с переводами, содержащими искомый текст
        Map<String, String> localeData = cacheService.get(locale);
        Set<String> matchingKeys = new HashSet<>();
        
        if (localeData != null) {
            for (Map.Entry<String, String> entry : localeData.entrySet()) {
                if (entry.getValue() != null && entry.getValue().toLowerCase().contains(query)) {
                    matchingKeys.add(entry.getKey());
                }
            }
        }
        
        if (matchingKeys.isEmpty()) {
            Messages.showInfoMessage("No translations found containing: " + query, "Point I18n");
            return;
        }
        
        // Ищем файлы с этими ключами
        List<SearchResult> results = searchFilesForKeys(project, matchingKeys, locale, cacheService);
        
        if (results.isEmpty()) {
            Messages.showInfoMessage("No files found with matching keys", "Point I18n");
            return;
        }
        
        // Показываем результаты в диалоге
        showResultsDialog(results, query);
    }
    
    private List<SearchResult> searchFilesForKeys(Project project, Set<String> keys, String locale, CacheService cacheService) {
        List<SearchResult> results = new ArrayList<>();
        
        // Ищем файлы в src директории
        VirtualFile baseDir = project.getBaseDir();
        if (baseDir == null) {
            return results;
        }
        
        VirtualFile srcDir = baseDir.findChild("src");
        if (srcDir == null) {
            return results;
        }
        
        // Рекурсивно обходим файлы
        collectFiles(srcDir, results, keys, locale, cacheService, project);
        
        return results;
    }
    
    private void collectFiles(VirtualFile dir, List<SearchResult> results, Set<String> keys, 
                              String locale, CacheService cacheService, Project project) {
        VirtualFile[] children = dir.getChildren();
        for (VirtualFile file : children) {
            if (file.isDirectory()) {
                // Пропускаем node_modules, dist, build и т.д.
                String name = file.getName();
                if (name.equals("node_modules") || name.equals("dist") || name.equals("build") || 
                    name.equals(".git") || name.equals(".next") || name.equals(".nuxt")) {
                    continue;
                }
                collectFiles(file, results, keys, locale, cacheService, project);
            } else {
                String name = file.getName();
                if (name.endsWith(".js") || name.endsWith(".ts") || name.endsWith(".jsx") || 
                    name.endsWith(".tsx") || name.endsWith(".vue") || name.endsWith(".html")) {
                    searchFile(file, results, keys, locale, cacheService, project);
                }
            }
        }
    }
    
    private void searchFile(VirtualFile file, List<SearchResult> results, Set<String> keys,
                           String locale, CacheService cacheService, Project project) {
        try {
            String content = new String(file.contentsToByteArray());
            List<I18nKeyParser.KeyInfo> allKeys = I18nKeyParser.findAllKeys(content);
            
            String[] lines = content.split("\n");
            
            for (I18nKeyParser.KeyInfo keyInfo : allKeys) {
                if (keys.contains(keyInfo.key)) {
                    // Находим номер строки
                    int lineNumber = 0;
                    int currentOffset = 0;
                    for (int i = 0; i < lines.length; i++) {
                        if (keyInfo.startOffset >= currentOffset && 
                            keyInfo.startOffset < currentOffset + lines[i].length() + 1) {
                            lineNumber = i;
                            break;
                        }
                        currentOffset += lines[i].length() + 1;
                    }
                    
                    String translation = cacheService.getTranslation(locale, keyInfo.key);
                    String preview = lines[lineNumber].trim();
                    if (preview.length() > 80) {
                        preview = preview.substring(0, 77) + "...";
                    }
                    
                    results.add(new SearchResult(
                        file.getPath(),
                        lineNumber,
                        keyInfo.key,
                        translation != null ? translation : "",
                        preview
                    ));
                }
            }
        } catch (Exception e) {
            // Игнорируем ошибки чтения файлов
        }
    }
    
    private void showResultsDialog(List<SearchResult> results, String query) {
        // Создаем таблицу с результатами
        String[] columnNames = {"File", "Line", "Key", "Translation", "Preview"};
        Object[][] data = new Object[results.size()][5];
        
        for (int i = 0; i < results.size(); i++) {
            SearchResult result = results.get(i);
            data[i][0] = result.filePath;
            data[i][1] = result.line + 1; // Line numbers are 1-based for display
            data[i][2] = result.key;
            data[i][3] = result.translation;
            data[i][4] = result.preview;
        }
        
        JTable table = new JTable(data, columnNames);
        table.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        
        JScrollPane scrollPane = new JScrollPane(table);
        scrollPane.setPreferredSize(new Dimension(800, 400));
        
        int option = JOptionPane.showConfirmDialog(
            null,
            scrollPane,
            "Search Results: " + query + " (" + results.size() + " results)",
            JOptionPane.OK_CANCEL_OPTION,
            JOptionPane.PLAIN_MESSAGE
        );
        
        if (option == JOptionPane.OK_OPTION) {
            int selectedRow = table.getSelectedRow();
            if (selectedRow >= 0 && selectedRow < results.size()) {
                SearchResult result = results.get(selectedRow);
                Messages.showInfoMessage("File: " + result.filePath + ", Line: " + (result.line + 1), "Point I18n");
                // TODO: Открыть файл на нужной строке через FileEditorManager
            }
        }
    }
    
    private static class SearchResult {
        final String filePath;
        final int line;
        final String key;
        final String translation;
        final String preview;
        
        SearchResult(String filePath, int line, String key, String translation, String preview) {
            this.filePath = filePath;
            this.line = line;
            this.key = key;
            this.translation = translation;
            this.preview = preview;
        }
    }
}

