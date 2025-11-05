import * as vscode from 'vscode';

export interface I18nKeyInfo {
    key: string;
    range: vscode.Range;
}

export function getI18nKeyAtPosition(
    document: vscode.TextDocument,
    position: vscode.Position
): string | null {
    const info = getI18nKeyInfoAtPosition(document, position);
    return info?.key ?? null;
}

export function getI18nKeyInfoAtPosition(
    document: vscode.TextDocument,
    position: vscode.Position
): I18nKeyInfo | null {
    // Используем встроенный метод VSCode как в i18n Ally
    const patterns = [
        /\$t\s*\(\s*(['"`])([^'"`]+)\1/,
        /i18n\.t\s*\(\s*(['"`])([^'"`]+)\1/,
        /\bt\s*\(\s*(['"`])([^'"`]+)\1/,
    ];
    
    for (const regex of patterns) {
        const range = document.getWordRangeAtPosition(position, regex);
        if (range) {
            const text = document.getText(range);
            const match = text.match(regex);
            if (match && match[2]) {
                return { key: match[2], range };
            }
        }
    }
    
    return null;
}

