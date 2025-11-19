# IDE-Specific Implementations

Эта папка содержит реализации расширений для разных IDE.

## Структура

- `vscode/` - Реализация для Visual Studio Code
- `webstorm/` - Реализация для WebStorm (в разработке)

## VSCode

Точка входа: `vscode/extension.ts`

Реализует все интерфейсы из `../shared/types/` используя VSCode API.

## WebStorm

Точка входа: `webstorm/extension.ts`

Реализует все интерфейсы из `../shared/types/` используя IntelliJ Platform API (TODO).

