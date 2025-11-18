#!/bin/bash

# Скрипт для запуска WebStorm с плагином

set -e

echo "🚀 Запуск WebStorm с плагином Point I18n..."
echo ""

# Настройка Java (проверяем и настраиваем)
if [ -z "$JAVA_HOME" ] || ! command -v java &> /dev/null; then
    export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
    export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
fi

echo "✅ Java настроена"
echo ""

# Переход в корень проекта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Сборка TypeScript
echo "📦 Сборка TypeScript кода..."
cd "$PROJECT_ROOT"
pnpm run build:webstorm
echo "✅ TypeScript код собран"
echo ""

# Запуск плагина
echo "🎯 Запуск плагина..."
cd "$SCRIPT_DIR"
./gradlew runIde

echo ""
echo "✅ Готово! WebStorm должен открыться через несколько секунд."

