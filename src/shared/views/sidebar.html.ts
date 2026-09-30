export function getSidebarHtml(): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            padding: 16px;
            position: relative;
            min-height: 100vh;
        }
        
        .section {
            margin-bottom: 8px;
        }
        
        .section.collapsed {
            margin-bottom: 4px;
        }
        
        .section-title {
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            opacity: 0.7;
            margin-bottom: 12px;
        }
        
        .status {
            padding: 12px;
            background: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-textLink-foreground);
            border-radius: 4px;
            margin-bottom: 16px;
        }
        
        .status.fixed {
            position: fixed;
            bottom: 16px;
            left: 16px;
            right: 16px;
            margin-bottom: 0;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .status.error {
            border-left-color: var(--vscode-errorForeground);
        }
        
        .status.success {
            border-left-color: var(--vscode-testing-iconPassed);
        }
        
        input {
            width: 100%;
            padding: 8px;
            margin-bottom: 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            font-family: inherit;
            font-size: inherit;
        }
        
        input:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }
        
        .input-with-translate {
            display: flex;
            align-items: center;
            gap: 4px;
            margin-bottom: 8px;
        }
        
        .input-with-translate input {
            flex: 1;
            margin-bottom: 0;
        }
        
        .translate-btn {
            width: auto;
            min-width: 40px;
            padding: 8px 12px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-family: inherit;
            font-size: inherit;
            white-space: nowrap;
            flex-shrink: 0;
            margin-bottom: 0;
        }
        
        .translate-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        .translate-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            pointer-events: none;
        }
        
        button {
            width: 100%;
            padding: 8px 12px;
            margin-bottom: 8px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-family: inherit;
            font-size: inherit;
            font-weight: 500;
        }
        
        button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        button:disabled,
        button[disabled] {
            opacity: 0.5;
            cursor: not-allowed;
            pointer-events: none;
        }
        
        button.secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        button.secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        .setting {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .setting:last-child {
            border-bottom: none;
        }
        
        .setting-label {
            font-size: 13px;
        }
        
        select {
            padding: 4px 8px;
            background: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
            border: 1px solid var(--vscode-dropdown-border);
            border-radius: 2px;
            cursor: pointer;
        }
        
        .hidden {
            display: none;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 16px;
        }
        
        .stat {
            text-align: center;
            padding: 8px;
            background: var(--vscode-textBlockQuote-background);
            border-radius: 4px;
        }
        
        .stat-value {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 4px;
        }
        
        .stat-label {
            font-size: 11px;
            opacity: 0.7;
        }
        
        #searchResultsTable {
            margin-top: 8px;
            max-height: 300px;
            overflow-y: auto;
        }
        
        .search-result-item {
            padding: 8px;
            margin-bottom: 8px;
            background: var(--vscode-textBlockQuote-background);
            border-radius: 4px;
            border-left: 3px solid var(--vscode-textLink-foreground);
        }
        
        .search-result-key {
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            color: var(--vscode-textLink-foreground);
            margin-bottom: 6px;
            font-weight: 600;
        }
        
        .search-result-translations {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 4px;
            font-size: 11px;
        }
        
        .search-result-translation {
            padding: 4px;
            background: var(--vscode-editor-background);
            border-radius: 2px;
        }
        
        .search-result-translation-label {
            font-weight: 600;
            opacity: 0.7;
            margin-bottom: 2px;
        }
        
        .search-result-key-wrapper {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 6px;
        }
        
        .edit-btn {
            padding: 2px 6px;
            font-size: 11px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 2px;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.2s;
            width: auto;
            margin: 0;
            margin-left: 8px;
        }
        
        .search-result-item:hover .edit-btn {
            opacity: 1;
        }
        
        .edit-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            padding: 16px;
            box-sizing: border-box;
        }
        
        .modal.hidden {
            display: none;
        }
        
        .modal-content {
            background: var(--vscode-editor-background);
            padding: 16px;
            border-radius: 4px;
            width: 100%;
            max-width: 500px;
            max-height: calc(100vh - 32px);
            overflow-y: auto;
            box-sizing: border-box;
        }
        
        @media (max-width: 600px) {
            .modal {
                padding: 8px;
            }
            
            .modal-content {
                padding: 12px;
                max-height: calc(100vh - 16px);
            }
        }
        
        .modal-header {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 16px;
        }
        
        .modal-footer {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            margin-top: 16px;
        }
        
        .section-title {
            cursor: pointer;
            user-select: none;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            margin: 0 -16px 8px -16px;
            background: var(--vscode-list-inactiveSelectionBackground);
            transition: background 0.2s;
        }
        
        .section-title:hover {
            background: var(--vscode-list-hoverBackground);
        }
        
        .section-title::after {
            content: '▼';
            font-size: 10px;
            transition: transform 0.2s;
            display: inline-block;
            opacity: 0.7;
            margin-left: auto;
        }
        
        .section.collapsed .section-title::after {
            transform: rotate(-90deg);
        }
        
        .section.collapsed .section-content {
            display: none;
        }
        
        .section-content {
            margin-top: 8px;
        }
        
        .translated-search-result-item {
            padding: 8px;
            margin-bottom: 8px;
            background: var(--vscode-textBlockQuote-background);
            border-radius: 4px;
            border-left: 3px solid var(--vscode-textLink-foreground);
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .translated-search-result-item:hover {
            background: var(--vscode-list-hoverBackground);
        }
        
        .translated-search-result-file {
            font-size: 12px;
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
            margin-bottom: 4px;
        }
        
        .translated-search-result-line {
            font-size: 11px;
            opacity: 0.7;
            margin-bottom: 6px;
        }
        
        .translated-search-result-key {
            font-family: var(--vscode-editor-font-family);
            font-size: 11px;
            color: var(--vscode-textLink-foreground);
            margin-bottom: 4px;
        }
        
        .translated-search-result-translation {
            font-size: 12px;
            margin-bottom: 4px;
        }
        
        .translated-search-result-preview {
            font-family: var(--vscode-editor-font-family);
            font-size: 11px;
            opacity: 0.6;
            margin-top: 4px;
            padding: 4px;
            background: var(--vscode-editor-background);
            border-radius: 2px;
        }
    </style>
</head>
<body>
    <!-- Статус авторизации -->
    <div id="authStatus" class="status hidden"></div>
    
    <!-- Форма авторизации -->
    <div id="loginSection" class="section">
        <div class="section-title">🔐 Авторизация</div>
        <div class="section-content">
            <input id="username" type="text" placeholder="Username" />
            <input id="password" type="password" placeholder="Password" />
            <button id="loginBtn">Войти</button>
        </div>
    </div>
    
    <!-- Управление (показывается после авторизации) -->
    <div id="controlsSection" class="section hidden">
        <div class="section-title">⚙️ Управление</div>
        <div class="section-content">
            <div id="projectName" style="font-size: 13px; font-weight: 600; margin-bottom: 12px; padding: 8px; background: var(--vscode-textBlockQuote-background); border-radius: 4px; text-align: center;">
                📁 Проект: <span id="projectNameText">—</span>
            </div>
            <div class="stats">
                <div class="stat">
                    <div class="stat-value" id="statRu">—</div>
                    <div class="stat-label">🇷🇺 RU</div>
                </div>
                <div class="stat">
                    <div class="stat-value" id="statEn">—</div>
                    <div class="stat-label">🇬🇧 EN</div>
                </div>
                <div class="stat">
                    <div class="stat-value" id="statUz">—</div>
                    <div class="stat-label">🇺🇿 UZ</div>
                </div>
                <div class="stat">
                    <div class="stat-value" id="statCn">—</div>
                    <div class="stat-label">🇨🇳 CN</div>
                </div>
            </div>
            
            <button id="refreshBtn">🔄 Обновить переводы</button>
            <button id="toggleDecorationsBtn" class="secondary">👁️ Переключить отображение</button>
            <button id="logoutBtn" class="secondary">🚪 Выйти</button>
        </div>
    </div>
    
    <!-- Настройки -->
    <div id="settingsSection" class="section hidden collapsed">
        <div class="section-title">🎨 Настройки</div>
        <div class="section-content">
            <div class="setting">
                <span class="setting-label">Основной язык</span>
                <select id="localeSelect">
                    <option value="ru">🇷🇺 RU</option>
                    <option value="en">🇬🇧 EN</option>
                    <option value="uz">🇺🇿 UZ</option>
                    <option value="cn">🇨🇳 CN</option>
                </select>
            </div>
            <div class="setting">
                <span class="setting-label">Проект</span>
                <select id="projectSelect">
                    <option value="">Загрузка...</option>
                </select>
            </div>
        </div>
    </div>
    
    <!-- Поиск ключей -->
    <div id="searchSection" class="section collapsed">
        <div class="section-title">🔍 Поиск ключей</div>
        <div class="section-content">
            <input id="searchInput" type="text" placeholder="Введите ключ для поиска..." />
            <div id="searchResults" class="hidden">
                <div style="margin-top: 12px; font-size: 13px; font-weight: 600; text-transform: uppercase; opacity: 0.7; margin-bottom: 8px;">Найдено:</div>
                <div id="searchResultsTable"></div>
                <div id="searchPagination" style="display: none; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--vscode-input-border);">
                    <div id="pageInfo" style="font-size: 12px; opacity: 0.7; text-align: center; margin-bottom: 8px;">1 / 1</div>
                    <div style="display: flex; justify-content: space-between; gap: 8px;">
                        <button id="prevPageBtn" class="secondary" style="width: auto; flex: 1;">◀ Назад</button>
                        <button id="nextPageBtn" class="secondary" style="width: auto; flex: 1;">Вперед ▶</button>
                    </div>
                </div>
            </div>
            <div id="searchEmpty" class="hidden">
                <div class="status error">
                    ❌ Ключи не найдены в локальном кеше
                </div>
                <button id="refreshSearchBtn" class="secondary">🔄 Обновить ключи</button>
            </div>
        </div>
    </div>
    
    <!-- Поиск по переведенному тексту -->
    <div id="translatedSearchSection" class="section hidden collapsed">
        <div class="section-title">📁 Поиск в проекте</div>
        <div class="section-content">
            <label style="display: block; margin-bottom: 4px; font-size: 12px; opacity: 0.7;">Путь поиска:</label>
            <input id="translatedSearchPath" type="text" placeholder="src" value="src" style="margin-bottom: 12px;" />
            <input id="translatedSearchInput" type="text" placeholder="Введите текст для поиска в переводах..." />
            <div id="translatedSearchStatus" style="margin-top: 8px; font-size: 12px; opacity: 0.7; display: none;"></div>
            <div id="translatedSearchResults" class="hidden" style="margin-top: 12px; max-height: 400px; overflow-y: auto;">
                <div style="font-size: 13px; font-weight: 600; text-transform: uppercase; opacity: 0.7; margin-bottom: 8px;">Найдено:</div>
                <div id="translatedSearchResultsList"></div>
            </div>
            <div id="translatedSearchEmpty" class="hidden">
                <div class="status" style="margin-top: 12px;">
                    🔍 Введите текст для поиска
                </div>
            </div>
        </div>
    </div>
    
    <!-- Модалка редактирования -->
    <div id="editModal" class="modal hidden">
        <div class="modal-content">
            <div class="modal-header">✏️ Редактировать ключ</div>
            <div>
                <label style="display: block; margin-bottom: 4px; font-size: 12px; opacity: 0.7;">Ключ:</label>
                <input id="editKey" type="text" readonly style="background: var(--vscode-input-background); opacity: 0.7;" />
                <label style="display: block; margin-top: 12px; margin-bottom: 4px; font-size: 12px; opacity: 0.7;">🇷🇺 Русский:</label>
                <div class="input-with-translate">
                    <input id="editKeyRu" type="text" />
                    <button id="translateEditBtn" class="translate-btn" title="Перевести с русского на английский, узбекский и китайский">🌐</button>
                </div>
                <label style="display: block; margin-top: 12px; margin-bottom: 4px; font-size: 12px; opacity: 0.7;">🇬🇧 English:</label>
                <input id="editKeyEn" type="text" />
                <label style="display: block; margin-top: 12px; margin-bottom: 4px; font-size: 12px; opacity: 0.7;">🇺🇿 O'zbekcha:</label>
                <input id="editKeyUz" type="text" />
                <label style="display: block; margin-top: 12px; margin-bottom: 4px; font-size: 12px; opacity: 0.7;">🇨🇳 中文:</label>
                <input id="editKeyCn" type="text" />
            </div>
            <div class="modal-footer">
                <button id="cancelEditBtn" class="secondary">Отмена</button>
                <button id="saveEditBtn">💾 Сохранить</button>
            </div>
        </div>
    </div>
    
    <!-- Создание ключа -->
    <div id="createKeySection" class="section hidden collapsed">
        <div class="section-title">➕ Добавить ключ</div>
        <div class="section-content">
            <input id="newKey" type="text" placeholder="Ключ (например: user-name)" />
            <div class="input-with-translate">
                <input id="newKeyRu" type="text" placeholder="🇷🇺 Русский перевод" />
                <button id="translateCreateBtn" class="translate-btn" title="Перевести с русского на английский, узбекский и китайский">🌐</button>
            </div>
            <input id="newKeyEn" type="text" placeholder="🇬🇧 English translation" />
            <input id="newKeyUz" type="text" placeholder="🇺🇿 O'zbekcha tarjima" />
            <input id="newKeyCn" type="text" placeholder="🇨🇳 中文" />
            <button id="createKeyBtn">✨ Создать ключ</button>
            <div id="createKeyStatus" class="status hidden"></div>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        // Элементы
        const authStatus = document.getElementById('authStatus');
        const loginSection = document.getElementById('loginSection');
        const controlsSection = document.getElementById('controlsSection');
        const username = document.getElementById('username');
        const password = document.getElementById('password');
        const loginBtn = document.getElementById('loginBtn');
        const refreshBtn = document.getElementById('refreshBtn');
        const toggleDecorationsBtn = document.getElementById('toggleDecorationsBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const settingsSection = document.getElementById('settingsSection');
        const localeSelect = document.getElementById('localeSelect');
        const projectSelect = document.getElementById('projectSelect');
        const projectNameText = document.getElementById('projectNameText');
        const statRu = document.getElementById('statRu');
        const statEn = document.getElementById('statEn');
        const statUz = document.getElementById('statUz');
        const statCn = document.getElementById('statCn');
        const createKeySection = document.getElementById('createKeySection');
        const newKey = document.getElementById('newKey');
        const newKeyRu = document.getElementById('newKeyRu');
        const newKeyEn = document.getElementById('newKeyEn');
        const newKeyUz = document.getElementById('newKeyUz');
        const newKeyCn = document.getElementById('newKeyCn');
        const createKeyBtn = document.getElementById('createKeyBtn');
        const createKeyStatus = document.getElementById('createKeyStatus');
        const translateCreateBtn = document.getElementById('translateCreateBtn');
        const searchSection = document.getElementById('searchSection');
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        const searchResultsTable = document.getElementById('searchResultsTable');
        const searchEmpty = document.getElementById('searchEmpty');
        const refreshSearchBtn = document.getElementById('refreshSearchBtn');
        const searchPagination = document.getElementById('searchPagination');
        const prevPageBtn = document.getElementById('prevPageBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');
        const pageInfo = document.getElementById('pageInfo');
        const translatedSearchSection = document.getElementById('translatedSearchSection');
        const translatedSearchInput = document.getElementById('translatedSearchInput');
        const translatedSearchPath = document.getElementById('translatedSearchPath');
        const translatedSearchResults = document.getElementById('translatedSearchResults');
        const translatedSearchResultsList = document.getElementById('translatedSearchResultsList');
        const translatedSearchEmpty = document.getElementById('translatedSearchEmpty');
        const translatedSearchStatus = document.getElementById('translatedSearchStatus');
        
        // Состояние пагинации
        let currentSearchQuery = '';
        let currentPage = 1;
        let totalPages = 0;
        let currentProjectKey = '';
        const editModal = document.getElementById('editModal');
        const editKey = document.getElementById('editKey');
        const editKeyRu = document.getElementById('editKeyRu');
        const editKeyEn = document.getElementById('editKeyEn');
        const editKeyUz = document.getElementById('editKeyUz');
        const editKeyCn = document.getElementById('editKeyCn');
        const cancelEditBtn = document.getElementById('cancelEditBtn');
        const saveEditBtn = document.getElementById('saveEditBtn');
        const translateEditBtn = document.getElementById('translateEditBtn');
        
        // Обработчики
        loginBtn.onclick = () => {
            vscode.postMessage({
                command: 'login',
                username: username.value,
                password: password.value
            });
        };
        
        refreshBtn.onclick = () => {
            vscode.postMessage({ command: 'refresh' });
        };
        
        toggleDecorationsBtn.onclick = () => {
            vscode.postMessage({ command: 'toggleDecorations' });
        };
        
        logoutBtn.onclick = () => {
            vscode.postMessage({ command: 'logout' });
        };
        
        localeSelect.onchange = (e) => {
            vscode.postMessage({
                command: 'changeLocale',
                locale: e.target.value
            });
        };
        
        projectSelect.onchange = (e) => {
            const projectKey = e.target.value;
            if (projectKey) {
                currentProjectKey = projectKey;
                vscode.postMessage({
                    command: 'changeProject',
                    projectKey: projectKey
                });
            }
        };
        
        createKeyBtn.onclick = () => {
            vscode.postMessage({
                command: 'createKey',
                key: newKey.value,
                translations: {
                    ru: newKeyRu.value,
                    en: newKeyEn.value,
                    uz: newKeyUz.value,
                    cn: newKeyCn.value
                }
            });
        };
        
        translateCreateBtn.onclick = async () => {
            const ruText = newKeyRu.value.trim();
            if (!ruText) {
                showCreateKeyMessage('❌ Введите текст на русском языке', 'error');
                return;
            }
            
            translateCreateBtn.disabled = true;
            translateCreateBtn.textContent = '⏳';
            
            vscode.postMessage({
                command: 'translate',
                text: ruText
            });
        };
        
        translateEditBtn.onclick = async () => {
            const ruText = editKeyRu.value.trim();
            if (!ruText) {
                return;
            }
            
            translateEditBtn.disabled = true;
            translateEditBtn.textContent = '⏳';
            
            vscode.postMessage({
                command: 'translate',
                text: ruText
            });
        };
        
        // Поиск с debounce
        let searchTimeout;
        searchInput.oninput = () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentSearchQuery = searchInput.value;
                currentPage = 1;
                vscode.postMessage({
                    command: 'searchKeys',
                    query: currentSearchQuery,
                    pageNumber: 1
                });
            }, 300);
        };
        
        prevPageBtn.onclick = () => {
            if (prevPageBtn.hasAttribute('disabled')) return;
            if (currentPage > 1) {
                currentPage--;
                vscode.postMessage({
                    command: 'searchKeys',
                    query: currentSearchQuery,
                    pageNumber: currentPage
                });
            }
        };
        
        nextPageBtn.onclick = () => {
            if (nextPageBtn.hasAttribute('disabled')) return;
            if (currentPage < totalPages) {
                currentPage++;
                vscode.postMessage({
                    command: 'searchKeys',
                    query: currentSearchQuery,
                    pageNumber: currentPage
                });
            }
        };
        
        refreshSearchBtn.onclick = () => {
            vscode.postMessage({ command: 'refresh' });
        };
        
        // Поиск по переведенному тексту с debounce
        let translatedSearchTimeout;
        const performTranslatedSearch = () => {
            clearTimeout(translatedSearchTimeout);
            const query = translatedSearchInput.value.trim();
            const searchPath = translatedSearchPath.value.trim() || 'src';
            
            if (!query) {
                translatedSearchResults.classList.add('hidden');
                translatedSearchEmpty.classList.remove('hidden');
                translatedSearchStatus.style.display = 'none';
                return;
            }
            
            translatedSearchStatus.style.display = 'block';
            translatedSearchStatus.textContent = '⏳ Поиск...';
            translatedSearchResults.classList.add('hidden');
            translatedSearchEmpty.classList.add('hidden');
            
            translatedSearchTimeout = setTimeout(() => {
                vscode.postMessage({
                    command: 'searchTranslatedText',
                    query: query,
                    searchPath: searchPath
                });
            }, 500);
        };
        
        // Сохраняем путь поиска при изменении и запускаем поиск если есть запрос
        translatedSearchPath.onchange = () => {
            const searchPath = translatedSearchPath.value.trim() || 'src';
            // Сохраняем путь
            vscode.postMessage({
                command: 'searchTranslatedText',
                query: translatedSearchInput.value.trim(),
                searchPath: searchPath
            });
        };
        
        translatedSearchInput.oninput = performTranslatedSearch;
        
        cancelEditBtn.onclick = () => {
            editModal.classList.add('hidden');
        };
        
        saveEditBtn.onclick = () => {
            vscode.postMessage({
                command: 'updateKey',
                key: editKey.value,
                translations: {
                    ru: editKeyRu.value,
                    en: editKeyEn.value,
                    uz: editKeyUz.value,
                    cn: editKeyCn.value
                }
            });
        };
        
        // Закрытие модалки по клику на фон
        editModal.onclick = (e) => {
            if (e.target === editModal) {
                editModal.classList.add('hidden');
            }
        };
        
        // Закрытие по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !editModal.classList.contains('hidden')) {
                editModal.classList.add('hidden');
            }
        });
        
        // Enter для логина
        password.onkeypress = (e) => {
            if (e.key === 'Enter') loginBtn.click();
        };
        
        // Сообщения от расширения
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'updateAuth':
                    updateAuthStatus(message.isAuthenticated);
                    break;
                case 'updateStats':
                    updateStats(message.stats);
                    break;
                case 'updateLocale':
                    localeSelect.value = message.locale;
                    break;
                case 'updateProject':
                    currentProjectKey = message.projectKey || '';
                    updateProjectName(message.projectKey, message.projectName);
                    // Устанавливаем значение, если список уже загружен
                    if (currentProjectKey && projectSelect.options.length > 0) {
                        projectSelect.value = currentProjectKey;
                    }
                    break;
                case 'projectsResponse':
                    updateProjectsList(message.projects || [], message.error);
                    // После обновления списка восстанавливаем выбранный проект
                    if (currentProjectKey && projectSelect.options.length > 0) {
                        projectSelect.value = currentProjectKey;
                    }
                    break;
                case 'searchResults':
                    showSearchResults(
                        message.results || [],
                        message.totalCount || 0,
                        message.totalPages || 0,
                        message.currentPage || 1,
                        message.query || ''
                    );
                    break;
                case 'closeEditModal':
                    editModal.classList.add('hidden');
                    break;
                case 'refreshSearch':
                    // Перезапускаем поиск с текущим запросом
                    if (currentSearchQuery && currentSearchQuery.trim()) {
                        vscode.postMessage({
                            command: 'searchKeys',
                            query: currentSearchQuery,
                            pageNumber: currentPage
                        });
                    } else if (searchInput.value && searchInput.value.trim()) {
                        currentSearchQuery = searchInput.value;
                        currentPage = 1;
                        vscode.postMessage({
                            command: 'searchKeys',
                            query: currentSearchQuery,
                            pageNumber: 1
                        });
                    }
                    break;
                case 'addKeyToResults':
                    addKeyToResults(message.key, message.translations);
                    break;
                case 'translatedSearchResults':
                    showTranslatedSearchResults(message.results || []);
                    break;
                case 'updateSearchPath':
                    if (message.searchPath) {
                        translatedSearchPath.value = message.searchPath;
                    }
                    break;
                case 'translateResult':
                    handleTranslateResult(message);
                    break;
            }
        });
        
        function handleTranslateResult(message) {
            // Восстанавливаем кнопки перевода
            if (translateCreateBtn) {
                translateCreateBtn.disabled = false;
                translateCreateBtn.textContent = '🌐';
            }
            if (translateEditBtn) {
                translateEditBtn.disabled = false;
                translateEditBtn.textContent = '🌐';
            }
            
            if (message.error) {
                const errorMsg = message.error;
                if (editModal && !editModal.classList.contains('hidden')) {
                    // Если открыта модалка редактирования, показываем ошибку там
                    vscode.postMessage({
                        command: 'showError',
                        message: errorMsg
                    });
                } else {
                    showCreateKeyMessage('❌ ' + errorMsg, 'error');
                }
                return;
            }
            
            if (message.translations) {
                const { en, uz, cn } = message.translations;
                
                // Определяем, где применять перевод
                if (editModal && !editModal.classList.contains('hidden')) {
                    // Модалка редактирования открыта
                    editKeyEn.value = en;
                    editKeyUz.value = uz;
                    editKeyCn.value = cn || '';
                } else {
                    // Форма создания ключа
                    newKeyEn.value = en;
                    newKeyUz.value = uz;
                    newKeyCn.value = cn || '';
                }
            }
        }
        
        function showSearchResults(results, totalCount, totalPagesCount, currentPageNum, query) {
            // Обновляем состояние пагинации
            currentPage = currentPageNum || 1;
            totalPages = totalPagesCount || 1;
            if (query !== undefined) {
                currentSearchQuery = query;
            }
            
            if (results.length === 0) {
                searchResults.classList.add('hidden');
                searchEmpty.classList.remove('hidden');
                searchPagination.style.display = 'none';
                return;
            }
            
            searchResults.classList.remove('hidden');
            searchEmpty.classList.add('hidden');
            
            let html = '';
            const backtick = String.fromCharCode(96);
            for (const result of results) {
                const key = result.key;
                const ru = result.translations.ru || '';
                const en = result.translations.en || '';
                const uz = result.translations.uz || '';
                const cn = result.translations.cn || '';
                
                html += '<div class="search-result-item">';
                html += '<div class="search-result-key-wrapper">';
                html += '<div class="search-result-key">' + escapeHtml(backtick + key + backtick) + '</div>';
                html += '<button class="edit-btn" data-key="' + escapeHtml(key) + '" data-ru="' + escapeHtml(ru) + '" data-en="' + escapeHtml(en) + '" data-uz="' + escapeHtml(uz) + '" data-cn="' + escapeHtml(cn) + '">✏️</button>';
                html += '</div>';
                html += '<div class="search-result-translations">';
                html += '<div class="search-result-translation"><div class="search-result-translation-label">🇷🇺 RU</div>' + escapeHtml(ru || '') + '</div>';
                html += '<div class="search-result-translation"><div class="search-result-translation-label">🇬🇧 EN</div>' + escapeHtml(en || '') + '</div>';
                html += '<div class="search-result-translation"><div class="search-result-translation-label">🇺🇿 UZ</div>' + escapeHtml(uz || '') + '</div>';
                html += '<div class="search-result-translation"><div class="search-result-translation-label">🇨🇳 CN</div>' + escapeHtml(cn || '') + '</div>';
                html += '</div></div>';
            }
            
            searchResultsTable.innerHTML = html;
            
            // Обновляем пагинацию
            if (totalPages > 1) {
                searchPagination.style.display = 'block';
                const start = (currentPage - 1) * 10 + 1;
                const end = Math.min(currentPage * 10, totalCount);
                pageInfo.textContent = start + '-' + end + ' из ' + totalCount + ' (' + currentPage + '/' + totalPages + ')';
                
                if (currentPage <= 1) {
                    prevPageBtn.style.opacity = '0.5';
                    prevPageBtn.style.cursor = 'not-allowed';
                    prevPageBtn.setAttribute('disabled', 'true');
                } else {
                    prevPageBtn.style.opacity = '1';
                    prevPageBtn.style.cursor = 'pointer';
                    prevPageBtn.removeAttribute('disabled');
                }
                
                if (currentPage >= totalPages) {
                    nextPageBtn.style.opacity = '0.5';
                    nextPageBtn.style.cursor = 'not-allowed';
                    nextPageBtn.setAttribute('disabled', 'true');
                } else {
                    nextPageBtn.style.opacity = '1';
                    nextPageBtn.style.cursor = 'pointer';
                    nextPageBtn.removeAttribute('disabled');
                }
            } else {
                searchPagination.style.display = 'none';
            }
            
            // Добавляем обработчики для кнопок редактирования
            searchResultsTable.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const key = this.getAttribute('data-key');
                    const ru = this.getAttribute('data-ru');
                    const en = this.getAttribute('data-en');
                    const uz = this.getAttribute('data-uz');
                    const cn = this.getAttribute('data-cn');
                    openEditModal(key, ru, en, uz, cn);
                });
            });
        }
        
        function addKeyToResults(key, translations) {
            // Если секция результатов скрыта, показываем её
            if (searchResults.classList.contains('hidden')) {
                searchResults.classList.remove('hidden');
                searchEmpty.classList.add('hidden');
            }
            
            const backtick = String.fromCharCode(96);
            const ru = translations.ru || '';
            const en = translations.en || '';
            const uz = translations.uz || '';
            const cn = translations.cn || '';
            
            const itemHtml = '<div class="search-result-item">' +
                '<div class="search-result-key-wrapper">' +
                '<div class="search-result-key">' + escapeHtml(backtick + key + backtick) + '</div>' +
                '<button class="edit-btn" data-key="' + escapeHtml(key) + '" data-ru="' + escapeHtml(ru) + '" data-en="' + escapeHtml(en) + '" data-uz="' + escapeHtml(uz) + '" data-cn="' + escapeHtml(cn) + '">✏️</button>' +
                '</div>' +
                '<div class="search-result-translations">' +
                '<div class="search-result-translation"><div class="search-result-translation-label">🇷🇺 RU</div>' + escapeHtml(ru || '') + '</div>' +
                '<div class="search-result-translation"><div class="search-result-translation-label">🇬🇧 EN</div>' + escapeHtml(en || '') + '</div>' +
                '<div class="search-result-translation"><div class="search-result-translation-label">🇺🇿 UZ</div>' + escapeHtml(uz || '') + '</div>' +
                '<div class="search-result-translation"><div class="search-result-translation-label">🇨🇳 CN</div>' + escapeHtml(cn || '') + '</div>' +
                '</div></div>';
            
            // Вставляем новый элемент в начало таблицы
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = itemHtml;
            const newItem = tempDiv.firstElementChild;
            
            // Проверяем, есть ли уже элементы в таблице
            if (searchResultsTable.children.length > 0) {
                searchResultsTable.insertBefore(newItem, searchResultsTable.firstChild);
            } else {
                searchResultsTable.appendChild(newItem);
            }
            
            // Добавляем обработчик для кнопки редактирования
            const editBtn = newItem.querySelector('.edit-btn');
            if (editBtn) {
                editBtn.addEventListener('click', function() {
                    const key = this.getAttribute('data-key');
                    const ru = this.getAttribute('data-ru');
                    const en = this.getAttribute('data-en');
                    const uz = this.getAttribute('data-uz');
                    const cn = this.getAttribute('data-cn');
                    openEditModal(key, ru, en, uz, cn);
                });
            }
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        function openEditModal(key, ru, en, uz, cn) {
            editKey.value = key;
            editKeyRu.value = ru;
            editKeyEn.value = en;
            editKeyUz.value = uz;
            editKeyCn.value = cn || '';
            editModal.classList.remove('hidden');
        }
        
        window.openEditModal = openEditModal;
        
        function updateAuthStatus(isAuthenticated) {
            if (isAuthenticated) {
                loginSection.classList.add('hidden');
                controlsSection.classList.remove('hidden');
                settingsSection.classList.remove('hidden');
                searchSection.classList.remove('hidden');
                translatedSearchSection.classList.remove('hidden');
                createKeySection.classList.remove('hidden');
                // Не показываем уведомление при обновлении статуса, только при реальной авторизации
            } else {
                loginSection.classList.remove('hidden');
                controlsSection.classList.add('hidden');
                settingsSection.classList.add('hidden');
                searchSection.classList.add('hidden');
                translatedSearchSection.classList.add('hidden');
                createKeySection.classList.add('hidden');
                authStatus.classList.add('hidden');
            }
        }
        
        function showTranslatedSearchResults(results) {
            translatedSearchStatus.style.display = 'none';
            
            if (results.length === 0) {
                translatedSearchResults.classList.add('hidden');
                translatedSearchEmpty.classList.remove('hidden');
                translatedSearchEmpty.querySelector('.status').textContent = '❌ Ничего не найдено';
                return;
            }
            
            translatedSearchResults.classList.remove('hidden');
            translatedSearchEmpty.classList.add('hidden');
            
            let html = '';
            for (const result of results) {
                html += '<div class="translated-search-result-item" data-file="' + escapeHtml(result.filePath) + '" data-line="' + result.line + '">';
                html += '<div class="translated-search-result-file">📄 ' + escapeHtml(result.filePath) + '</div>';
                html += '<div class="translated-search-result-line">Строка ' + (result.line + 1) + '</div>';
                html += '<div class="translated-search-result-key">🔑 ' + escapeHtml(result.key) + '</div>';
                html += '<div class="translated-search-result-translation">💬 ' + escapeHtml(result.translation) + '</div>';
                if (result.preview) {
                    html += '<div class="translated-search-result-preview">' + escapeHtml(result.preview) + '</div>';
                }
                html += '</div>';
            }
            
            translatedSearchResultsList.innerHTML = html;
            
            // Добавляем обработчики кликов
            translatedSearchResultsList.querySelectorAll('.translated-search-result-item').forEach(item => {
                item.addEventListener('click', function() {
                    const filePath = this.getAttribute('data-file');
                    const line = parseInt(this.getAttribute('data-line') || '0');
                    vscode.postMessage({
                        command: 'openFileAtLine',
                        filePath: filePath,
                        line: line
                    });
                });
            });
        }
        
        function showCreateKeyMessage(text, type = 'info') {
            createKeyStatus.textContent = text;
            createKeyStatus.className = 'status fixed ' + type;
            createKeyStatus.classList.remove('hidden');
            
            if (type === 'success') {
                setTimeout(() => {
                    createKeyStatus.classList.add('hidden');
                    // Очищаем форму
                    newKey.value = '';
                    newKeyRu.value = '';
                    newKeyEn.value = '';
                    newKeyUz.value = '';
                }, 3000);
            }
        }
        
        function updateStats(stats) {
            statRu.textContent = stats.ru || '—';
            statEn.textContent = stats.en || '—';
            statUz.textContent = stats.uz || '—';
            statCn.textContent = stats.cn || '—';
        }
        
        function showMessage(text, type = 'info') {
            authStatus.textContent = text;
            authStatus.className = 'status fixed ' + type;
            authStatus.classList.remove('hidden');
            
            if (type !== 'error') {
                setTimeout(() => {
                    authStatus.classList.add('hidden');
                }, 3000);
            }
        }
        
        // Сворачивание/разворачивание секций
        document.querySelectorAll('.section-title').forEach(title => {
            title.addEventListener('click', function() {
                const section = this.closest('.section');
                if (section) {
                    section.classList.toggle('collapsed');
                }
            });
        });
        
        function updateProjectsList(projects, error) {
            projectSelect.innerHTML = '';
            
            if (error) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Ошибка загрузки';
                projectSelect.appendChild(option);
                return;
            }
            
            if (projects.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Нет проектов';
                projectSelect.appendChild(option);
                return;
            }
            
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.key;
                option.textContent = project.name;
                projectSelect.appendChild(option);
            });
        }
        
        function updateProjectName(projectKey, projectName) {
            if (projectName) {
                projectNameText.textContent = projectName;
            } else if (projectKey) {
                // Если имя не пришло, используем ключ
                projectNameText.textContent = projectKey;
            } else {
                projectNameText.textContent = '—';
            }
        }
        
        // Секции будут показаны/скрыты в зависимости от статуса авторизации через updateAuthStatus
        
        // Запрашиваем начальное состояние
        vscode.postMessage({ command: 'init' });
        
        // Запрашиваем список проектов при инициализации
        vscode.postMessage({ command: 'fetchProjects' });
    </script>
</body>
</html>`;
}

