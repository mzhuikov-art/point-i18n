# План реализации полного функционала WebStorm плагина

## Текущий статус
- ✅ Базовый ApiService (authenticate)
- ✅ StorageService
- ✅ ConfigService  
- ✅ CacheService
- ✅ ToolWindow с базовым UI
- ✅ Логин функционал

## Что нужно реализовать

### 1. Расширение ApiService
- [ ] fetchLocales
- [ ] fetchProjects
- [ ] createKey
- [ ] updateKey
- [ ] searchKeys
- [ ] refreshToken
- [ ] getUserInfo

### 2. Провайдеры
- [ ] HoverProvider (показ переводов при наведении)
- [ ] LineMarkerProvider (inline декорации)

### 3. Actions
- [ ] FetchNowAction
- [ ] ToggleDecorationsAction
- [ ] ConfigApiBaseUrlAction
- [ ] ConfigLocalizationApiBaseUrlAction

### 4. Расширение Sidebar
- [ ] Полнофункциональный UI с поиском
- [ ] Создание/обновление ключей
- [ ] Поиск по переведенному тексту
- [ ] Смена локали/проекта

### 5. Интеграция
- [ ] Автоматическая проверка токена при старте
- [ ] Обновление декораций при изменении документа
- [ ] Регистрация всех компонентов в plugin.xml

## Приоритет
1. Расширение ApiService (критично для остального функционала)
2. HoverProvider и LineMarkerProvider (основной UX)
3. Actions (команды)
4. Расширение Sidebar (полный функционал)

