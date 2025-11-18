# Разработка и отладка плагина WebStorm

## Предварительные требования

1. **IntelliJ IDEA** (Community или Ultimate) с установленным плагином "IntelliJ Platform Plugin Development"
2. **Node.js** и **pnpm** для сборки TypeScript кода
3. **JDK 17** или выше
4. **Gradle** (будет загружен автоматически через wrapper)

## Настройка проекта

### 1. Открыть проект в IntelliJ IDEA

```bash
# Откройте корневую папку проекта в IntelliJ IDEA
# File > Open > выберите папку point-i18n
```

### 2. Настроить Gradle проект

1. IntelliJ IDEA автоматически определит Gradle проект в `src/ide/webstorm/`
2. Дождитесь синхронизации Gradle (может занять несколько минут при первом запуске)
3. Убедитесь, что SDK установлен: `File > Project Structure > Project SDK` должен быть установлен на JDK 17

### 3. Собрать TypeScript код

```bash
# Из корневой папки проекта
pnpm install
pnpm run build:webstorm
```

TypeScript код будет скомпилирован в `out/webstorm/`

## Запуск плагина для отладки

### Способ 1: Через Gradle задачи (рекомендуется)

1. Откройте панель Gradle: `View > Tool Windows > Gradle`
2. Найдите проект `point-i18n > src/ide/webstorm > Tasks > intellij > runIde`
3. Дважды кликните на `runIde` или правой кнопкой > `Debug 'runIde'`

### Способ 2: Через Run Configuration

1. Откройте `Run > Edit Configurations...`
2. Нажмите `+` > `Gradle`
3. Настройте:
   - **Name**: `Run WebStorm Plugin`
   - **Gradle project**: выберите `point-i18n/src/ide/webstorm`
   - **Tasks**: `runIde`
   - **VM options**: (оставьте пустым для обычного запуска)
4. Для отладки:
   - **VM options**: `-Didea.debug.mode=true`
   - Включите `Debug` режим

### Способ 3: Через командную строку

```bash
cd src/ide/webstorm
./gradlew runIde
```

Для отладки:
```bash
./gradlew runIde --debug-jvm
```

## Отладка TypeScript кода

TypeScript код компилируется с source maps, но для отладки TypeScript напрямую в WebStorm нужно:

1. Установить Node.js плагин в IntelliJ IDEA
2. Настроить Remote Debug для Node.js процесса (если используется Node.js bridge)
3. Или использовать Chrome DevTools для отладки (если используется JCEF)

**Примечание**: Текущая реализация использует TypeScript, который компилируется в JavaScript. Для полноценной отладки рекомендуется создать Java/Kotlin bridge или переписать критические части на Kotlin.

## Структура сборки

```
out/webstorm/              # Скомпилированный TypeScript код
├── extension.js          # Точка входа
├── services/             # Сервисы
├── providers/            # Провайдеры
├── actions/              # Actions
└── toolwindow/           # ToolWindow

build/                    # Gradle build output
└── distributions/        # Готовый плагин (.zip)
```

## Полезные команды

```bash
# Сборка TypeScript
pnpm run build:webstorm

# Сборка TypeScript в watch режиме (в отдельном терминале)
pnpm run build:webstorm --watch

# Сборка плагина
cd src/ide/webstorm
./gradlew buildPlugin

# Очистка сборки
./gradlew clean

# Запуск плагина
./gradlew runIde

# Отладка плагина
./gradlew runIde --debug-jvm
```

## Решение проблем

### Плагин не запускается

1. Убедитесь, что TypeScript код скомпилирован: `pnpm run build:webstorm`
2. Проверьте, что все зависимости установлены: `pnpm install`
3. Проверьте логи в `Help > Show Log in Finder` (macOS) или `Help > Show Log in Explorer` (Windows)

### Ошибки компиляции TypeScript

1. Проверьте версию TypeScript: `pnpm list typescript`
2. Очистите кеш: `rm -rf out/webstorm node_modules/.cache`
3. Пересоберите: `pnpm run build:webstorm`

### Gradle не синхронизируется

1. Проверьте версию JDK: `java -version` (должна быть 17+)
2. Очистите Gradle кеш: `./gradlew clean --refresh-dependencies`
3. Перезапустите IntelliJ IDEA

### Плагин не видит TypeScript код

Убедитесь, что скомпилированные файлы находятся в `out/webstorm/` и включены в resources плагина через `build.gradle.kts`.

## Следующие шаги

Для полноценной работы плагина нужно:

1. **Создать Java/Kotlin bridge** для вызова TypeScript кода из IntelliJ Platform
2. **Реализовать провайдеры** на Java/Kotlin, которые будут вызывать TypeScript код
3. **Настроить загрузку** скомпилированного JavaScript кода в плагин
4. **Протестировать** все функции плагина

Текущая реализация предоставляет структуру и логику, готовую к интеграции с IntelliJ Platform.

