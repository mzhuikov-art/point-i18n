# Архитектура проекта

Проект реорганизован для поддержки нескольких IDE. Вся общая логика вынесена в `src/shared/`, а IDE-специфичные реализации находятся в `src/ide/`.

## Структура проекта

```
point-i18n/
├── src/
│   ├── shared/                # Общая логика для всех IDE
│   │   ├── services/          # Общие сервисы (ApiService, CacheService)
│   │   ├── utils/             # Утилиты (key-parser и др.)
│   │   ├── types/             # Интерфейсы для IDE-специфичных сервисов
│   │   ├── views/             # HTML шаблоны (login.html.ts, sidebar.html.ts)
│   │   └── constants.ts       # Константы
│   │
│   ├── ide/                   # IDE-специфичные реализации
│   │   ├── vscode/            # Реализация для Visual Studio Code
│   │   │   ├── services/      # Реализации интерфейсов для VSCode
│   │   │   ├── providers/     # Провайдеры для VSCode (Hover, Decoration, etc.)
│   │   │   ├── views/         # Адаптеры для shared views (используют shared/views)
│   │   │   └── extension.ts   # Точка входа для VSCode
│   │   │
│   │   └── webstorm/          # Реализация для WebStorm
│   │       ├── services/       # Реализации интерфейсов для WebStorm
│   │       ├── providers/      # Провайдеры для WebStorm (Hover, LineMarker)
│   │       ├── actions/        # Actions для команд плагина
│   │       ├── toolwindow/     # ToolWindow для sidebar
│   │       ├── resources/      # Ресурсы плагина (plugin.xml)
│   │       ├── extension.ts    # Точка входа для WebStorm
│   │       ├── build.gradle.kts # Конфигурация сборки Gradle
│   │       └── tsconfig.json   # Конфигурация TypeScript
│   │
│   └── [старые файлы]         # Старый код (можно удалить после миграции)
```

## Интерфейсы

Все IDE-специфичные функции абстрагированы через интерфейсы в `src/shared/types/`:

- `IStorageService` - хранение токенов и настроек
- `IConfigService` - работа с конфигурацией
- `IEditorService` - работа с редактором и файлами
- `IWindowService` - уведомления и диалоги

## Общие сервисы

- `ApiService` - работа с API (не зависит от IDE)
- `CacheService` - кеширование переводов (не зависит от IDE)

## Использование

### VSCode

Точка входа: `src/ide/vscode/extension.ts`

Сборка:
```bash
pnpm build:vscode
# или
pnpm build
```

### WebStorm

Точка входа: `src/ide/webstorm/extension.ts`

Сборка:
```bash
pnpm build:webstorm
```

## Добавление новой IDE

1. Создать папку `src/ide/{ide-name}/`
2. Реализовать интерфейсы из `src/shared/types/` в `src/ide/{ide-name}/services/`
3. Создать провайдеры и views в `src/ide/{ide-name}/`
4. Создать точку входа `src/ide/{ide-name}/extension.ts`
5. Использовать общие сервисы из `src/shared/services/`

## Миграция

Старый код в `src/` постепенно мигрируется в новую структуру. После завершения миграции папку `src/` можно будет удалить.

