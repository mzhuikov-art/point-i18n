package com.point.i18n.webstorm.toolwindow;

import com.intellij.openapi.ui.Messages;
import com.point.i18n.webstorm.PointI18nApplicationService;
import com.point.i18n.webstorm.services.*;
import org.jetbrains.annotations.NotNull;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Main panel for Point I18n ToolWindow with full functionality.
 */
public class PointI18nToolWindowPanel extends JPanel {
    private final PointI18nApplicationService appService;
    private final ApiService apiService;
    private final CacheService cacheService;
    private final StorageService storageService;
    private final ConfigService configService;
    private final com.intellij.openapi.project.Project project;
    
    private JLabel statusLabel;
    private JLabel pageLabel;
    private JComboBox<String> localeComboBox;
    private JComboBox<String> projectComboBox;
    private JTextField searchField;
    private JTextField searchPathField;
    private JTextField searchTranslatedField;
    private JTable keysTable;
    private DefaultTableModel keysTableModel;
    private javax.swing.JTree translatedSearchTree;
    private javax.swing.tree.DefaultMutableTreeNode translatedSearchRootNode;
    private JButton createKeyButton;
    private JButton refreshButton;
    private JButton loginButton;
    private JButton logoutButton;
    
    private List<ApiService.KeyData> currentSearchResults = new ArrayList<>();
    private List<TranslatedSearchResult> currentTranslatedSearchResults = new ArrayList<>();
    private int currentPage = 1;
    private int totalPages = 1;
    private String currentSearchQuery = "";
    
    private static class TranslatedSearchResult {
        String filePath;
        int line;
        String key;
        String translation;
        String preview;
        
        TranslatedSearchResult(String filePath, int line, String key, String translation, String preview) {
            this.filePath = filePath;
            this.line = line;
            this.key = key;
            this.translation = translation;
            this.preview = preview;
        }
    }
    
    public PointI18nToolWindowPanel(@NotNull PointI18nApplicationService appService, @NotNull com.intellij.openapi.project.Project project) {
        this.appService = appService;
        this.apiService = appService.getApiService();
        this.cacheService = appService.getCacheService();
        this.storageService = appService.getStorageService();
        this.configService = appService.getConfigService();
        this.project = project;
        
        initializeUI();
        updateView();
    }
    
    private void initializeUI() {
        setLayout(new BorderLayout());
        setBorder(BorderFactory.createEmptyBorder(8, 8, 8, 8));
        
        // Create tabs with better styling
        JTabbedPane tabbedPane = new JTabbedPane();
        tabbedPane.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 12));
        
        // Tab 1: Authentication
        JPanel authTab = createAuthTab();
        tabbedPane.addTab("Auth", authTab);
        
        // Tab 2: Settings
        JPanel settingsTab = createSettingsTab();
        tabbedPane.addTab("Settings", settingsTab);
        
        // Tab 3: Keys Management
        JPanel keysTab = createKeysTab();
        tabbedPane.addTab("Keys", keysTab);
        
        // Tab 4: Actions
        JPanel actionsTab = createActionsTab();
        tabbedPane.addTab("Actions", actionsTab);
        
        // Tab 5: Search by Translation
        JPanel searchTab = createSearchTab();
        tabbedPane.addTab("Search", searchTab);
        
        add(tabbedPane, BorderLayout.CENTER);
        
        // Status bar at bottom with project name
        JPanel statusPanel = new JPanel(new BorderLayout());
        statusPanel.setBorder(BorderFactory.createEmptyBorder(5, 5, 5, 5));
        statusLabel = new JLabel("📁 Project: " + configService.getProjectKey());
        statusLabel.setBorder(BorderFactory.createEmptyBorder(2, 5, 2, 5));
        statusPanel.add(statusLabel, BorderLayout.CENTER);
        add(statusPanel, BorderLayout.SOUTH);
    }
    
    private JPanel createAuthTab() {
        JPanel panel = new JPanel(new BorderLayout());
        panel.setBorder(BorderFactory.createEmptyBorder(16, 16, 16, 16));
        
        JPanel contentPanel = new JPanel();
        contentPanel.setLayout(new BoxLayout(contentPanel, BoxLayout.Y_AXIS));
        
        // Title with icon
        JLabel title = new JLabel("🔐 Авторизация");
        title.setFont(title.getFont().deriveFont(Font.BOLD, 15f));
        title.setAlignmentX(Component.LEFT_ALIGNMENT);
        contentPanel.add(title);
        contentPanel.add(Box.createVerticalStrut(16));
        
        // Login button with modern styling
        loginButton = new JButton("🔑 Войти");
        styleButton(loginButton, true);
        loginButton.setAlignmentX(Component.LEFT_ALIGNMENT);
        loginButton.setMaximumSize(new Dimension(Integer.MAX_VALUE, 35));
        loginButton.addActionListener(e -> performLogin());
        contentPanel.add(loginButton);
        contentPanel.add(Box.createVerticalStrut(12));
        
        // Logout button
        logoutButton = new JButton("🚪 Выйти");
        styleButton(logoutButton, false);
        logoutButton.setAlignmentX(Component.LEFT_ALIGNMENT);
        logoutButton.setMaximumSize(new Dimension(Integer.MAX_VALUE, 35));
        logoutButton.addActionListener(e -> performLogout());
        contentPanel.add(logoutButton);
        
        panel.add(contentPanel, BorderLayout.NORTH);
        
        return panel;
    }
    
    private void styleButton(JButton button, boolean isPrimary) {
        button.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 13));
        button.setBorderPainted(false);
        button.setFocusPainted(false);
        button.setCursor(new Cursor(Cursor.HAND_CURSOR));
        
        if (isPrimary) {
            button.setOpaque(true);
        }
    }
    
    private void updateLocaleCombo() {
        if (localeComboBox == null) {
            return;
        }

        String currentLocale = configService.getLocale();
        if ("cn".equals(currentLocale) && !configService.isCnProject()) {
            currentLocale = "ru";
            configService.setLocale("ru");
        }

        java.awt.event.ActionListener[] listeners = localeComboBox.getActionListeners();
        for (java.awt.event.ActionListener listener : listeners) {
            localeComboBox.removeActionListener(listener);
        }

        localeComboBox.removeAllItems();
        localeComboBox.addItem("🇷🇺 ru");
        localeComboBox.addItem("🇬🇧 en");
        localeComboBox.addItem("🇺🇿 uz");
        if (configService.isCnProject()) {
            localeComboBox.addItem("🇨🇳 cn");
        }

        String selected = "🇷🇺 ru";
        if ("en".equals(currentLocale)) {
            selected = "🇬🇧 en";
        } else if ("uz".equals(currentLocale)) {
            selected = "🇺🇿 uz";
        } else if ("cn".equals(currentLocale)) {
            selected = "🇨🇳 cn";
        }
        localeComboBox.setSelectedItem(selected);

        for (java.awt.event.ActionListener listener : listeners) {
            localeComboBox.addActionListener(listener);
        }
    }

    private JPanel createSettingsTab() {
        JPanel panel = new JPanel(new BorderLayout());
        panel.setBorder(BorderFactory.createEmptyBorder(16, 16, 16, 16));
        
        JPanel contentPanel = new JPanel();
        contentPanel.setLayout(new BoxLayout(contentPanel, BoxLayout.Y_AXIS));
        
        // Title
        JLabel title = new JLabel("⚙️ Настройки");
        title.setFont(title.getFont().deriveFont(Font.BOLD, 15f));
        title.setAlignmentX(Component.LEFT_ALIGNMENT);
        contentPanel.add(title);
        contentPanel.add(Box.createVerticalStrut(16));
        
        // Locale selector with modern styling
        JLabel localeLabel = new JLabel("Основной язык");
        localeLabel.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 12));
        localeLabel.setAlignmentX(Component.LEFT_ALIGNMENT);
        contentPanel.add(localeLabel);
        contentPanel.add(Box.createVerticalStrut(6));
        
        localeComboBox = new JComboBox<>();
        updateLocaleCombo();
        localeComboBox.setAlignmentX(Component.LEFT_ALIGNMENT);
        localeComboBox.setMaximumSize(new Dimension(Integer.MAX_VALUE, 30));
        localeComboBox.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 13));
        localeComboBox.addActionListener(e -> {
            String selected = (String) localeComboBox.getSelectedItem();
            if (selected != null) {
                String locale = selected.substring(selected.length() - 2);
                configService.setLocale(locale);
                refreshSearch();
            }
        });
        contentPanel.add(localeComboBox);
        contentPanel.add(Box.createVerticalStrut(16));
        
        // Project selector
        JLabel projectLabel = new JLabel("Проект");
        projectLabel.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 12));
        projectLabel.setAlignmentX(Component.LEFT_ALIGNMENT);
        contentPanel.add(projectLabel);
        contentPanel.add(Box.createVerticalStrut(6));
        
        projectComboBox = new JComboBox<>();
        projectComboBox.setEditable(true);
        projectComboBox.setAlignmentX(Component.LEFT_ALIGNMENT);
        projectComboBox.setMaximumSize(new Dimension(Integer.MAX_VALUE, 30));
        projectComboBox.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 13));
        projectComboBox.addActionListener(e -> {
            String projectKey = (String) projectComboBox.getSelectedItem();
            if (projectKey != null && !projectKey.isEmpty()) {
                configService.setProjectKey(projectKey);
                if ("cn".equals(configService.getLocale()) && !configService.isCnProject()) {
                    configService.setLocale("ru");
                }
                updateLocaleCombo();
                statusLabel.setText("📁 Project: " + projectKey);
                refreshSearch();
            }
        });
        contentPanel.add(projectComboBox);
        
        panel.add(contentPanel, BorderLayout.NORTH);
        
        return panel;
    }
    
    private JPanel createActionsTab() {
        JPanel panel = new JPanel(new BorderLayout());
        panel.setBorder(BorderFactory.createEmptyBorder(16, 16, 16, 16));
        
        JPanel contentPanel = new JPanel();
        contentPanel.setLayout(new BoxLayout(contentPanel, BoxLayout.Y_AXIS));
        
        // Title
        JLabel title = new JLabel("⚡ Действия");
        title.setFont(title.getFont().deriveFont(Font.BOLD, 15f));
        title.setAlignmentX(Component.LEFT_ALIGNMENT);
        contentPanel.add(title);
        contentPanel.add(Box.createVerticalStrut(16));
        
        refreshButton = new JButton("🔄 Обновить переводы");
        styleButton(refreshButton, true);
        refreshButton.setAlignmentX(Component.LEFT_ALIGNMENT);
        refreshButton.setMaximumSize(new Dimension(Integer.MAX_VALUE, 35));
        refreshButton.addActionListener(e -> performRefresh());
        contentPanel.add(refreshButton);
        contentPanel.add(Box.createVerticalStrut(12));
        
        // Create key button
        createKeyButton = new JButton("➕ Создать ключ");
        styleButton(createKeyButton, true);
        createKeyButton.setAlignmentX(Component.LEFT_ALIGNMENT);
        createKeyButton.setMaximumSize(new Dimension(Integer.MAX_VALUE, 35));
        createKeyButton.addActionListener(e -> showCreateKeyDialog());
        contentPanel.add(createKeyButton);
        
        panel.add(contentPanel, BorderLayout.NORTH);
        
        return panel;
    }
    
    private JPanel createKeysTab() {
        JPanel panel = new JPanel(new BorderLayout());
        panel.setBorder(BorderFactory.createEmptyBorder(5, 5, 5, 5));
        
        // Top section with search
        JPanel topSection = new JPanel(new BorderLayout(5, 5));
        topSection.setBorder(BorderFactory.createTitledBorder("Поиск ключей"));
        
        JPanel searchPanel = new JPanel(new BorderLayout(5, 0));
        searchPanel.add(new JLabel("Запрос:"), BorderLayout.WEST);
        searchField = new JTextField();
        searchField.addActionListener(e -> performSearch());
        searchPanel.add(searchField, BorderLayout.CENTER);
        JButton searchButton = new JButton("Искать");
        searchButton.addActionListener(e -> performSearch());
        searchPanel.add(searchButton, BorderLayout.EAST);
        
        topSection.add(searchPanel, BorderLayout.CENTER);
        panel.add(topSection, BorderLayout.NORTH);
        
        // Keys table
        String[] columnNames = {"Key", "RU", "EN", "UZ", "CN"};
        keysTableModel = new DefaultTableModel(columnNames, 0) {
            @Override
            public boolean isCellEditable(int row, int column) {
                return false;
            }
        };
        keysTable = new JTable(keysTableModel);
        keysTable.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        keysTable.getSelectionModel().addListSelectionListener(e -> {
            if (!e.getValueIsAdjusting()) {
                int selectedRow = keysTable.getSelectedRow();
                if (selectedRow >= 0) {
                    showEditKeyDialog(selectedRow);
                }
            }
        });
        
        JScrollPane scrollPane = new JScrollPane(keysTable);
        scrollPane.setBorder(BorderFactory.createTitledBorder("Ключи"));
        panel.add(scrollPane, BorderLayout.CENTER);
        
        // Pagination panel
        JPanel paginationPanel = new JPanel(new FlowLayout(FlowLayout.CENTER));
        JButton prevButton = new JButton("◀ Предыдущая");
        prevButton.addActionListener(e -> {
            if (currentPage > 1) {
                currentPage--;
                performSearch(true); // true = это пагинация
            }
        });
        paginationPanel.add(prevButton);
        
        pageLabel = new JLabel("Страница: " + currentPage + " / " + totalPages);
        paginationPanel.add(pageLabel);
        
        JButton nextButton = new JButton("Следующая ▶");
        nextButton.addActionListener(e -> {
            if (currentPage < totalPages) {
                currentPage++;
                performSearch(true); // true = это пагинация
            }
        });
        paginationPanel.add(nextButton);
        panel.add(paginationPanel, BorderLayout.SOUTH);
        
        return panel;
    }
    
    private JPanel createSearchTab() {
        JPanel panel = new JPanel(new BorderLayout());
        panel.setBorder(BorderFactory.createEmptyBorder(5, 5, 5, 5));
        
        // Top section with search controls
        JPanel topSection = new JPanel();
        topSection.setLayout(new BoxLayout(topSection, BoxLayout.Y_AXIS));
        
        // Search query panel
        JPanel searchQueryPanel = new JPanel(new BorderLayout(5, 0));
        searchQueryPanel.add(new JLabel("Текст перевода:"), BorderLayout.WEST);
        searchTranslatedField = new JTextField();
        searchQueryPanel.add(searchTranslatedField, BorderLayout.CENTER);
        JButton searchTranslatedButton = new JButton("Найти");
        searchTranslatedButton.addActionListener(e -> {
            String query = searchTranslatedField.getText().trim();
            String searchPath = searchPathField.getText().trim();
            if (!query.isEmpty()) {
                performSearchTranslatedText(query, searchPath);
            }
        });
        searchQueryPanel.add(searchTranslatedButton, BorderLayout.EAST);
        topSection.add(searchQueryPanel);
        
        topSection.add(Box.createVerticalStrut(8));
        
        // Search path input
        JPanel searchPathPanel = new JPanel(new BorderLayout(5, 0));
        searchPathPanel.add(new JLabel("Путь поиска:"), BorderLayout.WEST);
        searchPathField = new JTextField(configService.getSearchPath());
        searchPathPanel.add(searchPathField, BorderLayout.CENTER);
        topSection.add(searchPathPanel);
        
        // Scrollable top section
        JScrollPane topScrollPane = new JScrollPane(topSection);
        topScrollPane.setPreferredSize(new Dimension(0, 150));
        topScrollPane.setBorder(BorderFactory.createTitledBorder("Параметры поиска"));
        
        panel.add(topScrollPane, BorderLayout.NORTH);
        
        // Translated search results tree
        translatedSearchRootNode = new javax.swing.tree.DefaultMutableTreeNode("Results");
        translatedSearchTree = new javax.swing.JTree(translatedSearchRootNode);
        translatedSearchTree.setRootVisible(false);
        translatedSearchTree.setShowsRootHandles(true);
        translatedSearchTree.addTreeSelectionListener(e -> {
            javax.swing.tree.DefaultMutableTreeNode node = (javax.swing.tree.DefaultMutableTreeNode) translatedSearchTree.getLastSelectedPathComponent();
            if (node != null && node.getUserObject() instanceof TranslatedSearchResult) {
                TranslatedSearchResult result = (TranslatedSearchResult) node.getUserObject();
                openFileAtLine(result.filePath, result.line);
            }
        });
        
        // Custom renderer for tree
        translatedSearchTree.setCellRenderer(new javax.swing.tree.DefaultTreeCellRenderer() {
            @Override
            public java.awt.Component getTreeCellRendererComponent(
                    javax.swing.JTree tree, Object value, boolean sel, boolean expanded,
                    boolean leaf, int row, boolean hasFocus) {
                super.getTreeCellRendererComponent(tree, value, sel, expanded, leaf, row, hasFocus);
                if (value instanceof javax.swing.tree.DefaultMutableTreeNode) {
                    Object userObject = ((javax.swing.tree.DefaultMutableTreeNode) value).getUserObject();
                    if (userObject instanceof TranslatedSearchResult) {
                        TranslatedSearchResult result = (TranslatedSearchResult) userObject;
                        // Формат: "Перевод Line:номер key preview"
                        String displayText = String.format("%s Line:%d %s %s", 
                            result.translation.isEmpty() ? "[No translation]" : result.translation,
                            result.line + 1,
                            result.key,
                            result.preview);
                        setText(displayText);
                        setIcon(null);
                    } else if (userObject instanceof String && !userObject.equals("Results")) {
                        setText((String) userObject);
                        setIcon(null);
                    }
                }
                return this;
            }
        });
        
        JScrollPane translatedSearchScrollPane = new JScrollPane(translatedSearchTree);
        translatedSearchScrollPane.setBorder(BorderFactory.createTitledBorder("Результаты поиска"));
        
        panel.add(translatedSearchScrollPane, BorderLayout.CENTER);
        
        return panel;
    }
    
    private void updateView() {
        String token = storageService.getAccessToken();
        boolean isAuthenticated = token != null && !token.isEmpty();
        
        loginButton.setEnabled(!isAuthenticated);
        logoutButton.setEnabled(isAuthenticated);
        refreshButton.setEnabled(isAuthenticated);
        createKeyButton.setEnabled(isAuthenticated);
        searchField.setEnabled(isAuthenticated);
        
        if (isAuthenticated) {
            loadProjects();
            // Автоматически загружаем локали при открытии плагина
            loadLocalesIfNeeded();
            updateStats();
        } else {
            statusLabel.setText("Status: Not authenticated");
            keysTableModel.setRowCount(0);
        }
    }
    
    private void loadLocalesIfNeeded() {
        // Проверяем, нужно ли загружать локали
        boolean needLoad = false;
        List<String> supportedLocales = configService.getLocales();
        List<String> optionalLocales = Arrays.asList("cn");
        
        for (String locale : supportedLocales) {
            if (!cacheService.has(locale)) {
                needLoad = true;
                break;
            }
        }
        
        if (needLoad) {
            // Обновляем статус в UI потоке
            SwingUtilities.invokeLater(() -> {
                statusLabel.setText("Status: Loading locales...");
            });
            
            // Загружаем локали в фоновом режиме
            new Thread(() -> {
                try {
                    String projectKey = configService.getProjectKey();
                    
                    for (String locale : supportedLocales) {
                        if (!cacheService.has(locale)) {
                            try {
                                Map<String, String> locales = apiService.fetchLocales(locale, projectKey);
                                cacheService.set(locale, locales);
                            } catch (Exception ex) {
                                System.err.println("Failed to fetch " + locale + ": " + ex.getMessage());
                                if (optionalLocales.contains(locale)) {
                                    cacheService.set(locale, new HashMap<>());
                                }
                            }
                        }
                    }
                    
                    // Обновляем UI в EDT
                    SwingUtilities.invokeLater(() -> {
                        updateStats();
                        statusLabel.setText("Status: Locales loaded");
                    });
                } catch (Exception ex) {
                    System.err.println("Failed to load locales: " + ex.getMessage());
                    SwingUtilities.invokeLater(() -> {
                        statusLabel.setText("Status: Failed to load locales");
                    });
                }
            }).start();
        }
    }
    
    private void loadProjects() {
        String defaultProjectKey = "point-frontend";
        
        try {
            ApiService.ProjectsResponse response = apiService.fetchProjects();
            projectComboBox.removeAllItems();
            
            // Всегда добавляем дефолтный проект первым
            projectComboBox.addItem(defaultProjectKey);
            
            // Добавляем остальные проекты (кроме дефолтного если он уже есть)
            if (response.data != null) {
                for (ApiService.Project project : response.data) {
                    if (!defaultProjectKey.equals(project.key)) {
                        projectComboBox.addItem(project.key);
                    }
                }
            }
            
            // Получаем сохраненный проект
            String currentProject = configService.getProjectKey();
            
            // Если ничего не сохранено или сохраненный проект не найден, используем дефолтный
            if (currentProject == null || currentProject.isEmpty()) {
                currentProject = defaultProjectKey;
                configService.setProjectKey(defaultProjectKey);
            }
            
            // Устанавливаем выбранный проект
            projectComboBox.setSelectedItem(currentProject);
            
            // Проверяем что проект действительно установился
            if (projectComboBox.getSelectedItem() == null || 
                !currentProject.equals(projectComboBox.getSelectedItem())) {
                // Если не получилось установить, используем дефолтный
                projectComboBox.setSelectedItem(defaultProjectKey);
                configService.setProjectKey(defaultProjectKey);
            }
            
            System.out.println("Selected project: " + projectComboBox.getSelectedItem());
            statusLabel.setText("📁 Project: " + projectComboBox.getSelectedItem());
        } catch (Exception e) {
            System.err.println("Failed to load projects: " + e.getMessage());
            e.printStackTrace();
            
            // При ошибке устанавливаем дефолтный проект
            projectComboBox.removeAllItems();
            projectComboBox.addItem(defaultProjectKey);
            projectComboBox.setSelectedItem(defaultProjectKey);
            configService.setProjectKey(defaultProjectKey);
        }
    }
    
    private void updateStats() {
        Map<String, String> ruData = cacheService.get("ru");
        Map<String, String> enData = cacheService.get("en");
        Map<String, String> uzData = cacheService.get("uz");
        Map<String, String> cnData = cacheService.get("cn");
        
        int ruCount = ruData != null ? ruData.size() : 0;
        int enCount = enData != null ? enData.size() : 0;
        int uzCount = uzData != null ? uzData.size() : 0;
        int cnCount = cnData != null ? cnData.size() : 0;
        
        statusLabel.setText(String.format("Status: RU: %d, EN: %d, UZ: %d, CN: %d", ruCount, enCount, uzCount, cnCount));
    }
    
    private void performLogin() {
        // Проверяем конфигурацию
        boolean needConfig = false;
        try {
            configService.getApiBaseUrl();
        } catch (IllegalStateException e) {
            needConfig = true;
        }
        
        try {
            configService.getLocalizationApiBaseUrl();
        } catch (IllegalStateException e) {
            needConfig = true;
        }
        
        if (needConfig) {
            Messages.showErrorDialog("Сначала настройте API URLs через меню Tools", "Point I18n");
            return;
        }
        
        // Запрашиваем username
        String username = JOptionPane.showInputDialog(
            this,
            "Введите имя пользователя:",
            "Point I18n - Вход",
            JOptionPane.QUESTION_MESSAGE
        );
        
        if (username == null || username.trim().isEmpty()) {
            return;
        }
        
        // Запрашиваем password
        JPasswordField passwordField = new JPasswordField();
        int option = JOptionPane.showConfirmDialog(
            this,
            passwordField,
            "Введите пароль:",
            JOptionPane.OK_CANCEL_OPTION,
            JOptionPane.QUESTION_MESSAGE
        );
        
        if (option != JOptionPane.OK_OPTION) {
            return;
        }
        
        String password = new String(passwordField.getPassword());
        if (password.trim().isEmpty()) {
            Messages.showErrorDialog("Пароль не может быть пустым", "Point I18n");
            return;
        }
        
        try {
            ApiService.AuthResponse authResponse = apiService.authenticate(username, password);
            storageService.saveTokens(authResponse);
            Messages.showInfoMessage("Вход выполнен успешно!", "Point I18n");
            updateView();
            performRefresh();
        } catch (Exception ex) {
            Messages.showErrorDialog("Ошибка аутентификации: " + ex.getMessage(), "Point I18n");
        }
    }
    
    private void performLogout() {
        storageService.deleteTokens();
        cacheService.clear();
        Messages.showInfoMessage("Выход выполнен", "Point I18n");
        updateView();
    }
    
    private void performRefresh() {
        String token = storageService.getAccessToken();
        if (token == null || token.isEmpty()) {
            Messages.showErrorDialog("Сначала войдите в систему", "Point I18n");
            return;
        }
        
        try {
            String projectKey = configService.getProjectKey();
            List<String> supportedLocales = configService.getLocales();
            List<String> optionalLocales = Arrays.asList("cn");
            
            statusLabel.setText("Status: Fetching locales...");
            
            for (String locale : supportedLocales) {
                try {
                    Map<String, String> locales = apiService.fetchLocales(locale, projectKey);
                    cacheService.set(locale, locales);
                } catch (Exception ex) {
                    System.err.println("Failed to fetch " + locale + ": " + ex.getMessage());
                    if (optionalLocales.contains(locale)) {
                        cacheService.set(locale, new HashMap<>());
                    }
                }
            }
            
            updateStats();
            refreshSearch();
            Messages.showInfoMessage("Локали обновлены!", "Point I18n");
        } catch (Exception ex) {
            Messages.showErrorDialog("Ошибка обновления: " + ex.getMessage(), "Point I18n");
        }
    }
    
    private void performSearch() {
        performSearch(false);
    }
    
    private void performSearch(boolean isPagination) {
        String query = isPagination ? currentSearchQuery : searchField.getText().trim();
        
        // Сбрасываем страницу только если запрос изменился и это не пагинация
        if (!isPagination && !query.equals(currentSearchQuery)) {
            currentSearchQuery = query;
            currentPage = 1;
        } else if (!isPagination) {
            currentSearchQuery = query;
        }
        
        String token = storageService.getAccessToken();
        if (token == null || token.isEmpty()) {
            // Search in cache
            searchInCache(query);
            return;
        }
        
        try {
            String projectKey = configService.getProjectKey();
            ApiService.SearchKeysResponse response = apiService.searchKeys(query, projectKey, currentPage, 10);
            
            currentSearchResults = response.data != null ? response.data : new ArrayList<>();
            totalPages = response.totalPages;
            
            updateKeysTable();
        } catch (Exception ex) {
            // Fallback to cache search
            searchInCache(query);
        }
    }
    
    private void refreshSearch() {
        performSearch();
    }
    
    private void searchInCache(String query) {
        List<CacheService.KeySearchResult> results = cacheService.searchKeys(query);
        currentSearchResults = new ArrayList<>();
        
        for (CacheService.KeySearchResult result : results) {
            ApiService.KeyData keyData = new ApiService.KeyData();
            keyData.key = result.key;
            keyData.translations = new ApiService.Translations();
            keyData.translations.ru = result.translations.getOrDefault("ru", "");
            keyData.translations.en = result.translations.getOrDefault("en", "");
            keyData.translations.uz = result.translations.getOrDefault("uz", "");
            keyData.translations.cn = result.translations.getOrDefault("cn", "");
            currentSearchResults.add(keyData);
        }
        
        totalPages = (int) Math.ceil(currentSearchResults.size() / 10.0);
        updateKeysTable();
    }
    
    private void updateKeysTable() {
        keysTableModel.setRowCount(0);
        
        int startIndex = (currentPage - 1) * 10;
        int endIndex = Math.min(startIndex + 10, currentSearchResults.size());
        
        for (int i = startIndex; i < endIndex; i++) {
            ApiService.KeyData keyData = currentSearchResults.get(i);
            keysTableModel.addRow(new Object[]{
                keyData.key,
                keyData.translations != null ? keyData.translations.ru : "",
                keyData.translations != null ? keyData.translations.en : "",
                keyData.translations != null ? keyData.translations.uz : "",
                keyData.translations != null ? keyData.translations.cn : ""
            });
        }
        
        // Обновляем label пагинации
        if (pageLabel != null) {
            pageLabel.setText("Страница: " + currentPage + " / " + totalPages);
        }
    }
    
    private void showCreateKeyDialog() {
        Window parentWindow = SwingUtilities.getWindowAncestor(this);
        CreateKeyDialog dialog = new CreateKeyDialog(parentWindow, apiService, cacheService, configService, storageService);
        dialog.setVisible(true);
        if (dialog.isSuccess()) {
            refreshSearch();
            updateStats();
        }
    }
    
    private void showEditKeyDialog(int row) {
        if (row < 0 || row >= keysTableModel.getRowCount()) {
            return;
        }
        
        String key = (String) keysTableModel.getValueAt(row, 0);
        String ru = (String) keysTableModel.getValueAt(row, 1);
        String en = (String) keysTableModel.getValueAt(row, 2);
        String uz = (String) keysTableModel.getValueAt(row, 3);
        String cn = (String) keysTableModel.getValueAt(row, 4);
        
        Window parentWindow = SwingUtilities.getWindowAncestor(this);
        EditKeyDialog dialog = new EditKeyDialog(parentWindow, key, ru, en, uz, cn, apiService, cacheService, configService, storageService);
        dialog.setVisible(true);
        if (dialog.isSuccess()) {
            refreshSearch();
            updateStats();
        }
    }
    
    private void performSearchTranslatedText(String query, String searchPath) {
        String locale = configService.getLocale();
        
        // Сохраняем путь поиска
        if (searchPath != null && !searchPath.trim().isEmpty()) {
            configService.setSearchPath(searchPath.trim());
        }
        
        // Загружаем локали если их нет
        if (!cacheService.has(locale)) {
            Messages.showErrorDialog("Локаль " + locale + " не загружена. Сначала обновите переводы.", "Point I18n");
            return;
        }
        
        // Находим ключи с переводами, содержащими искомый текст
        Map<String, String> localeData = cacheService.get(locale);
        Set<String> matchingKeys = new HashSet<>();
        
        if (localeData != null) {
            String queryLower = query.toLowerCase();
            for (Map.Entry<String, String> entry : localeData.entrySet()) {
                if (entry.getValue() != null && entry.getValue().toLowerCase().contains(queryLower)) {
                    matchingKeys.add(entry.getKey());
                }
            }
        }
        
        if (matchingKeys.isEmpty()) {
            translatedSearchRootNode.removeAllChildren();
            ((javax.swing.tree.DefaultTreeModel) translatedSearchTree.getModel()).reload();
            currentTranslatedSearchResults.clear();
            Messages.showInfoMessage("Не найдено переводов, содержащих: " + query, "Point I18n");
            return;
        }
        
        // Ищем файлы с этими ключами в проекте
        searchFilesForKeys(matchingKeys, locale, searchPath);
    }
    
    private void searchFilesForKeys(Set<String> matchingKeys, String locale, String searchPath) {
        currentTranslatedSearchResults.clear();
        translatedSearchRootNode.removeAllChildren();
        
        try {
            if (project == null) {
                Messages.showErrorDialog("Проект не найден", "Point I18n");
                return;
            }
            
            // Получаем базовую директорию проекта
            com.intellij.openapi.vfs.VirtualFile baseDir = project.getBaseDir();
            if (baseDir == null) {
                // Пробуем альтернативный способ получения базовой директории
                String basePath = project.getBasePath();
                if (basePath != null && !basePath.isEmpty()) {
                    baseDir = com.intellij.openapi.vfs.LocalFileSystem.getInstance().findFileByPath(basePath);
                }
            }
            
            if (baseDir == null || !baseDir.exists()) {
                String projectName = project.getName();
                String basePath = project.getBasePath();
                Messages.showErrorDialog(
                    "Базовая директория проекта не найдена.\n" +
                    "Проект: " + projectName + "\n" +
                    "Базовый путь: " + (basePath != null ? basePath : "null"),
                    "Point I18n"
                );
                return;
            }
            
            String searchPathNormalized = (searchPath != null && !searchPath.trim().isEmpty()) 
                ? searchPath.trim() 
                : "src";
            
            // Ищем директорию для поиска
            com.intellij.openapi.vfs.VirtualFile searchDir = baseDir.findFileByRelativePath(searchPathNormalized);
            if (searchDir == null) {
                // Пробуем найти как абсолютный путь
                java.io.File searchPathFile = new java.io.File(baseDir.getPath(), searchPathNormalized);
                if (searchPathFile.exists()) {
                    searchDir = com.intellij.openapi.vfs.LocalFileSystem.getInstance().findFileByPath(searchPathFile.getAbsolutePath());
                }
            }
            
            if (searchDir == null || !searchDir.exists()) {
                Messages.showErrorDialog("Путь поиска не найден: " + searchPathNormalized + "\nБазовая директория: " + baseDir.getPath(), "Point I18n");
                return;
            }
            
            System.out.println("Searching in: " + searchDir.getPath() + " for " + matchingKeys.size() + " keys");
            
            // Рекурсивно обходим файлы
            collectFilesWithKeys(searchDir, matchingKeys, locale, baseDir.getPath());
            
            System.out.println("Found " + currentTranslatedSearchResults.size() + " occurrences");
            
            // Обновляем дерево результатов
            updateTranslatedSearchTree();
            
            if (currentTranslatedSearchResults.isEmpty()) {
                Messages.showInfoMessage("Файлы с подходящими ключами не найдены. Поиск в: " + searchDir.getPath(), "Point I18n");
            } else {
                Messages.showInfoMessage("Найдено " + currentTranslatedSearchResults.size() + " совпадений", "Point I18n");
            }
        } catch (Exception e) {
            e.printStackTrace();
            Messages.showErrorDialog("Ошибка поиска файлов: " + e.getMessage() + "\n" + e.getClass().getName(), "Point I18n");
        }
    }
    
    private void collectFilesWithKeys(com.intellij.openapi.vfs.VirtualFile dir, Set<String> matchingKeys, String locale, String basePath) {
        try {
            com.intellij.openapi.vfs.VirtualFile[] children = dir.getChildren();
            for (com.intellij.openapi.vfs.VirtualFile file : children) {
                if (file.isDirectory()) {
                    String name = file.getName();
                    if (name.equals("node_modules") || name.equals("dist") || name.equals("build") || 
                        name.equals(".git") || name.equals(".next") || name.equals(".nuxt")) {
                        continue;
                    }
                    collectFilesWithKeys(file, matchingKeys, locale, basePath);
                } else {
                    String name = file.getName();
                    if (name.endsWith(".js") || name.endsWith(".ts") || name.endsWith(".jsx") || 
                        name.endsWith(".tsx") || name.endsWith(".vue") || name.endsWith(".html")) {
                        searchFileForKeys(file, matchingKeys, locale, basePath);
                    }
                }
            }
        } catch (Exception e) {
            // Игнорируем ошибки доступа к файлам
        }
    }
    
    private void searchFileForKeys(com.intellij.openapi.vfs.VirtualFile file, Set<String> matchingKeys, String locale, String basePath) {
        try {
            // Проверяем, что файл существует и доступен
            if (!file.exists() || file.isDirectory()) {
                return;
            }
            
            String content = new String(file.contentsToByteArray(), java.nio.charset.StandardCharsets.UTF_8);
            String[] lines = content.split("\n", -1); // -1 чтобы сохранить пустые строки в конце
            
            // Используем паттерн для поиска i18n ключей (более гибкий)
            // Поддерживаем: $t('key'), $t("key"), $t(`key`), i18n.t('key'), t('key')
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(
                "(?:\\$t|i18n\\.t|\\bt)\\s*\\(\\s*([\"'`])([^\"'`]+)\\1\\s*\\)"
            );
            java.util.regex.Matcher matcher = pattern.matcher(content);
            
            int foundCount = 0;
            while (matcher.find()) {
                String key = matcher.group(2);
                if (matchingKeys.contains(key)) {
                    int matchIndex = matcher.start();
                    // Подсчитываем строку правильно
                    int lineNumber = 0;
                    int currentPos = 0;
                    for (int i = 0; i < lines.length; i++) {
                        int lineEnd = currentPos + lines[i].length();
                        if (matchIndex >= currentPos && matchIndex < lineEnd) {
                            lineNumber = i;
                            break;
                        }
                        currentPos = lineEnd + 1; // +1 для \n
                    }
                    
                    String lineText = lineNumber < lines.length ? lines[lineNumber] : "";
                    
                    String preview = lineText.trim();
                    if (preview.length() > 80) {
                        preview = preview.substring(0, 77) + "...";
                    }
                    
                    String translation = cacheService.getTranslation(locale, key);
                    
                    // Получаем относительный путь
                    String filePath = file.getPath();
                    String relativePath = filePath;
                    if (filePath.startsWith(basePath)) {
                        relativePath = filePath.substring(basePath.length());
                        if (relativePath.startsWith("/")) {
                            relativePath = relativePath.substring(1);
                        }
                    }
                    
                    currentTranslatedSearchResults.add(new TranslatedSearchResult(
                        relativePath,
                        lineNumber,
                        key,
                        translation != null ? translation : "",
                        preview
                    ));
                    foundCount++;
                }
            }
            
            if (foundCount > 0) {
                System.out.println("Found " + foundCount + " matches in " + file.getName());
            }
        } catch (Exception e) {
            System.err.println("Error reading file " + file.getPath() + ": " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    private void updateTranslatedSearchTree() {
        translatedSearchRootNode.removeAllChildren();
        
        // Группируем результаты по файлам
        Map<String, List<TranslatedSearchResult>> groupedByFile = new java.util.HashMap<>();
        for (TranslatedSearchResult result : currentTranslatedSearchResults) {
            groupedByFile.computeIfAbsent(result.filePath, k -> new ArrayList<>()).add(result);
        }
        
        // Сортируем файлы по имени
        List<String> sortedFiles = new ArrayList<>(groupedByFile.keySet());
        sortedFiles.sort(String::compareTo);
        
        // Создаем узлы дерева
        for (String filePath : sortedFiles) {
            javax.swing.tree.DefaultMutableTreeNode fileNode = new javax.swing.tree.DefaultMutableTreeNode(filePath);
            List<TranslatedSearchResult> results = groupedByFile.get(filePath);
            
            // Сортируем результаты по строке
            results.sort((a, b) -> Integer.compare(a.line, b.line));
            
            for (TranslatedSearchResult result : results) {
                javax.swing.tree.DefaultMutableTreeNode resultNode = new javax.swing.tree.DefaultMutableTreeNode(result);
                fileNode.add(resultNode);
            }
            
            translatedSearchRootNode.add(fileNode);
        }
        
        // Обновляем дерево
        ((javax.swing.tree.DefaultTreeModel) translatedSearchTree.getModel()).reload();
        
        // Разворачиваем все узлы
        for (int i = 0; i < translatedSearchTree.getRowCount(); i++) {
            translatedSearchTree.expandRow(i);
        }
    }
    
    private com.intellij.openapi.vfs.VirtualFile findFileRecursively(com.intellij.openapi.vfs.VirtualFile dir, String fileName, String pathHint) {
        try {
            com.intellij.openapi.vfs.VirtualFile[] children = dir.getChildren();
            for (com.intellij.openapi.vfs.VirtualFile child : children) {
                if (child.isDirectory()) {
                    com.intellij.openapi.vfs.VirtualFile found = findFileRecursively(child, fileName, pathHint);
                    if (found != null) {
                        return found;
                    }
                } else if (child.getName().equals(fileName) && child.getPath().contains(pathHint)) {
                    return child;
                }
            }
        } catch (Exception e) {
            // Игнорируем ошибки
        }
        return null;
    }
    
    private void openFileAtLine(String filePath, int line) {
        try {
            if (project == null) {
                return;
            }
            
            // Получаем базовую директорию проекта
            com.intellij.openapi.vfs.VirtualFile baseDir = project.getBaseDir();
            if (baseDir == null) {
                // Пробуем альтернативный способ
                String basePath = project.getBasePath();
                if (basePath != null && !basePath.isEmpty()) {
                    baseDir = com.intellij.openapi.vfs.LocalFileSystem.getInstance().findFileByPath(basePath);
                }
            }
            
            if (baseDir == null || !baseDir.exists()) {
                Messages.showErrorDialog("Базовая директория проекта не найдена", "Point I18n");
                return;
            }
            
            // Пробуем найти файл по относительному пути
            com.intellij.openapi.vfs.VirtualFile file = baseDir.findFileByRelativePath(filePath);
            if (file == null) {
                // Пробуем абсолютный путь
                java.io.File fileObj = new java.io.File(baseDir.getPath(), filePath);
                if (fileObj.exists()) {
                    file = com.intellij.openapi.vfs.LocalFileSystem.getInstance().findFileByPath(fileObj.getAbsolutePath());
                }
            }
            
            if (file == null) {
                // Последняя попытка - ищем по имени файла рекурсивно
                String fileName = new java.io.File(filePath).getName();
                String pathHint = filePath.contains("/") ? filePath.substring(0, filePath.lastIndexOf("/")) : "";
                file = findFileRecursively(baseDir, fileName, pathHint);
            }
            
            if (file != null && file.exists()) {
                com.intellij.openapi.fileEditor.FileEditorManager.getInstance(project).openTextEditor(
                    new com.intellij.openapi.fileEditor.OpenFileDescriptor(project, file, line, 0),
                    true
                );
            } else {
                Messages.showErrorDialog("Файл не найден: " + filePath + "\nБазовая директория: " + baseDir.getPath(), "Point I18n");
            }
        } catch (Exception e) {
            e.printStackTrace();
            Messages.showErrorDialog("Ошибка открытия файла: " + e.getMessage(), "Point I18n");
        }
    }
}


