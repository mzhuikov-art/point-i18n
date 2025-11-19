#!/bin/bash

# Скрипт для запуска плагина WebStorm для отладки

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "🚀 Запуск плагина WebStorm для отладки..."
echo "📁 Проект: $PROJECT_ROOT"
echo ""

# Переходим в директорию плагина
cd "$SCRIPT_DIR"

# Собираем TypeScript код
echo "📦 Сборка TypeScript кода..."
cd "$PROJECT_ROOT"
pnpm run build:webstorm

# Возвращаемся в директорию плагина
cd "$SCRIPT_DIR"

# Проверяем наличие Gradle wrapper
if [ ! -f "gradlew" ]; then
    echo "⚠️  Gradle wrapper не найден. Инициализируем..."
    gradle wrapper --gradle-version 8.5
fi

# Запускаем плагин
echo "🎯 Запуск плагина..."
if [ "$1" == "--debug" ]; then
    echo "🐛 Режим отладки включен"
    ./gradlew runIde --debug-jvm
else
    ./gradlew runIde
fi

