# Быстрый старт для отладки

## Вариант 1: Через скрипт (самый простой)

```bash
cd src/ide/webstorm
./run-plugin.sh          # Обычный запуск
./run-plugin.sh --debug  # С отладкой
```

## Вариант 2: Через IntelliJ IDEA

1. Откройте проект в IntelliJ IDEA
2. Дождитесь синхронизации Gradle
3. В панели Gradle найдите: `point-i18n > src/ide/webstorm > Tasks > intellij > runIde`
4. Запустите задачу `runIde` (двойной клик или правой кнопкой > Debug)

## Вариант 3: Через командную строку

```bash
# Из корневой папки проекта
pnpm run build:webstorm

# Из папки плагина
cd src/ide/webstorm

# Если нет Gradle wrapper, создайте его:
gradle wrapper

# Запуск
./gradlew runIde

# С отладкой
./gradlew runIde --debug-jvm
```

## Что произойдет

1. TypeScript код будет скомпилирован в `out/webstorm/`
2. Gradle соберет плагин
3. Запустится новая инстанция WebStorm с установленным плагином
4. Вы сможете тестировать плагин в этой инстанции

## Важно

⚠️ **Текущая реализация использует TypeScript**, который компилируется в JavaScript. 
Для полноценной работы плагина нужно создать Java/Kotlin bridge для интеграции с IntelliJ Platform API.

Подробнее см. `DEVELOPMENT.md`
