# WebStorm Plugin Implementation

Этот плагин реализован на TypeScript и использует IntelliJ Platform API через типы.

## Структура

- `services/` - Реализации интерфейсов для WebStorm (Storage, Config, Editor, Window)
- `providers/` - Провайдеры для hover и line markers
- `actions/` - Actions для команд плагина
- `toolwindow/` - ToolWindow для sidebar
- `extension.ts` - Точка входа плагина
- `resources/META-INF/plugin.xml` - Манифест плагина
- `build.gradle.kts` - Конфигурация сборки Gradle

## Особенности реализации

### TypeScript + IntelliJ Platform

Плагин написан на TypeScript, но использует IntelliJ Platform API через:
- `@ts-ignore` для доступа к Java API
- Типы для IntelliJ Platform классов
- Компиляция TypeScript в JavaScript для использования в плагине

### Хранение данных

- **Storage**: Использует `PropertiesComponent` для хранения токенов и настроек
- **Config**: Использует `PropertiesComponent` с namespace `point.i18n`

### Провайдеры

- **HoverProvider**: Отображает переводы при наведении на ключи локализации
- **LineMarkerProvider**: Показывает inline переводы рядом с ключами

### Actions

Все actions регистрируются через `plugin.xml` и вызывают TypeScript код через bridge.

## Сборка

Для сборки плагина WebStorm используется Gradle:

```bash
cd src/ide/webstorm
./gradlew buildPlugin
```

Или через IntelliJ IDEA:
1. Откройте проект в IntelliJ IDEA
2. Выберите `Build > Build Project`
3. Плагин будет собран в `build/distributions/`

## Установка

1. Соберите плагин
2. В WebStorm: `Settings > Plugins > ⚙️ > Install Plugin from Disk...`
3. Выберите `.zip` файл из `build/distributions/`

## Разработка

Для разработки используйте IntelliJ IDEA с плагином "IntelliJ Platform Plugin Development".

Запуск в режиме отладки:
1. `Run > Edit Configurations...`
2. Добавьте конфигурацию "Plugin"
3. Выберите WebStorm как IDE для запуска
4. Запустите конфигурацию

## Примечания

- TypeScript код компилируется в JavaScript перед упаковкой в плагин
- Для работы с IntelliJ Platform API используется bridge через `@ts-ignore`
- В продакшене рекомендуется переписать критические части на Kotlin для лучшей производительности

